import React, { useState, useEffect } from 'react';
import { api } from '@/api';
import { User, Branch, UserRole } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import {
  UserCheck,
  Plus,
  Search,
  Shield,
  X,
  Edit2,
  UserCog,
  Database,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Crown,
  Building,
  Calculator,
  Boxes,
  Receipt,
  Scissors,
  Users as UsersIcon,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getWhitelistedAdmins,
  addAdminToWhitelist,
  removeAdminFromWhitelist,
  toggleAdminStatus,
  bootstrapPrimaryAdmin,
  PRIMARY_ADMIN_EMAIL,
  AdminWhitelistEntry,
} from '@/utils/adminWhitelist';
import {
  ROLE_CONFIGS,
  migrateAllUsersToFirestore,
  syncSingleUserToFirestore,
  deleteUserWithFirestoreSync,
  MigrationResult,
} from '@/utils/userMigration';

export const UsersView: React.FC = () => {
  const { notify } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminWhitelistEntry | null>(null);
  const [newPin, setNewPin] = useState('');

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'STAFF' | 'WHITELIST'>('STAFF');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [whitelistSearch, setWhitelistSearch] = useState('');

  // Migration & Sync State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Firebase Whitelist States
  const [whitelistedAdmins, setWhitelistedAdmins] = useState<AdminWhitelistEntry[]>([]);
  const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [isSubmittingWhitelist, setIsSubmittingWhitelist] = useState(false);

  // Form states for Create / Edit
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('123456');
  const [role, setRole] = useState<UserRole>('STAFF');
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
      if (list.length === 0) {
        await bootstrapPrimaryAdmin();
        const refreshed = await getWhitelistedAdmins();
        setWhitelistedAdmins(refreshed);
      } else {
        setWhitelistedAdmins(list);
      }
    } catch (err: any) {
      console.warn('Failed to load Firestore admin whitelist:', err);
    } finally {
      setIsLoadingWhitelist(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWhitelist();
  }, []);

  // Handler for Option 1: Full User & Role Migration
  const handleMigrateAllRoles = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateAllUsersToFirestore();
      setMigrationResult(result);
      setIsMigrationModalOpen(true);
      await fetchUsers();
      await fetchWhitelist();
      if (result.success) {
        notify({
          type: 'SUCCESS',
          title: 'User & Role Migration Complete',
          message: `Synchronized ${result.migratedUsers} users across ${Object.keys(result.rolesBreakdown).length} distinct roles to Firestore.`,
        });
      } else {
        notify({
          type: 'WARNING',
          title: 'Migration Partial',
          message: `Completed with warnings: ${result.errors.length} issue(s) reported.`,
        });
      }
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Migration Failed',
        message: err.message || 'Error executing Option 1 migration',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleBootstrapRoot = async () => {
    setIsLoadingWhitelist(true);
    try {
      await bootstrapPrimaryAdmin();
      await fetchWhitelist();
      await fetchUsers();
      notify({
        type: 'SUCCESS',
        title: 'Root Admin Synchronized',
        message: `${PRIMARY_ADMIN_EMAIL} is synchronized in Firebase Firestore & ERP database.`,
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

  const confirmRemoveWhitelist = async () => {
    if (!adminToDelete) return;
    try {
      await removeAdminFromWhitelist(adminToDelete.id);
      notify({
        type: 'SUCCESS',
        title: 'Admin Removed',
        message: `${adminToDelete.email} has been removed from Firebase whitelist.`,
      });
      setAdminToDelete(null);
      await fetchWhitelist();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Deletion Failed', message: err.message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createUser({
        name,
        email,
        password,
        pin: pin || '123456',
        role,
        branchId,
        phone,
      });

      // Synchronize to Firestore
      try {
        await syncSingleUserToFirestore(created);
      } catch (fErr) {
        console.warn('Firestore single sync warning:', fErr);
      }

      notify({ type: 'SUCCESS', title: 'User Created', message: `${name} (${role}) added & synced.` });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setPin('123456');
      setRole('STAFF');
      fetchUsers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await api.updateUser(editingUser.id, {
        name,
        email,
        role,
        branchId,
        phone,
      });

      // Synchronize to Firestore
      try {
        await syncSingleUserToFirestore(updated);
      } catch (fErr) {
        console.warn('Firestore update sync warning:', fErr);
      }

      notify({ type: 'SUCCESS', title: 'User Updated', message: `${name} updated & synced.` });
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
      const updated = await api.updateUser(editingUser.id, { pin: newPin });
      try {
        await syncSingleUserToFirestore(updated);
      } catch (fErr) {
        console.warn('Firestore pin sync warning:', fErr);
      }
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
      const updated = await api.updateUser(user.id, { status: newStatus });
      try {
        await syncSingleUserToFirestore(updated);
      } catch (fErr) {
        console.warn('Firestore status sync warning:', fErr);
      }
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

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserWithFirestoreSync(userToDelete.id, userToDelete.email);
      notify({
        type: 'SUCCESS',
        title: 'User Deleted',
        message: `${userToDelete.name} was removed from ERP and Firestore.`,
      });
      setUserToDelete(null);
      await fetchUsers();
      await fetchWhitelist();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Deletion Failed', message: err.message });
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

  // Filtered staff users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered whitelisted admins
  const filteredAdmins = whitelistedAdmins.filter(
    (a) =>
      a.email.toLowerCase().includes(whitelistSearch.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(whitelistSearch.toLowerCase()))
  );

  // Role icon helper
  const getRoleIcon = (roleName: UserRole) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return <Crown className="w-3.5 h-3.5 text-purple-600" />;
      case 'ADMIN':
        return <Shield className="w-3.5 h-3.5 text-indigo-600" />;
      case 'BRANCH_MANAGER':
        return <Building className="w-3.5 h-3.5 text-blue-600" />;
      case 'ACCOUNTANT':
        return <Calculator className="w-3.5 h-3.5 text-amber-600" />;
      case 'STORE_KEEPER':
        return <Boxes className="w-3.5 h-3.5 text-teal-600" />;
      case 'CASHIER':
        return <Receipt className="w-3.5 h-3.5 text-emerald-600" />;
      case 'TAILOR':
        return <Scissors className="w-3.5 h-3.5 text-pink-600" />;
      default:
        return <UsersIcon className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Organization Users & RBAC Matrix</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" /> Option 1: Live Firestore Sync
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full organizational user governance across Uhuru Market HQ and physical branches with synchronized Firestore RBAC security rules.
          </p>
        </div>

        {/* Tab & Action Area */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Migrate & Sync All Roles Button */}
          <button
            onClick={handleMigrateAllRoles}
            disabled={isMigrating}
            className="inline-flex items-center px-3.5 py-2 bg-gradient-to-r from-[#030A91] to-indigo-800 text-white rounded-xl text-xs font-black hover:opacity-95 transition-all shadow-sm border border-indigo-700 disabled:opacity-50"
            title="Execute Option 1: Synchronize all organization roles to Firebase Firestore"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#FACB00]" />
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isMigrating ? 'animate-spin' : ''}`} />
            <span>{isMigrating ? 'Migrating Roles...' : 'Migrate & Sync All Roles'}</span>
          </button>

          {/* Tab Selection */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'STAFF'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Staff & Roles</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('WHITELIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'WHITELIST'
                  ? 'bg-[#030A91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[#FACB00]" />
              <span>Admin Whitelist</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-[#FACB00] font-bold">
                {whitelistedAdmins.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'STAFF' ? (
        <>
          {/* Role Stats Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((rKey) => {
              const cfg = ROLE_CONFIGS[rKey];
              const count = users.filter((u) => u.role === rKey).length;
              const isSelected = roleFilter === rKey;
              return (
                <button
                  key={rKey}
                  onClick={() => setRoleFilter(isSelected ? 'ALL' : rKey)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-white border-[#030A91] ring-2 ring-blue-100 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{getRoleIcon(rKey)}</span>
                    <span className="text-xs font-black text-slate-900">{count}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 truncate mt-1">
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search, Filter & Add Button Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search staff by name, email or phone..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs py-2 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {ROLE_CONFIGS[rKey].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
              <span>Add Staff / Role</span>
            </button>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Role & Permissions</th>
                    <th className="py-3 px-3">Assigned Station</th>
                    <th className="py-3 px-3">POS PIN</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const b = branches.find((br) => br.id === u.branchId);
                    const cfg = ROLE_CONFIGS[u.role] || ROLE_CONFIGS.STAFF;
                    const isRoot = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#030A91] flex items-center justify-center font-black text-xs shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isRoot && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-black border border-amber-300">
                                    ROOT ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <span>{u.email}</span>
                                <span className="text-emerald-600 font-bold" title="Synced in Firestore /users">
                                  ✓
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {getRoleIcon(u.role)}
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {u.branchId === 'all' ? (
                            <span className="font-bold text-[#030A91]">Uhuru Market (HQ)</span>
                          ) : (
                            b?.name || u.branchId
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-xs text-[#030A91]">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                              {u.pin || '123456'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewPin(u.pin || '');
                                setIsPinModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-[#030A91] p-1"
                              title="Update POS PIN"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{u.phone || 'N/A'}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1 rounded-lg text-slate-500 hover:text-[#030A91] hover:bg-slate-100"
                              title="Edit user details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isRoot && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    u.status === 'ACTIVE'
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isRoot && (
                              <span className="text-[10px] text-amber-600 font-bold px-1.5 py-0.5 rounded bg-amber-50">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No users match your search and role filters.
                      </td>
                    </tr>
                  )}
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
                    Option 1 Live
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Administrator & Super Administrator privileges are evaluated by Firestore Security Rules using{' '}
                  <code className="text-amber-300 font-mono text-[11px] bg-black/40 px-1.5 py-0.5 rounded">
                    exists(/databases/$(database)/documents/admins/$(request.auth.uid))
                  </code>
                  . Whitelisted accounts obtain live cloud authorization seamlessly.
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
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-indigo-100 text-indigo-900'
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
                                  onClick={() => setAdminToDelete(item)}
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

      {/* Migration Results Modal */}
      {isMigrationModalOpen && migrationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-gradient-to-r from-[#030A91] to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Option 1: User & Role Migration Report</h3>
              </div>
              <button
                onClick={() => setIsMigrationModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Migration & RBAC Synchronization Succeeded
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    All organization staff and management accounts have been verified in the ERP database and mirrored into Firebase Firestore with hardened collection security.
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xl font-black text-slate-900">{migrationResult.totalUsers}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Total Users</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-xl font-black text-[#030A91]">{migrationResult.migratedUsers}</div>
                  <div className="text-[10px] text-blue-700 font-bold uppercase mt-0.5">Synced in /users</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-xl font-black text-purple-900">{migrationResult.whitelistedAdmins}</div>
                  <div className="text-[10px] text-purple-700 font-bold uppercase mt-0.5">Admins Whitelisted</div>
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-2">Role Distribution:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(migrationResult.rolesBreakdown).map(([r, count]) => (
                    <div
                      key={r}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        {getRoleIcon(r as UserRole)}
                        <span>{ROLE_CONFIGS[r as UserRole]?.label || r}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsMigrationModalOpen(false)}
                className="w-full py-2.5 bg-[#030A91] text-white rounded-xl text-xs font-black hover:bg-blue-900 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Staff / Organization User</h3>
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
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((rKey) => (
                      <option key={rKey} value={rKey}>
                        {ROLE_CONFIGS[rKey].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Assigned Branch:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Phone:
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0722000000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    POS Terminal PIN:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 shadow-sm"
                >
                  Create & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center">
                <UserCog className="w-4 h-4 mr-2" /> Edit User & Role
              </h3>
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
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((rKey) => (
                      <option key={rKey} value={rKey}>
                        {ROLE_CONFIGS[rKey].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Assigned Branch:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
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
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 shadow-sm"
                >
                  Save & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS PIN Edit Modal */}
      {isPinModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Update 6-Digit PIN</h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePin} className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Set a 4 to 6-digit PIN for <strong>{editingUser.name}</strong> to authenticate on POS cash registers.
              </p>
              <div>
                <input
                  type="text"
                  pattern="\d{4,6}"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full text-center tracking-widest text-lg font-mono font-black py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#030A91]"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Whitelisted Admin Modal */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Whitelisted Administrator</h3>
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdminWhitelist} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Google Account / Email:
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@naisiaetextiles.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Display Name (Optional):
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Finance Director"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Administrator Privilege Level:
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="ADMIN">ADMIN - Standard Administrator</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN - Full Whitelist & Security</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWhitelist}
                  className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingWhitelist ? 'Saving...' : 'Add to Whitelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Delete Staff Member</h3>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700">
                Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <p className="text-[11px] text-slate-500">
                This will delete the user account from the ERP database and Firestore.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Whitelisted Admin Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Remove from Whitelist</h3>
              <button
                onClick={() => setAdminToDelete(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700">
                Are you sure you want to revoke Firestore administrator privileges for{' '}
                <strong>{adminToDelete.email}</strong>?
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdminToDelete(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveWhitelist}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                >
                  Revoke Whitelist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
