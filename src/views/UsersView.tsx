import React, { useState, useEffect } from 'react';
import { api } from "@/api";
import { User, Branch } from "@/types";
import { useNotification } from "@/context/NotificationContext";
import { UserCheck, Plus, Search, Shield, Lock, X, Edit2, UserCog, Database, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { StatusBadge } from "@/components/StatusBadge";
import {
  getWhitelistedAdmins,
  addAdminToWhitelist,
  removeAdminFromWhitelist,
  toggleAdminStatus,
  bootstrapPrimaryAdmin,
  PRIMARY_ADMIN_EMAIL,
  AdminWhitelistEntry,
} from "@/utils/adminWhitelist";

export const UsersView: React.FC = () => {
  const { notify } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');

  // Tab State: 'STAFF' or 'WHITELIST'
  const [activeTab, setActiveTab] = useState<'STAFF' | 'WHITELIST'>('STAFF');

  // Firebase Whitelist States
  const [whitelistedAdmins, setWhitelistedAdmins] = useState<AdminWhitelistEntry[]>([]);
  const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [isSubmittingWhitelist, setIsSubmittingWhitelist] = useState(false);
  const [whitelistSearch, setWhitelistSearch] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('123456');
  const [role, setRole] = useState<'ADMIN' | 'ACCOUNTANT' | 'STAFF'>('STAFF');
  const [branchId, setBranchId] = useState('all');
  const [phone, setPhone] = useState('');

  const fetchUsers = async () => {
    try {
      const [uList, bList] = await Promise.all([api.getUsers(), api.getBranches()]);
      setUsers(uList);
      setBranches(bList);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const fetchWhitelist = async () => {
    setIsLoadingWhitelist(true);
    try {
      const list = await getWhitelistedAdmins();
      // If list is empty, automatically bootstrap primary root admin
      if (list.length === 0) {
        await bootstrapPrimaryAdmin();
        const refreshed = await getWhitelistedAdmins();
        setWhitelistedAdmins(refreshed);
      } else {
        setWhitelistedAdmins(list);
      }
    } catch (err: any) {
      console.warn('Failed to load Firestore admin whitelist:', err);
      notify({ type: 'WARNING', title: 'Whitelist Sync', message: 'Could not load Firestore admin whitelist. Ensure you are signed in.' });
    } finally {
      setIsLoadingWhitelist(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWhitelist();
  }, []);

  const handleBootstrapRoot = async () => {
    setIsLoadingWhitelist(true);
    try {
      await bootstrapPrimaryAdmin();
      await fetchWhitelist();
      notify({
        type: 'SUCCESS',
        title: 'Root Admin Synchronized',
        message: `${PRIMARY_ADMIN_EMAIL} is actively whitelisted in Firebase Firestore.`,
      });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Bootstrap Error', message: err.message });
    } finally {
      setIsLoadingWhitelist(false);
    }
  };

  const handleAddAdminWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setIsSubmittingWhitelist(true);
    try {
      await addAdminToWhitelist({
        email: newAdminEmail.trim().toLowerCase(),
        name: newAdminName.trim() || undefined,
        role: newAdminRole,
      });
      notify({
        type: 'SUCCESS',
        title: 'Admin Whitelisted',
        message: `${newAdminEmail} has been added to Firebase Firestore whitelist.`,
      });
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminRole('ADMIN');
      setIsAddAdminModalOpen(false);
      await fetchWhitelist();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Failed to Whitelist', message: err.message });
    } finally {
      setIsSubmittingWhitelist(false);
    }
  };

  const handleToggleWhitelistStatus = async (item: AdminWhitelistEntry) => {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleAdminStatus(item.id, nextStatus);
      notify({
        type: 'SUCCESS',
        title: 'Whitelist Updated',
        message: `${item.email} is now ${nextStatus}.`,
      });
      await fetchWhitelist();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Update Failed', message: err.message });
    }
  };

  const handleRemoveWhitelist = async (item: AdminWhitelistEntry) => {
    if (item.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      notify({ type: 'ERROR', title: 'Action Denied', message: 'The primary root administrator cannot be removed.' });
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${item.email} from the Firebase Administrator Whitelist?`)) {
      return;
    }
    try {
      await removeAdminFromWhitelist(item.id);
      notify({
        type: 'SUCCESS',
        title: 'Admin Removed',
        message: `${item.email} has been removed from Firebase whitelist.`,
      });
      await fetchWhitelist();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Deletion Failed', message: err.message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        name,
        email,
        password,
        pin: pin || '123456',
        role,
        branchId,
        phone,
      });
      notify({ type: 'SUCCESS', title: 'User Created', message: `${name} (${role}) added.` });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setPin('123456');
      fetchUsers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, {
        name,
        email,
        role,
        branchId,
        phone,
      });
      notify({ type: 'SUCCESS', title: 'User Updated', message: `${name} updated.` });
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, { pin: newPin });
      notify({ type: 'SUCCESS', title: 'PIN Updated', message: `PIN updated for ${editingUser.name}.` });
      setIsPinModalOpen(false);
      setEditingUser(null);
      setNewPin('');
      fetchUsers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateUser(user.id, { status: newStatus });
      notify({
        type: 'SUCCESS',
        title: 'Status Updated',
        message: `${user.name} is now ${newStatus}.`,
      });
      fetchUsers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Update Failed', message: err.message });
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setBranchId(u.branchId);
    setPhone(u.phone || '');
    setIsEditModalOpen(true);
  };

  const filteredAdmins = whitelistedAdmins.filter(
    (a) =>
      a.email.toLowerCase().includes(whitelistSearch.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(whitelistSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>User Roles & Administration</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" /> Dynamic Firestore RBAC
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical branch staff, ERP user profiles, and dynamic Firebase Firestore security whitelists.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'STAFF'
                ? 'bg-white text-[#030A91] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff & ERP Users</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('WHITELIST')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'WHITELIST'
                ? 'bg-[#030A91] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#FACB00]" />
            <span>Firebase Admin Whitelist</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-[#FACB00]">
              {whitelistedAdmins.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'STAFF' ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
              <span>Add System User</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Assigned Branch Station</th>
                    <th className="py-3 px-3">POS 6-Digit PIN</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const b = branches.find((br) => br.id === u.branchId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEditModal(u)}>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              u.role === 'ADMIN'
                                ? 'bg-blue-100 text-[#030A91]'
                                : u.role === 'ACCOUNTANT'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {u.branchId === 'all' ? 'All Branches (HQ Access)' : b?.name || u.branchId}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-xs text-[#030A91]">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                              {u.pin || '123456'}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingUser(u); setNewPin(u.pin || ''); setIsPinModalOpen(true); }}
                              className="text-slate-400 hover:text-[#030A91]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{u.phone || 'N/A'}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Dynamic Firebase Firestore Whitelist View */
        <div className="space-y-6">
          {/* Security & Architecture Overview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-[#030A91] text-white shadow-sm border border-blue-900/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-400/20 text-[#FACB00] border border-amber-400/30">
                    <Database className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm tracking-wide">
                    Dynamic Firestore Administrator Whitelist
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    Live Security Rules
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Administrator privileges are verified dynamically at runtime in Firestore Security Rules via{' '}
                  <code className="text-amber-300 font-mono text-[11px] bg-black/40 px-1.5 py-0.5 rounded">
                    exists(/databases/$(database)/documents/admins/$(request.auth.uid))
                  </code>
                  . Whitelisted accounts obtain immediate system privileges without requiring hardcoded code deployments.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <strong>Root Admin:</strong> {PRIMARY_ADMIN_EMAIL}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span><strong>Collection:</strong> /admins/{`{adminId}`}</span>
                  <span className="text-slate-400">|</span>
                  <span><strong>Database:</strong> ai-studio-naisiaeschooluni-ff1bcda5-c527-425d-91e7-84292c2b2c02</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBootstrapRoot}
                  disabled={isLoadingWhitelist}
                  className="inline-flex items-center px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/20"
                  title="Ensure primary root admin is seeded in Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-amber-300 ${isLoadingWhitelist ? 'animate-spin' : ''}`} />
                  <span>Sync Root Admin</span>
                </button>
                <button
                  onClick={() => setIsAddAdminModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-[#FACB00] text-slate-950 rounded-xl text-xs font-black hover:bg-amber-400 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1 text-slate-950" />
                  <span>Add Whitelisted Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={whitelistSearch}
                onChange={(e) => setWhitelistSearch(e.target.value)}
                placeholder="Search whitelisted email or name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredAdmins.length} of {whitelistedAdmins.length} dynamic administrators
            </div>
          </div>

          {/* Whitelist Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Firestore Document ID</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Added By</th>
                    <th className="py-3 px-3">Whitelisted Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.map((item) => {
                    const isRoot = item.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#030A91] flex items-center justify-center font-bold text-xs">
                              {item.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{item.name || item.email.split('@')[0]}</span>
                                {isRoot && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-black">
                                    ROOT
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              item.role === 'SUPER_ADMIN'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-blue-100 text-[#030A91]'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {item.id}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">{item.addedBy}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isRoot && (
                              <>
                                <button
                                  onClick={() => handleToggleWhitelistStatus(item)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                    item.status === 'ACTIVE'
                                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  {item.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleRemoveWhitelist(item)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                                  title="Remove from Whitelist"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isRoot && (
                              <span className="text-[10px] text-slate-400 font-medium italic">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdmins.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        {isLoadingWhitelist ? 'Loading dynamic whitelist from Firestore...' : 'No whitelisted administrators match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New ERP User</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Mutua"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Email Address:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="s.mutua@naisiaetextiles.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Password:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    System Role:
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="STAFF">Staff / POS Cashier</option>
                    <option value="ACCOUNTANT">Accountant / Tax</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Assigned Branch:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">All Branches (HQ)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Phone:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Assigned 6-Digit POS PIN:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl tracking-widest text-[#030A91]"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Used by staff cashiers to unlock the POS retail checkout terminal.</p>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center"><UserCog className="w-4 h-4 mr-2" /> Edit User Details</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Email Address:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    System Role:
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="STAFF">Staff / POS Cashier</option>
                    <option value="ACCOUNTANT">Accountant / Tax</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Assigned Branch:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">All Branches (HQ)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Phone:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-indigo-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Update PIN for {editingUser.name}</h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePin} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  New 6-Digit POS PIN:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-3 text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl tracking-widest text-indigo-900 text-center"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-800 text-white text-xs font-bold hover:bg-indigo-900"
              >
                Update PIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Whitelisted Admin Modal */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-[#030A91] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FACB00]" />
                <h3 className="font-bold text-sm">Add to Firebase Admin Whitelist</h3>
              </div>
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdminWhitelist} className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                Adding an email dynamically writes an administrator record into Firestore{' '}
                <code className="font-mono font-bold text-[#030A91]">/admins/{'{email}'}</code>.
                The security rules will grant instant administrator privileges upon authentication.
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Google Email Address:
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="e.g. administrator@gmail.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#030A91] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Administrator Name / Designation:
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Jane Doe (Finance Director)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#030A91] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Security Privilege Level:
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="ADMIN">ADMIN (Full Catalog & ERP Operations)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Global System Oversight)</option>
                </select>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWhitelist}
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 transition-colors disabled:opacity-50"
                >
                  {isSubmittingWhitelist ? 'Writing to Firestore...' : 'Whitelist in Firebase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
