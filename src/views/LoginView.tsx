import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
  ShoppingCart,
  CheckCircle2,
  KeyRound,
  Store,
  User as UserIcon,
  Delete,
  Search,
  Sparkles,
  Key
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';

type RoleCategory = 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'CUSTOM';

interface StaffUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
  phone: string;
  hasPin: boolean;
}

export const LoginView: React.FC = () => {
  const { login, loginWithPin } = useAuth();
  const { notify } = useNotification();

  const [selectedRole, setSelectedRole] = useState<RoleCategory | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Staff PIN Authentication States
  const [staffList, setStaffList] = useState<StaffUserItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<StaffUserItem | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [useEmailForStaff, setUseEmailForStaff] = useState(false);

  // Load staff users when tapping STAFF
  const loadStaffUsers = async () => {
    setIsLoadingStaff(true);
    try {
      const data = await api.getStaffUsers();
      // Prioritize STAFF role users, but include any active users
      const sorted = [...data].sort((a, b) => {
        if (a.role === 'STAFF' && b.role !== 'STAFF') return -1;
        if (b.role === 'STAFF' && a.role !== 'STAFF') return 1;
        return a.name.localeCompare(b.name);
      });
      setStaffList(sorted);
    } catch (err: any) {
      console.warn('Failed to load staff list:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Handle clicking on one of the big role boxes
  const handleSelectRoleBox = (role: RoleCategory) => {
    setSelectedRole(role);
    setErrorMessage('');
    setEnteredPin('');
    setSelectedStaffUser(null);
    setUseEmailForStaff(false);

    if (role === 'ADMIN') {
      setEmail('admin@naisiaetextiles.com');
      setPassword('AdminPassword2026!');
    } else if (role === 'ACCOUNTANT') {
      setEmail('accountant@naisiaetextiles.com');
      setPassword('Accountant2026!');
    } else if (role === 'STAFF') {
      setEmail('staff.nairobi@naisiaetextiles.com');
      setPassword('StaffNairobi2026!');
      loadStaffUsers();
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleBackToBoxes = () => {
    setSelectedRole(null);
    setSelectedStaffUser(null);
    setEnteredPin('');
    setErrorMessage('');
  };

  // Standard Email + Password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email address and password');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login({ email, password });
      notify({
        type: 'SUCCESS',
        title: 'Authentication Successful',
        message: `Welcome to Naisiae ERP`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      notify({
        type: 'ERROR',
        title: 'Login Failed',
        message: err.message || 'Invalid credentials or inactive account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // PIN Authentication Submission
  const handlePinSubmit = useCallback(
    async (pinToSubmit?: string) => {
      const pin = pinToSubmit || enteredPin;
      if (!selectedStaffUser) return;
      if (pin.length !== 6) {
        setErrorMessage('Please enter your full 6-digit PIN');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage('');

      try {
        await loginWithPin({ userId: selectedStaffUser.id, pin });
        notify({
          type: 'SUCCESS',
          title: 'Station Unlocked',
          message: `Welcome, ${selectedStaffUser.name}`,
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Incorrect 6-digit PIN. Please try again.');
        setEnteredPin('');
        notify({
          type: 'ERROR',
          title: 'PIN Verification Failed',
          message: err.message || 'Incorrect PIN entered',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [enteredPin, selectedStaffUser, loginWithPin, notify]
  );

  // Keypad Handlers
  const handleKeypadPress = (num: string) => {
    if (enteredPin.length < 6 && !isSubmitting) {
      const newPin = enteredPin + num;
      setEnteredPin(newPin);
      setErrorMessage('');
      if (newPin.length === 6) {
        // Auto-submit when 6th digit is typed
        setTimeout(() => handlePinSubmit(newPin), 80);
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (enteredPin.length > 0 && !isSubmitting) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const handleKeypadClear = () => {
    setEnteredPin('');
    setErrorMessage('');
  };

  // Physical Keyboard Listener for PIN Pad
  useEffect(() => {
    if (selectedRole !== 'STAFF' || !selectedStaffUser || useEmailForStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeypadBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleKeypadClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (enteredPin.length === 6) {
          handlePinSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRole, selectedStaffUser, enteredPin, useEmailForStaff, handlePinSubmit]);

  // Demo PIN helpers for quick testing
  const getDemoPinForUser = (userId: string) => {
    if (userId === 'usr-pos-nbi') return '123456';
    if (userId === 'usr-pos-wst') return '654321';
    if (userId === 'usr-pos-msa') return '112233';
    return '123456';
  };

  // Filtered staff list based on search
  const filteredStaff = staffList.filter((s) => {
    const q = staffSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.branchName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col justify-between select-none">
      {/* ==================================================== */}
      {/* END-TO-END WIDE HEADER WITH SINGLE WAVE BOTTOM CURVE */}
      {/* ==================================================== */}
      <div className="w-full relative bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-12 text-center relative z-10">
          <div className="inline-flex items-center justify-center space-x-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg ring-4 ring-white/10 tracking-tighter">
              NT
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none text-white drop-shadow-sm">
                NAISIAE ERP
              </h1>
              <p className="text-xs sm:text-sm text-[#FACB00] font-bold tracking-widest mt-1 uppercase">
                ERP
              </p>
            </div>
          </div>
        </div>

        {/* SINGLE WAVE CURVED BOTTOM EDGE */}
        <div className="w-full leading-none overflow-hidden select-none -mb-[1px]">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-12 sm:h-20 md:h-24 block"
            preserveAspectRatio="none"
          >
            {/* Subtle Golden Accent Wave shadow behind */}
            <path
              d="M0,20 C360,95 1080,-10 1440,65 L1440,120 L0,120 Z"
              fill="#FACB00"
              fillOpacity="0.22"
            />
            {/* Primary Background wave cut */}
            <path
              d="M0,0 C380,85 1060,-20 1440,50 L1440,120 L0,120 Z"
              fill="#F4F4F4"
            />
          </svg>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MAIN BODY: PORTAL SELECTION / STAFF PIN / LOGIN FORM */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-4 sm:-mt-8 md:-mt-10 pb-12 z-20 w-full max-w-6xl mx-auto">
        {!selectedRole ? (
          /* ==================================================== */
          /* 1. BIG PORTAL SELECTION BOXES (DEFAULT LANDING)      */
          /* ==================================================== */
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Select Your Access Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Tap your designated department below to open the secure login terminal
              </p>
            </div>

            {/* 3 CLEAN INTERACTIVE ROLE BOXES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 pt-2">
              {/* ADMIN BOX */}
              <div
                onClick={() => handleSelectRoleBox('ADMIN')}
                className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-md hover:shadow-xl hover:border-[#030A91] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#030A91] flex items-center justify-center shadow-inner group-hover:bg-[#030A91] group-hover:text-[#FACB00] transition-colors">
                    <ShieldCheck className="w-6 h-6" />
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#030A91]">
                      Governance
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 group-hover:text-[#030A91] transition-colors">
                      Administrator
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Multi-branch management, system security & audit logs.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#030A91] group-hover:text-blue-900">
                  <span className="group-hover:underline">Admin Login</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-[#030A91] group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* ACCOUNTANT BOX */}
              <div
                onClick={() => handleSelectRoleBox('ACCOUNTANT')}
                className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-md hover:shadow-xl hover:border-indigo-600 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner group-hover:bg-indigo-700 group-hover:text-[#FACB00] transition-colors">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Finance & Taxes
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 group-hover:text-indigo-700 transition-colors">
                      Accountant
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Official invoicing, ledgers, P&L reports & KRA eTIMS.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-900">
                  <span className="group-hover:underline">Finance Login</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-700 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* STAFF / POS CASHIER BOX */}
              <div
                onClick={() => handleSelectRoleBox('STAFF')}
                className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-600 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner group-hover:bg-emerald-700 group-hover:text-[#FACB00] transition-colors">
                    <ShoppingCart className="w-6 h-6" />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Retail POS
                      </span>
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        6-Digit PIN
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 group-hover:text-emerald-700 transition-colors">
                      Staff / POS Cashier
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Select your cashier name & unlock checkout with 6-digit PIN.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
                  <span className="group-hover:underline">Staff PIN Login</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom sign-in option */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => handleSelectRoleBox('CUSTOM')}
                className="text-xs font-bold text-slate-600 hover:text-[#030A91] hover:underline inline-flex items-center space-x-1 p-2 rounded-lg"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                <span>Or sign in with custom enterprise credentials &rarr;</span>
              </button>
            </div>
          </div>
        ) : selectedRole === 'STAFF' && !useEmailForStaff ? (
          /* ==================================================== */
          /* 2. STAFF SELECTION & 6-DIGIT PIN AUTHENTICATION      */
          /* ==================================================== */
          !selectedStaffUser ? (
            /* 2A. SELECT USER NAME CREATED IN THE SYSTEM         */
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToBoxes}
                  className="inline-flex items-center text-xs font-bold text-emerald-100 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Back to Portals</span>
                </button>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FACB00] text-[#030A91] shadow-xs">
                    Staff POS Terminal
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold mb-2 shadow-inner">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Select Your Staff Cashier Account
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tap your assigned name below to enter your 6-digit station PIN
                  </p>
                </div>

                {/* Search Bar if multiple staff */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Search your name or branch station..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                </div>

                {/* List of Staff Created in the System */}
                {isLoadingStaff ? (
                  <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                    Loading enterprise cashier accounts...
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No active staff users found matching "{staffSearchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredStaff.map((staff) => {
                      const initials = staff.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            setSelectedStaffUser(staff);
                            setEnteredPin('');
                            setErrorMessage('');
                          }}
                          className="p-3.5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 hover:shadow-md transition-all cursor-pointer flex items-center space-x-3 group relative overflow-hidden text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#030A91] text-[#FACB00] flex items-center justify-center font-black text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-black text-xs text-slate-900 group-hover:text-emerald-800 truncate block">
                                {staff.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                              <Store className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{staff.branchName}</span>
                            </div>
                            <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                              Tap to enter PIN
                            </span>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Switcher */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setUseEmailForStaff(true)}
                    className="text-slate-500 hover:text-[#030A91] hover:underline inline-flex items-center space-x-1 font-semibold"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    <span>Or sign in using standard email & password</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    {filteredStaff.length} Cashier{filteredStaff.length === 1 ? '' : 's'} Active
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* 2B. 6-DIGIT PIN ENTRY PAD                            */
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffUser(null);
                    setEnteredPin('');
                    setErrorMessage('');
                  }}
                  className="inline-flex items-center text-xs font-bold text-emerald-100 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Switch Staff</span>
                </button>

                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FACB00] text-[#030A91]">
                  6-Digit Terminal PIN
                </span>
              </div>

              <div className="p-6 sm:p-7">
                {/* Selected Staff Profile Card */}
                <div className="text-center mb-5 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#030A91] to-[#0412B3] text-[#FACB00] mx-auto flex items-center justify-center font-black text-xl shadow-md ring-4 ring-emerald-50">
                    {selectedStaffUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-2.5">
                    {selectedStaffUser.name}
                  </h3>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1 border border-emerald-200/60 font-semibold">
                    <Store className="w-3 h-3 text-emerald-600" />
                    <span>{selectedStaffUser.branchName}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 6 Circular PIN Indicators */}
                <div className="mb-6">
                  <label className="block text-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Enter Assigned 6-Digit PIN
                  </label>
                  <div className="flex items-center justify-center space-x-3.5">
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const isFilled = index < enteredPin.length;
                      return (
                        <div
                          key={index}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-150 ${
                            isFilled
                              ? 'bg-[#030A91] ring-4 ring-[#FACB00] scale-110 shadow-sm'
                              : 'border-2 border-slate-300 bg-slate-50'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Numeric Touch Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto mb-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleKeypadPress(digit)}
                      className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-[#030A91] hover:text-[#FACB00] text-slate-800 font-black text-xl transition-all duration-100 shadow-2xs active:scale-95 flex items-center justify-center disabled:opacity-50"
                    >
                      {digit}
                    </button>
                  ))}

                  {/* Clear Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || enteredPin.length === 0}
                    onClick={handleKeypadClear}
                    className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all shadow-2xs active:scale-95 flex items-center justify-center disabled:opacity-40"
                  >
                    Clear
                  </button>

                  {/* 0 Digit */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-[#030A91] hover:text-[#FACB00] text-slate-800 font-black text-xl transition-all duration-100 shadow-2xs active:scale-95 flex items-center justify-center disabled:opacity-50"
                  >
                    0
                  </button>

                  {/* Backspace Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || enteredPin.length === 0}
                    onClick={handleKeypadBackspace}
                    className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 font-bold transition-all shadow-2xs active:scale-95 flex items-center justify-center disabled:opacity-40"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  disabled={isSubmitting || enteredPin.length !== 6}
                  onClick={() => handlePinSubmit()}
                  className="w-full py-3 bg-[#030A91] text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-blue-900 transition-all shadow-md shadow-blue-900/20 disabled:opacity-40"
                >
                  <span>{isSubmitting ? 'Verifying PIN...' : 'Unlock POS Terminal'}</span>
                  <ArrowRight className="w-4 h-4 text-[#FACB00]" />
                </button>

                {/* Demo Helper Hint */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Demo PIN:{' '}
                      <strong className="text-slate-800 font-mono">
                        {getDemoPinForUser(selectedStaffUser.id)}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const demoPin = getDemoPinForUser(selectedStaffUser.id);
                      setEnteredPin(demoPin);
                      handlePinSubmit(demoPin);
                    }}
                    className="text-[11px] font-bold text-[#030A91] hover:underline px-2 py-1 rounded bg-blue-50"
                  >
                    Auto-Fill PIN
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ==================================================== */
          /* 3. EMAIL & PASSWORD LOGIN FORM (ADMIN / ACC / CUSTOM) */
          /* ==================================================== */
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            {/* Top Navigation Bar inside form */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToBoxes}
                className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#030A91] px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Back to Portals</span>
              </button>

              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedRole === 'ADMIN'
                    ? 'bg-blue-100 text-[#030A91]'
                    : selectedRole === 'ACCOUNTANT'
                    ? 'bg-indigo-100 text-indigo-800'
                    : selectedRole === 'STAFF'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedRole === 'CUSTOM' ? 'Direct Login' : `${selectedRole} Access`}
              </span>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {selectedRole === 'ADMIN' && 'Administrator Portal Sign In'}
                  {selectedRole === 'ACCOUNTANT' && 'Accountant Portal Sign In'}
                  {selectedRole === 'STAFF' && 'Staff Terminal Sign In'}
                  {selectedRole === 'CUSTOM' && 'Enterprise Staff Sign In'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Authenticate your credentials to open your operational workspace
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@naisiaetextiles.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 bg-[#030A91] text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-blue-900 transition-all shadow-md shadow-blue-900/20 disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? 'Authenticating...'
                      : `Enter ${selectedRole === 'CUSTOM' ? 'ERP' : selectedRole} Workspace`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#FACB00]" />
                </button>
              </form>

              {/* Quick Preset Buttons for other stations */}
              {selectedRole === 'STAFF' && (
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseEmailForStaff(false);
                      loadStaffUsers();
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center space-x-1"
                  >
                    <Key className="w-3.5 h-3.5 mr-1" />
                    <span>Switch to Fast 6-Digit PIN Cashier Login</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="bg-slate-50 p-3.5 text-center border-t border-slate-100 text-[11px] text-slate-500">
              Naisia Textiles • support@naisiaetextiles.com • Biashara St, Nairobi
            </div>
          </div>
        )}
      </div>

      {/* Global Footer info bar */}
      <footer className="text-center py-4 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Naisia Textiles Ltd. All rights reserved. • naisiaetextiles.com
      </footer>
    </div>
  );
};
