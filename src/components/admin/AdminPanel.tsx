'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Save, 
  X,
  Search,
  BadgeCheck,
  UserX,
  Plus,
  RefreshCw,
  FolderTree
} from 'lucide-react';
import { CommercialUser, UserRole, CommercialGroup } from '@/types';
import { 
  getAllUsers, 
  saveUser, 
  deleteUser, 
  getCommercialGroups, 
  saveCommercialGroup, 
  initializeDefaultGroups,
  generateUUID 
} from '@/lib/storage';

export const AdminPanel: React.FC = () => {
  // Pestaña activa dentro del panel Admin: 'users' | 'groups'
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'users' | 'groups'>('users');

  // Estados de Usuarios
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [groups, setGroups] = useState<CommercialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<CommercialUser | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulario Usuario (coincidencia con profiles: id, full_name, email, role, group_id, seller_code)
  const [userFormData, setUserFormData] = useState<{
    id: string;
    full_name: string;
    email: string;
    seller_code: string;
    role: UserRole;
    group_id: string;
  }>({
    id: '',
    full_name: '',
    email: '',
    seller_code: '',
    role: 'comercial',
    group_id: '',
  });

  // Estados de Grupos
  const [editingGroup, setEditingGroup] = useState<CommercialGroup | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState<{
    id: string;
    name: string;
    director_commercial_id: string;
  }>({
    id: '',
    name: '',
    director_commercial_id: '',
  });
  const [isInitializingGroups, setIsInitializingGroups] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, g] = await Promise.all([
        getAllUsers(),
        getCommercialGroups(),
      ]);
      setUsers(u);
      setGroups(g);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================================
   * GESTIÓN DE USUARIOS
   * =====================================
   */
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      id: generateUUID(),
      full_name: '',
      email: '',
      seller_code: '',
      role: 'comercial',
      group_id: groups.length > 0 ? groups[0].id : '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: CommercialUser) => {
    setEditingUser(user);
    // Si el usuario no tiene un UUID válido, generar uno
    const validId = (user.id && user.id.includes('-') && user.id.length >= 32) ? user.id : generateUUID();
    setUserFormData({
      id: validId,
      full_name: user.full_name || user.name || '',
      email: user.email,
      seller_code: user.seller_code || user.vendor_code || '',
      role: user.role,
      group_id: user.group_id || (groups.length > 0 ? groups[0].id : ''),
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await saveUser(userFormData);
      if (result.success) {
        setNotification({
          type: 'success',
          message: editingUser ? 'Usuario actualizado con éxito en Supabase (profiles).' : 'Nuevo usuario registrado con éxito en Supabase (profiles).',
        });
        setIsUserModalOpen(false);
        await loadData();
      } else {
        // 3. Capturar el mensaje exacto de error de Supabase
        setNotification({ 
          type: 'error', 
          message: `Error al guardar en Supabase: ${result.error || 'Respuesta no válida del servidor'}` 
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `Excepción: ${err.message || 'Error no controlado'}` });
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${name}" del sistema?`)) {
      try {
        const result = await deleteUser(userId);
        if (result.success) {
          setNotification({ type: 'success', message: `Usuario ${name} eliminado correctamente.` });
          await loadData();
        } else {
          setNotification({ type: 'error', message: `Error al eliminar en Supabase: ${result.error}` });
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message });
      }
      setTimeout(() => setNotification(null), 4000);
    }
  };

  /**
   * =====================================
   * GESTIÓN DE ZONAS Y GRUPOS TERRITORIALES
   * =====================================
   */
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      id: generateUUID(),
      name: '',
      director_commercial_id: '',
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: CommercialGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      id: group.id,
      name: group.name,
      director_commercial_id: group.director_commercial_id || '',
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await saveCommercialGroup({
        id: groupFormData.id,
        name: groupFormData.name,
        director_commercial_id: groupFormData.director_commercial_id || null,
      });

      if (result.success) {
        setNotification({
          type: 'success',
          message: editingGroup ? 'Zona/Grupo territorial actualizado en Supabase (commercial_groups).' : 'Nueva Zona/Grupo guardada con éxito en Supabase.',
        });
        setIsGroupModalOpen(false);
        await loadData();
      } else {
        setNotification({
          type: 'error',
          message: `Error guardando en Supabase: ${result.error || 'No se pudo actualizar el grupo'}`,
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `Excepción: ${err.message}` });
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleInitializeDefaultGroups = async () => {
    setIsInitializingGroups(true);
    try {
      const result = await initializeDefaultGroups();
      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Los 4 grupos territoriales se han inicializado correctamente en Supabase (commercial_groups).',
        });
        await loadData();
      } else {
        setNotification({
          type: 'error',
          message: `Error inicializando grupos: ${result.error}`,
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsInitializingGroups(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.seller_code || u.vendor_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Alerta de notificación con mensajes exactos de Supabase */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-semibold animate-in fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">{notification.message}</div>
        </div>
      )}

      {/* Header Panel Administrador */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-rose-100 text-rose-700 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Control Maestro
            </span>
            <span className="text-xs text-slate-400 font-semibold">&bull; Rol: Administrador</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-solitium-accent" />
            Panel de Administración & Supabase
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión sincronizada de usuarios (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">profiles</code>) y zonas (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">commercial_groups</code>).
          </p>
        </div>

        {/* Botones de acción según la sub-pestaña */}
        <div className="flex items-center gap-2 shrink-0">
          {activeAdminSubTab === 'users' ? (
            <button
              onClick={handleOpenCreateUser}
              className="flex items-center gap-2 bg-solitium-500 hover:bg-solitium-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleInitializeDefaultGroups}
                disabled={isInitializingGroups}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors"
                title="Inicializar los 4 grupos predeterminados si la tabla está vacía"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isInitializingGroups ? 'animate-spin' : ''}`} />
                <span>Restaurar 4 Grupos Base</span>
              </button>
              <button
                onClick={handleOpenCreateGroup}
                className="flex items-center gap-2 bg-solitium-500 hover:bg-solitium-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Zona / Grupo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selector de Sub-Pestañas: Usuarios vs Zonas Territoriales */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl">
        <button
          onClick={() => setActiveAdminSubTab('users')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeAdminSubTab === 'users'
              ? 'border-solitium-500 text-solitium-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestión de Usuarios ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('groups')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeAdminSubTab === 'groups'
              ? 'border-solitium-500 text-solitium-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Zonas y Grupos Territoriales ({groups.length})</span>
        </button>
      </div>

      {/* SUB-PESTAÑA 1: GESTIÓN DE USUARIOS */}
      {activeAdminSubTab === 'users' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o código de vendedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-solitium-500 focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total: <strong className="text-slate-800">{filteredUsers.length}</strong> usuarios
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-500">
                <div className="w-8 h-8 border-3 border-solitium-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Cargando directorio de usuarios...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Usuario / Nombre</th>
                      <th className="p-4">Cód. Liquidación</th>
                      <th className="p-4">Rol en el Sistema</th>
                      <th className="p-4">Zona / Grupo Asignado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {filteredUsers.map(user => {
                      const groupObj = groups.find(g => g.id === user.group_id);
                      const displayName = user.full_name || user.name || 'Sin Nombre';
                      const sellerCode = user.seller_code || user.vendor_code || 'SIN_CODIGO';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                                user.role === 'admin' 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : user.role === 'director_territorial'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : user.role === 'director_comercial'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-solitium-100 text-solitium-600'
                              }`}>
                                {displayName.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{displayName}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2.5 py-1 rounded-md text-[11px] border border-slate-200">
                              {sellerCode}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              user.role === 'admin' 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                : user.role === 'director_territorial'
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : user.role === 'director_comercial'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {user.role === 'director_territorial' ? 'Dir. Territorial' :
                               user.role === 'director_comercial' ? 'Dir. Comercial' :
                               user.role === 'admin' ? 'Administrador' : 'Comercial'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              {groupObj ? groupObj.name : 'Sin Grupo'}
                            </span>
                          </td>

                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 text-slate-500 hover:text-solitium-600 hover:bg-solitium-50 rounded-lg transition-colors"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, displayName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: GESTIÓN DE ZONAS Y GRUPOS TERRITORIALES */}
      {activeAdminSubTab === 'groups' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Catálogo de Zonas Territoriales (<code className="font-mono text-solitium-600">commercial_groups</code>)
              </h3>
              <p className="text-xs text-slate-500">
                Los cambios se guardan directamente en Supabase y alimentan los desplegables de asignación de usuarios y cuadros territoriales.
              </p>
            </div>
            {groups.length === 0 && (
              <button
                onClick={handleInitializeDefaultGroups}
                className="text-xs bg-solitium-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-solitium-600 transition-colors"
              >
                Inicializar 4 Grupos Base
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Identificador (UUID)</th>
                  <th className="p-4">Nombre de la Zona / Grupo</th>
                  <th className="p-4">Director Comercial Asignado</th>
                  <th className="p-4">Comerciales Vinculados</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {groups.map(g => {
                  const linkedComercials = users.filter(u => u.group_id === g.id);
                  const dcUser = users.find(u => u.id === g.director_commercial_id || (u.group_id === g.id && u.role === 'director_comercial'));

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {g.id}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 text-sm">{g.name}</span>
                      </td>
                      <td className="p-4">
                        {dcUser ? (
                          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {dcUser.full_name || dcUser.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin director asignado</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {linkedComercials.length} integrantes
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEditGroup(g)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-solitium-50 hover:bg-solitium-100 text-solitium-600 font-bold rounded-lg border border-solitium-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Zona</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Crear / Editar Usuario en Supabase profiles */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingUser ? `Editar: ${userFormData.full_name}` : 'Registrar Nuevo Usuario'}
                </h3>
                <p className="text-xs text-slate-400">
                  Guardado directo en tabla <code className="text-solitium-100 font-mono">public.profiles</code>
                </p>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo (full_name)
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  placeholder="ej. Laura Sánchez Gómez"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email / Usuario Corporativo (email)
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="ej. laura.sanchez@solitium.es"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Vendedor de Liquidación (seller_code)
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.seller_code}
                  onChange={(e) => setUserFormData({ ...userFormData, seller_code: e.target.value.toUpperCase() })}
                  placeholder="ej. ALAPIEZA, JVILLAGRASA, LMARTINEZ..."
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Debe coincidir con la columna "Pago-a Cód. Vendedor" de la liquidación de Solitium.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Selector de Rol */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol (role)
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                  >
                    <option value="comercial">Comercial</option>
                    <option value="director_comercial">Director Comercial</option>
                    <option value="director_territorial">Director Territorial</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* 2. Selector dinámico de Grupo desde commercial_groups */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grupo Territorial (group_id)
                  </label>
                  <select
                    value={userFormData.group_id}
                    onChange={(e) => setUserFormData({ ...userFormData, group_id: e.target.value })}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar en Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear / Editar Zona o Grupo en Supabase commercial_groups */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingGroup ? `Editar Zona: ${editingGroup.name}` : 'Crear Nueva Zona Territorial'}
                </h3>
                <p className="text-xs text-slate-400">
                  Guardado directo en tabla <code className="text-solitium-100 font-mono">public.commercial_groups</code>
                </p>
              </div>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Zona / Grupo (name)
                </label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="ej. Grupo 1 - Aragón Norte"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Director Comercial Asignado (director_commercial_id)
                </label>
                <select
                  value={groupFormData.director_commercial_id}
                  onChange={(e) => setGroupFormData({ ...groupFormData, director_commercial_id: e.target.value })}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                >
                  <option value="">-- Sin Director Asignado --</option>
                  {users.filter(u => u.role === 'director_comercial' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Zona</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
