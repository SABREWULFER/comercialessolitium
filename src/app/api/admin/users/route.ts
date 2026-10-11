import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase';

// Almacén seguro en memoria para contraseñas actualizadas desde el dashboard
declare global {
  var _userPasswordCache: Map<string, string> | undefined;
}
if (!global._userPasswordCache) {
  global._userPasswordCache = new Map<string, string>();
}

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

    // Validar UUID para group_id (o null)
    let validGroupId = group_id || null;
    if (validGroupId && (!validGroupId.includes('-') || validGroupId.length < 32)) {
      validGroupId = null;
    }

    // 1. Guardar la contraseña si se especificó para permitir login directo
    if (password && password.trim().length >= 6) {
      global._userPasswordCache?.set(cleanEmail, password.trim());
    }

    const targetUserId = (id && id.includes('-') && id.length >= 32) 
      ? id 
      : crypto.randomUUID();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        user: {
          id: targetUserId,
          full_name: cleanFullName,
          name: cleanFullName,
          email: cleanEmail,
          role,
          group_id: validGroupId,
          seller_code: cleanSellerCode,
          vendor_code: cleanSellerCode,
        },
        message: 'Usuario guardado con éxito.',
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Si hay service role key, intentar sincronizar también con auth.users de fondo (opcional y sin bloquear)
    if (hasServiceRoleKey()) {
      try {
        if (password && password.trim().length >= 6) {
          if (is_edit && id) {
            await supabaseAdmin.auth.admin.updateUserById(id, { password: password.trim() });
          } else {
            await supabaseAdmin.auth.admin.createUser({
              email: cleanEmail,
              password: password.trim(),
              email_confirm: true,
              user_metadata: { full_name: cleanFullName, role },
            });
          }
        }
      } catch (authErr) {
        console.warn('Sincronización opcional con auth:', authErr);
      }
    }

    // 3. PERSISTENCIA DIRECTA EN LA TABLA public.profiles
    const profilePayload = {
      id: targetUserId,
      full_name: cleanFullName,
      email: cleanEmail,
      role,
      group_id: validGroupId,
      seller_code: cleanSellerCode,
    };

    const { data: savedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('Error guardando en profiles:', profileError);
      return NextResponse.json(
        { error: `Error en profiles: ${profileError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: savedProfile || profilePayload,
      message: 'Usuario guardado con éxito',
    });

  } catch (error: any) {
    console.error('Error en /api/admin/users:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
