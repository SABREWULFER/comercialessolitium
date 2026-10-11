import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, email, role, group_id, seller_code, password, is_edit } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email y nombre completo son obligatorios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = full_name.trim();
    const cleanSellerCode = (seller_code || '').trim().toUpperCase();

    // Validar formato UUID para group_id (o null si está vacío)
    let validGroupId = group_id || null;
    if (validGroupId && (!validGroupId.includes('-') || validGroupId.length < 32)) {
      validGroupId = null;
    }

    if (!isSupabaseConfigured()) {
      // Modo local / demostración
      const fallbackId = id || crypto.randomUUID();
      return NextResponse.json({
        success: true,
        user: {
          id: fallbackId,
          full_name: cleanFullName,
          name: cleanFullName,
          email: cleanEmail,
          role,
          group_id: validGroupId,
          seller_code: cleanSellerCode,
          vendor_code: cleanSellerCode,
        },
        message: 'Usuario guardado en entorno local.',
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let authUserId = id;

    if (is_edit && id) {
      // 1. Edición de usuario existente
      // Si se especificó nueva contraseña, actualizarla en auth.users
      if (password && password.trim().length >= 6) {
        try {
          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            id,
            { password: password.trim() }
          );
          if (updateAuthError) {
            console.warn('Advertencia al actualizar password en auth.users:', updateAuthError.message);
          }
        } catch (authErr) {
          console.warn('Excepción actualizando password en auth:', authErr);
        }
      }

      // Actualizar metadatos y perfil en public.profiles
      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id,
          full_name: cleanFullName,
          email: cleanEmail,
          role,
          group_id: validGroupId,
          seller_code: cleanSellerCode,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        return NextResponse.json(
          { error: `Error en profiles: ${profileError.message} (${profileError.details || profileError.hint || ''})` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: updatedProfile,
        message: 'Usuario actualizado correctamente en Supabase.',
      });

    } else {
      // 2. Creación de nuevo usuario en auth.users
      const userPassword = password && password.trim().length >= 6 
        ? password.trim() 
        : '$0LITIUM2026';

      let createAuthResponse = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanFullName,
          role: role,
        },
      });

      if (createAuthResponse.error) {
        // Si el usuario ya existe en auth.users, intentar recuperar su ID para sincronizar profiles
        const authMsg = createAuthResponse.error.message.toLowerCase();
        if (authMsg.includes('already exists') || authMsg.includes('registered') || authMsg.includes('unique')) {
          // Buscar el usuario existente por email
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          
          if (existingAuthUser) {
            authUserId = existingAuthUser.id;
            // Si nos pasaron password, actualizársela
            if (password && password.trim().length >= 6) {
              await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: password.trim() });
            }
          } else {
            return NextResponse.json(
              { error: `Error en Auth: ${createAuthResponse.error.message}` },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `Error al crear en Supabase Auth: ${createAuthResponse.error.message}` },
            { status: 400 }
          );
        }
      } else if (createAuthResponse.data?.user) {
        authUserId = createAuthResponse.data.user.id;
      }

      // Guardar registro correspondiente en public.profiles con el id generado por auth.users
      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUserId,
          full_name: cleanFullName,
          email: cleanEmail,
          role,
          group_id: validGroupId,
          seller_code: cleanSellerCode,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (insertProfileError) {
        return NextResponse.json(
          { error: `Usuario creado en Auth pero falló profiles: ${insertProfileError.message}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: newProfile,
        message: 'Usuario creado exitosamente en Supabase Auth y Profiles.',
      });
    }
  } catch (error: any) {
    console.error('Error en /api/admin/users:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar el usuario.' },
      { status: 500 }
    );
  }
}
