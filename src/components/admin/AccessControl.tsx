'use client';
import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import Icon from '@/components/ui/AppIcon';

// Initialize secondary auth for creating users without logging out
const getSecondaryAuth = () => {
  let app2;
  try {
    app2 = getApp('secondary');
  } catch (e) {
    app2 = initializeApp(firebaseConfig, 'secondary');
  }
  return getAuth(app2);
};

export default function AccessControl({ currentUserRole }: { currentUserRole?: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  
  // Data
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const unsubPerms = onSnapshot(collection(db, 'permissions'), snap => {
      setPermissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), snap => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubPerms(); unsubRoles(); unsubUsers(); };
  }, []);

  useEffect(() => {
    const seedPermissions = async () => {
      try {
        const snap = await getDocs(collection(db, 'permissions'));
        const existing = snap.docs.map(d => d.data().title);
        const DEFAULT_PERMISSIONS = [
          'manage_enquiries',
          'manage_bookings',
          'manage_calendar',
          'manage_customers',
          'manage_payments',
          'manage_menus',
          'manage_history',
          'manage_settings',
          'manage_access',
          'manage_tracker',
          'manage_discounts'
        ];
        for (const p of DEFAULT_PERMISSIONS) {
          if (!existing.includes(p)) {
            await addDoc(collection(db, 'permissions'), {
              title: p,
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error("Error seeding permissions:", e);
      }
    };
    seedPermissions();
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-1 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'users' ? 'border-[#C8860A] text-[#C8860A]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-2 px-1 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'roles' ? 'border-[#C8860A] text-[#C8860A]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Roles
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-2 px-1 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'permissions' ? 'border-[#C8860A] text-[#C8860A]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Permissions
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'users' && <UsersTab users={users} roles={roles} currentUserRole={currentUserRole} />}
        {activeTab === 'roles' && <RolesTab roles={roles} permissions={permissions} currentUserRole={currentUserRole} />}
        {activeTab === 'permissions' && <PermissionsTab permissions={permissions} currentUserRole={currentUserRole} />}
      </div>
    </div>
  );
}

// ─── USERS TAB ──────────────────────────────────────────────────────────────
function UsersTab({ users, roles, currentUserRole }: { users: any[], roles: any[], currentUserRole?: string }) {
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: u.password || '', roleId: u.roleId || '' });
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      if (editingId) {
        // Update Firestore document with new name, email, password, role
        await updateDoc(doc(db, 'users', editingId), {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
          password: form.password
        });
      } else {
        // Create mode
        if (!form.password) {
            alert("Password is required for new users.");
            setLoading(false);
            return;
        }
        const secAuth = getSecondaryAuth();
        const userCred = await createUserWithEmailAndPassword(secAuth, form.email, form.password);
        await addDoc(collection(db, 'users'), {
          uid: userCred.user.uid,
          name: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId,
          createdAt: new Date().toISOString()
        });
      }
      setOpenForm(false);
      setEditingId(null);
      setForm({ name: '', email: '', password: '', roleId: '' });
    } catch (e: any) {
      alert('Error saving user: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Manage Users</h3>
        <button onClick={() => { setEditingId(null); setForm({ name: '', email: '', password: '', roleId: '' }); setOpenForm(true); }} className="bg-[#C8860A] hover:bg-[#A06A08] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Icon name="PlusIcon" size={16} /> Add User
        </button>
      </div>
      
      {openForm && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Email Address" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <div className="relative">
            <input className="border rounded-lg pl-3 pr-10 py-2 text-sm w-full" placeholder="Password" type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={20} />
            </button>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white" value={form.roleId} onChange={e => setForm({...form, roleId: e.target.value})}>
            <option value="">Select Role</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="col-span-1 md:col-span-2 flex justify-end gap-2">
            <button onClick={() => { setOpenForm(false); setEditingId(null); }} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm font-semibold bg-[#C8860A] text-white rounded-lg">{editingId ? 'Update' : 'Save'}</button>
          </div>
        </div>
      )}

      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map(u => {
            const role = roles.find(r => r.id === u.roleId);
            return (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  {role ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold">{role.name}</span> : <span className="text-gray-400 italic">None</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleOpenEdit(u)} className="text-blue-500 hover:text-blue-700 p-2"><Icon name="PencilSquareIcon" size={16} /></button>
                    {currentUserRole === 'Super Admin' && (
                      <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="TrashIcon" size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ROLES TAB ──────────────────────────────────────────────────────────────
function RolesTab({ roles, permissions, currentUserRole }: { roles: any[], permissions: any[], currentUserRole?: string }) {
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', permissionIds: [] as string[] });

  const handleOpenEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, permissionIds: r.permissionIds || [] });
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editingId) {
      await updateDoc(doc(db, 'roles', editingId), {
        name: form.name,
        permissionIds: form.permissionIds
      });
    } else {
      await addDoc(collection(db, 'roles'), {
        name: form.name,
        permissionIds: form.permissionIds,
        createdAt: new Date().toISOString()
      });
    }
    setOpenForm(false);
    setEditingId(null);
    setForm({ name: '', permissionIds: [] });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      await deleteDoc(doc(db, 'roles', id));
    }
  };

  const togglePermission = (permId: string) => {
    setForm(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter(id => id !== permId)
        : [...prev.permissionIds, permId]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Manage Roles</h3>
        <button onClick={() => { setEditingId(null); setForm({ name: '', permissionIds: [] }); setOpenForm(true); }} className="bg-[#C8860A] hover:bg-[#A06A08] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Icon name="PlusIcon" size={16} /> Add Role
        </button>
      </div>

      {openForm && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
          <input className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm" placeholder="Role Name (e.g. Manager)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">Assign Permissions:</p>
            <div className="flex flex-wrap gap-2">
              {permissions.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePermission(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.permissionIds.includes(p.id) ? 'bg-[#C8860A] text-white border-[#C8860A]' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpenForm(false); setEditingId(null); }} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-[#C8860A] text-white rounded-lg">{editingId ? 'Update' : 'Save'}</button>
          </div>
        </div>
      )}

      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-700">Role Name</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Permissions</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {roles.map(r => (
            <tr key={r.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 text-gray-500">
                <div className="flex flex-wrap gap-1">
                    {(r.permissionIds || []).map((permId: string) => {
                        const p = permissions.find(x => x.id === permId);
                        return p ? <span key={permId} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs border border-amber-200">{p.title}</span> : null;
                    })}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleOpenEdit(r)} className="text-blue-500 hover:text-blue-700 p-2"><Icon name="PencilSquareIcon" size={16} /></button>
                    {currentUserRole === 'Super Admin' && (
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="TrashIcon" size={16} /></button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PERMISSIONS TAB ────────────────────────────────────────────────────────
function PermissionsTab({ permissions, currentUserRole }: { permissions: any[], currentUserRole?: string }) {
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setTitle(p.title);
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!title) return;
    if (editingId) {
      await updateDoc(doc(db, 'permissions', editingId), { title });
    } else {
      await addDoc(collection(db, 'permissions'), {
        title,
        createdAt: new Date().toISOString()
      });
    }
    setOpenForm(false);
    setEditingId(null);
    setTitle('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this permission?')) {
      await deleteDoc(doc(db, 'permissions', id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Manage Permissions</h3>
        <button onClick={() => { setEditingId(null); setTitle(''); setOpenForm(true); }} className="bg-[#C8860A] hover:bg-[#A06A08] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Icon name="PlusIcon" size={16} /> Add Permission
        </button>
      </div>

      {openForm && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-4 items-center mb-6 max-w-lg">
          <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Permission (e.g. view_dashboard)" value={title} onChange={e => setTitle(e.target.value)} />
          <button onClick={() => { setOpenForm(false); setEditingId(null); }} className="text-sm font-semibold text-gray-500">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-[#C8860A] text-white rounded-lg">{editingId ? 'Update' : 'Save'}</button>
        </div>
      )}

      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-700">Permission Title</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Created At</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {permissions.map(p => (
            <tr key={p.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium text-[#C8860A]">{p.title}</td>
              <td className="px-4 py-3 text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleOpenEdit(p)} className="text-blue-500 hover:text-blue-700 p-2"><Icon name="PencilSquareIcon" size={16} /></button>
                    {currentUserRole === 'Super Admin' && (
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="TrashIcon" size={16} /></button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
