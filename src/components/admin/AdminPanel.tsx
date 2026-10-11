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
  Key
} from 'lucide-react';
import { CommercialUser, UserRole, COMMERCIAL_GROUPS } from '@/types';
import { getAllUsers, saveUser, deleteUser } from '@/lib/storage';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<CommercialUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulario de edición / creación
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    email: string;
    vendor_code: string;
    role: UserRole;
    group_id: string;
    is_active: boolean;
  }>({
    id: '',
    name: '',
    email: '',
    vendor_code: '',
    role: 'comercial',
    group_id: 'grp-1',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      id: `user-${Date.now()}`,
      name: '',
      email: '',
      vendor_code: '',
      role: 'comercial',
      group_id: 'grp-1',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: CommercialUser) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      vendor_code: user.vendor_code,
      role: user.role,
      group_id: user.group_id,
      is_active: user.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await saveUser(formData as CommercialUser);
      if (success) {
        setNotification({
          type: 'success',
          message: editingUser ? 'Usuario actualizado correctamente.' : 'Nuevo usuario registrado con éxito.',
        });
        setIsModalOpen(false);
        await loadUsers();
      } else {
        setNotification({ type: 'error', message: 'No se pudo guardar en Supabase profiles.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error guardando usuario' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${name}" del sistema?`)) {
      try {
        const success = await deleteUser(userId);
        if (success) {
          setNotification({ type: 'success', message: `Usuario ${name} eliminado.` });
          await loadUsers();
        } else {
          setNotification({ type: 'error', message: 'Error eliminando el usuario.' });
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message });
      }
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleActive = async (user: CommercialUser) => {
    const updated = { ...user, is_active: !user.is_active };
    await saveUser(updated);
    setNotification({
      type: 'success',
      message: updated.is_active ? `Usuario ${user.name} activado.` : `Usuario ${user.name} dado de baja.`,
    });
    await loadUsers();
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.vendor_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Alerta de notificación */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold animate-in fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
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
            Panel de Administración y Gestión de Usuarios
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administra altas, bajas, roles y asignación a los 4 grupos territoriales y códigos de liquidación.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-solitium-500 hover:bg-solitium-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
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
          Total: <strong className="text-slate-800">{filteredUsers.length}</strong> usuarios registrados
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
                  <th className="p-4">Grupo Asignado</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredUsers.map(user => {
                  const groupObj = COMMERCIAL_GROUPS.find(g => g.id === user.group_id);
                  const isActive = user.is_active !== false;

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
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2.5 py-1 rounded-md text-[11px] border border-slate-200">
                          {user.vendor_code || 'SIN_CODIGO'}
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
                        <span className="text-xs font-semibold text-slate-700">
                          {groupObj ? groupObj.name : user.group_id}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-slate-400" />
                              <span>De Baja</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-500 hover:text-solitium-600 hover:bg-solitium-50 rounded-lg transition-colors"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
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

      {/* Modal de Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingUser ? `Editar: ${editingUser.name}` : 'Registrar Nuevo Usuario'}
                </h3>
                <p className="text-xs text-slate-400">
                  Asignación de rol, grupo y parámetros de liquidación
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Laura Sánchez Gómez"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email / Usuario Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ej. laura.sanchez@solitium.es"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Vendedor de Liquidación
                </label>
                <input
                  type="text"
                  required
                  value={formData.vendor_code}
                  onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value.toUpperCase() })}
                  placeholder="ej. ALAPIEZA, JVILLAGRASA, LMARTINEZ..."
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Debe coincidir con la columna "Pago-a Cód. Vendedor" del Excel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 2. Selector de Rol */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                  >
                    <option value="comercial">Comercial</option>
                    <option value="director_comercial">Director Comercial</option>
                    <option value="director_territorial">Director Territorial</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* 2. Selector de Grupo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grupo Comercial
                  </label>
                  <select
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-solitium-500"
                  >
                    {COMMERCIAL_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
