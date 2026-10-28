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
  Key,
  X,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Clock,
  Wifi,
  ShieldAlert,
  Users,
  RefreshCw,
  HelpCircle,
  BadgeCheck
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

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
  demoPin?: string;
  pinHint?: string;
}

export const LoginView: React.FC = () => {
  const { login, loginAsAdmin, loginWithGoogle, loginWithPin } = useAuth();
  const { notify } = useNotification();

  const [selectedRole, setSelectedRole] = useState<RoleCategory | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Password Reset Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"EMAIL" | "CODE">("EMAIL");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [devResetCode, setDevResetCode] = useState("");

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsResetSubmitting(true);
    try {
      const res = await api.forgotPassword(resetEmail);
      if (res.devCode) {
        setDevResetCode(res.devCode);
      }
      notify({
        type: "SUCCESS",
        title: "Verification Code Sent",
        message: `A 6-digit verification code has been sent to ${resetEmail}`,
      });
      setResetStep("CODE");
    } catch (err: any) {
      notify({
        type: "ERROR",
        title: "Failed to Send Code",
        message: err.message || "Could not send password reset code",
      });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetCode || !newPassword) return;
    setIsResetSubmitting(true);
    try {
      await api.resetPassword({
        email: resetEmail,
        code: resetCode,
        newPassword,
      });
      notify({
        type: "SUCCESS",
        title: "Password Reset Successful",
        message: "Your password has been updated. You can now log in.",
      });
      setEmail(resetEmail);
      setIsResetModalOpen(false);
      setResetStep("EMAIL");
      setResetCode("");
      setNewPassword("");
      setDevResetCode("");
    } catch (err: any) {
      notify({
        type: "ERROR",
        title: "Reset Failed",
        message: err.message || "Invalid verification code or expired",
      });
    } finally {
      setIsResetSubmitting(false);
    }
  };


  // Google Sign-In Modal States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Authenticate as Administrator with Google
  const handleGoogleLogin = async (targetEmail?: string, targetName?: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const emailToUse = (targetEmail || customGoogleEmail || '').trim();
      const nameToUse = targetName || (emailToUse.includes('optimum') ? 'Optimum Engineering' : 'Administrator');
      await loginWithGoogle({ email: emailToUse, name: nameToUse });
      notify({
        type: 'SUCCESS',
        title: 'Google Sign-In Successful',
        message: `Welcome Administrator — Authenticated via Google (${emailToUse})`,
      });
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate via Google');
      notify({
        type: 'ERROR',
        title: 'Google Sign-In Failed',
        message: err.message || 'Could not verify Google credentials',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Google Sign-In Flow
  const handleOpenGoogleModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setErrorMessage('');
    setIsGoogleModalOpen(true);
  };

  // 1-Click Instant Admin Login with NO RULES enforced
  const handleDirectAdminLogin = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await handleGoogleLogin('', 'Optimum Engineering');
  };

  // Staff PIN Authentication States
  const [staffList, setStaffList] = useState<StaffUserItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<StaffUserItem | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [useEmailForStaff, setUseEmailForStaff] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isCashierSwitchModalOpen, setIsCashierSwitchModalOpen] = useState(false);
  const [isPinHelpModalOpen, setIsPinHelpModalOpen] = useState(false);
  const [isPinErrorShaking, setIsPinErrorShaking] = useState(false);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API Synthesizer for tactile feedback
  const playSound = useCallback(
    (type: 'press' | 'backspace' | 'clear' | 'success' | 'error') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'press') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.04);
          gain.gain.setValueAtTime(0.07, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'backspace') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.06);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.07);
        } else if (type === 'clear') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.09);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'success') {
          const now = ctx.currentTime;
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.09, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.2);
          });
        } else if (type === 'error') {
          const now = ctx.currentTime;
          [220, 160].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.12, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.08);
          });
        }
      } catch {
        // AudioContext silent fallback
      }
    },
    [soundEnabled]
  );

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
      setEmail('');
      setPassword('');
    } else if (role === 'ACCOUNTANT') {
      setEmail('');
      setPassword('');
    } else if (role === 'STAFF') {
      setEmail('');
      setPassword('');
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

  // Demo PIN helpers for quick testing & hint
  const getDemoPinForUser = useCallback(
    (userOrId?: StaffUserItem | string | null) => {
      if (!userOrId) return '333333';
      if (typeof userOrId === 'object') {
        if (userOrId.demoPin) return userOrId.demoPin;
        userOrId = userOrId.id;
      }
      const found = staffList.find((s) => s.id === userOrId);
      if (found?.demoPin) return found.demoPin;
      if (userOrId === 'usr-pos-nbi') return '123456';
      if (userOrId === 'usr-pos-wst') return '654321';
      if (userOrId === 'usr-pos-msa') return '112233';
      if (userOrId === 'usr-pos-ksm') return '334455';
      if (userOrId.includes('1791527847945')) return '333333';
      if (userOrId.includes('1791527957212')) return '333333';
      return '333333';
    },
    [staffList]
  );

  // Standard Email + Password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // NO RULES ON ADMIN LOGIN:
    // If admin is selected or email is admin/support, bypass password requirement and rules
    const isAdminTarget =
      selectedRole === 'ADMIN' ||
      email.toLowerCase().includes('admin') ||
      email.toLowerCase().includes('support') ||
      email.toLowerCase() === '';
    if (isAdminTarget) {
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        await login({ email: email || '', password: password || '' });
        notify({
          type: 'SUCCESS',
          title: 'Administrator Access Granted',
          message: 'Welcome Administrator — No rules enforced on admin login',
        });
        return;
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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
        playSound('error');
        setIsPinErrorShaking(true);
        setTimeout(() => setIsPinErrorShaking(false), 500);
        return;
      }

      setIsSubmitting(true);
      setErrorMessage('');

      try {
        await loginWithPin({ userId: selectedStaffUser.id, pin });
        playSound('success');
        notify({
          type: 'SUCCESS',
          title: 'Station Unlocked',
          message: `Welcome, ${selectedStaffUser.name}`,
        });
      } catch (err: any) {
        playSound('error');
        setIsPinErrorShaking(true);
        setTimeout(() => setIsPinErrorShaking(false), 500);
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
    [enteredPin, selectedStaffUser, loginWithPin, notify, playSound]
  );

  // Keypad Handlers
  const handleKeypadPress = useCallback(
    (num: string) => {
      if (enteredPin.length < 6 && !isSubmitting) {
        playSound('press');
        setPressedKey(num);
        setTimeout(() => setPressedKey(null), 150);
        const newPin = enteredPin + num;
        setEnteredPin(newPin);
        setErrorMessage('');
        if (newPin.length === 6) {
          // Auto-submit when 6th digit is typed
          setTimeout(() => handlePinSubmit(newPin), 80);
        }
      }
    },
    [enteredPin, isSubmitting, playSound, handlePinSubmit]
  );

  const handleKeypadBackspace = useCallback(() => {
    if (enteredPin.length > 0 && !isSubmitting) {
      playSound('backspace');
      setPressedKey('backspace');
      setTimeout(() => setPressedKey(null), 150);
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  }, [enteredPin, isSubmitting, playSound]);

  const handleKeypadClear = useCallback(() => {
    if (!isSubmitting) {
      playSound('clear');
      setPressedKey('clear');
      setTimeout(() => setPressedKey(null), 150);
      setEnteredPin('');
      setErrorMessage('');
    }
  }, [isSubmitting, playSound]);

  // Physical Keyboard Listener for PIN Pad
  useEffect(() => {
    if (selectedRole !== 'STAFF' || !selectedStaffUser || useEmailForStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input or textarea is focused
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

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
  }, [
    selectedRole,
    selectedStaffUser,
    enteredPin,
    useEmailForStaff,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadClear,
    handlePinSubmit,
  ]);

  // Filtered staff list based on search
  const filteredStaff = staffList.filter((s) => {
    const q = staffSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.branchName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col justify-between select-none">
      {/* ==================================================== */}
      {/* END-TO-END WIDE HEADER WITH SINGLE WAVE BOTTOM CURVE */}
      {/* ==================================================== */}
      <div className="w-full relative bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-3 sm:pt-14 sm:pb-12 text-center relative z-10">
          <div className="inline-flex items-center justify-center space-x-2.5 sm:space-x-3.5">
            <img
              src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
              alt="Naisia Textiles Logo"
              className="w-11 h-11 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div className="text-left">
              <h1 className="text-xl sm:text-4xl font-black tracking-tight leading-none text-white drop-shadow-sm">
                Naisiae Textile
              </h1>
              <p className="text-[10px] sm:text-sm text-[#FACB00] font-bold tracking-widest mt-0.5 sm:mt-1 uppercase">
                ENTERPRISE SYSTEM
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
            className="w-full h-7 sm:h-20 md:h-24 block"
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
      <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 -mt-2 sm:-mt-8 md:-mt-10 pb-6 sm:pb-12 z-20 w-full max-w-6xl mx-auto">
        {!selectedRole ? (
          /* ==================================================== */
          /* 1. BIG PORTAL SELECTION BOXES (DEFAULT LANDING)      */
          /* ==================================================== */
          <div className="w-full space-y-3 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-0.5 sm:space-y-1">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Select Your Access Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Tap your designated department below to open the secure login terminal
              </p>
            </div>

            {/* 3 CLEAN INTERACTIVE ROLE BOXES (COMPACT MOBILE APP FIT) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-6 pt-1 sm:pt-2">
              {/* ADMIN BOX */}
              <div
                onClick={() => handleOpenGoogleModal()}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border-2 border-slate-200/90 shadow-xs sm:shadow-md hover:shadow-xl hover:border-[#030A91] hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-blue-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  {/* Mobile Row Header / Desktop Column Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-100 text-[#030A91] flex items-center justify-center shadow-inner group-hover:bg-[#030A91] group-hover:text-[#FACB00] transition-colors shrink-0">
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      {/* Mobile title layout */}
                      <div className="sm:hidden">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded-full bg-blue-100 text-[#030A91]">
                            Governance
                          </span>
                          <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center space-x-1">
                            <GoogleIcon className="w-2.5 h-2.5" />
                            <span>Google</span>
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-[#030A91] transition-colors leading-tight mt-0.5">
                          Administrator
                        </h3>
                      </div>
                    </div>

                    {/* Desktop badge */}
                    <span className="hidden sm:inline-flex items-center space-x-1.5 text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full bg-white text-slate-800 border border-slate-300 shadow-2xs">
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Google Sign-In</span>
                    </span>

                    {/* Mobile 1-Tap Quick Action Pill */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGoogleModal(e);
                      }}
                      className="sm:hidden flex items-center space-x-1.5 text-xs font-black text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs group-hover:bg-[#030A91] group-hover:text-white transition-colors"
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Google</span>
                    </div>
                  </div>

                  {/* Desktop expanded content */}
                  <div className="hidden sm:block mt-4">
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#030A91]">
                      Governance & Security
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 group-hover:text-[#030A91] transition-colors">
                      Administrator
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Multi-branch management, system security & audit logs. One-tap sign in with Google account.
                    </p>
                  </div>
                </div>

                {/* Desktop footer buttons */}
                <div className="hidden sm:flex mt-5 pt-3 border-t border-slate-100 flex-col space-y-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenGoogleModal(e);
                    }}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>{isSubmitting ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoleBox('ADMIN');
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#030A91] hover:underline text-center"
                  >
                    Or sign in with custom credentials &rarr;
                  </button>
                </div>
              </div>

              {/* ACCOUNTANT BOX */}
              <div
                onClick={() => handleSelectRoleBox('ACCOUNTANT')}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border-2 border-slate-200/90 shadow-xs sm:shadow-md hover:shadow-xl hover:border-indigo-600 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 w-20 sm:w-20 h-20 sm:h-20 bg-indigo-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  {/* Mobile Row Header / Desktop Column Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner group-hover:bg-indigo-700 group-hover:text-[#FACB00] transition-colors shrink-0">
                        <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      {/* Mobile title layout */}
                      <div className="sm:hidden">
                        <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                          Finance & Taxes
                        </span>
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight mt-0.5">
                          Accountant
                        </h3>
                      </div>
                    </div>

                    {/* Mobile action pill */}
                    <div className="sm:hidden flex items-center space-x-1 text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-200/60 shadow-2xs group-hover:bg-indigo-700 group-hover:text-white transition-colors">
                      <span>Login</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-700 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Desktop content */}
                  <div className="hidden sm:block mt-4">
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

                {/* Desktop footer */}
                <div className="hidden sm:flex mt-5 pt-3 border-t border-slate-100 items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-900">
                  <span className="group-hover:underline">Finance Login</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-700 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* STAFF / POS CASHIER BOX */}
              <div
                onClick={() => handleSelectRoleBox('STAFF')}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border-2 border-slate-200/90 shadow-xs sm:shadow-md hover:shadow-xl hover:border-emerald-600 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 w-20 sm:w-20 h-20 sm:h-20 bg-emerald-50 rounded-bl-full -z-0 transition-transform group-hover:scale-125"></div>
                <div className="relative z-10">
                  {/* Mobile Row Header / Desktop Column Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner group-hover:bg-emerald-700 group-hover:text-[#FACB00] transition-colors shrink-0">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      {/* Mobile title layout */}
                      <div className="sm:hidden">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                            Retail POS
                          </span>
                          <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            PIN
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight mt-0.5">
                          Staff / POS Cashier
                        </h3>
                      </div>
                    </div>

                    {/* Mobile action pill */}
                    <div className="sm:hidden flex items-center space-x-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 shadow-2xs group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      <span>Enter PIN</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Desktop content */}
                  <div className="hidden sm:block mt-4">
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

                {/* Desktop footer */}
                <div className="hidden sm:flex mt-5 pt-3 border-t border-slate-100 items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
                  <span className="group-hover:underline">Staff PIN Login</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom sign-in option */}
            <div className="text-center pt-1 sm:pt-3">
              <button
                type="button"
                onClick={() => handleSelectRoleBox('CUSTOM')}
                className="text-[11px] sm:text-xs font-bold text-slate-600 hover:text-[#030A91] hover:underline inline-flex items-center space-x-1 p-1.5 sm:p-2 rounded-lg"
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
            /* 2B. ENHANCED POS TERMINAL 6-DIGIT PIN ENTRY PAD */
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 relative">
              {/* Terminal Station Status Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-[#030A91] via-[#0412B3] to-[#0A2076] text-white flex items-center justify-between shadow-inner">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffUser(null);
                      setEnteredPin('');
                      setErrorMessage('');
                    }}
                    className="inline-flex items-center text-xs font-bold text-white/90 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                    title="Change Cashier"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Cashiers</span>
                  </button>

                  <div className="hidden sm:flex items-center space-x-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>POS ONLINE</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Live Clock */}
                  <div className="flex items-center space-x-1 text-[11px] font-mono text-blue-100 bg-white/10 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 text-[#FACB00]" />
                    <span>{currentTime || 'LIVE'}</span>
                  </div>

                  {/* Sound FX Toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((prev) => !prev)}
                    className={`p-1.5 rounded-lg transition-colors text-xs flex items-center ${
                      soundEnabled
                        ? 'bg-[#FACB00] text-[#030A91] font-bold shadow-xs'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                    title={soundEnabled ? 'Keypad sound enabled' : 'Keypad sound muted'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  {/* Terminal Help / Supervisor */}
                  <button
                    type="button"
                    onClick={() => setIsPinHelpModalOpen(true)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    title="PIN Help & Supervisor Override"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {/* Selected Staff Profile Card with Quick Switcher */}
                <div className="relative mb-5 p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/40 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#030A91] to-[#0412B3] text-[#FACB00] flex items-center justify-center font-black text-lg shadow-sm ring-2 ring-[#FACB00]/60 shrink-0">
                          {selectedStaffUser.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {selectedStaffUser.name}
                          </h3>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#030A91] text-[#FACB00] shrink-0">
                            {selectedStaffUser.role || 'CASHIER'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                          <div className="inline-flex items-center space-x-1 text-slate-600 font-medium truncate">
                            <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{selectedStaffUser.branchName}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ID: {selectedStaffUser.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCashierSwitchModalOpen(true)}
                      className="ml-2 px-2.5 py-1.5 text-[11px] font-bold text-[#030A91] bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95 shrink-0 inline-flex items-center space-x-1"
                    >
                      <Users className="w-3 h-3 text-[#030A91]" />
                      <span className="hidden sm:inline">Switch</span>
                    </button>
                  </div>

                  {/* Quick Cashier Avatar Strip if other cashiers exist */}
                  {staffList.filter((s) => s.id !== selectedStaffUser.id).length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Quick switch:
                      </span>
                      <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[240px] py-0.5">
                        {staffList
                          .filter((s) => s.id !== selectedStaffUser.id)
                          .slice(0, 4)
                          .map((cashier) => (
                            <button
                              key={cashier.id}
                              type="button"
                              onClick={() => {
                                setSelectedStaffUser(cashier);
                                setEnteredPin('');
                                setErrorMessage('');
                                playSound('press');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-blue-100/70 border border-slate-200 text-slate-700 hover:text-[#030A91] font-semibold text-[11px] transition-all flex items-center space-x-1 active:scale-95 shrink-0"
                              title={`Switch to ${cashier.name}`}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="max-w-[70px] truncate">{cashier.name.split(' ')[0]}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake shadow-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div className="flex-1">
                      <p className="font-semibold">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => setIsPinHelpModalOpen(true)}
                        className="text-rose-700 underline text-[11px] font-bold mt-0.5 inline-block hover:text-rose-900"
                      >
                        Need manager override or forgot PIN?
                      </button>
                    </div>
                  </div>
                )}

                {/* 6 Digit PIN Display Cells */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                      <KeyRound className="w-3.5 h-3.5 text-[#030A91]" />
                      <span>Security PIN ({enteredPin.length}/6)</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="text-[11px] font-bold text-slate-600 hover:text-[#030A91] inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title={showPin ? 'Hide PIN digits' : 'Peek PIN digits'}
                    >
                      {showPin ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Peek</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 6 Cells */}
                  <div
                    className={`flex items-center justify-center space-x-2.5 sm:space-x-3.5 py-1 ${
                      isPinErrorShaking ? 'animate-shake' : ''
                    }`}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const isFilled = index < enteredPin.length;
                      const isCurrent = index === enteredPin.length;
                      const digitChar = enteredPin[index];

                      return (
                        <div
                          key={index}
                          className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl transition-all duration-150 relative ${
                            isPinErrorShaking
                              ? 'border-2 border-rose-400 bg-rose-50 text-rose-700'
                              : isFilled
                              ? 'border-2 border-[#030A91] bg-blue-50/80 text-[#030A91] shadow-xs scale-100'
                              : isCurrent
                              ? 'border-2 border-[#FACB00] bg-amber-50/40 shadow-sm ring-4 ring-[#FACB00]/30'
                              : 'border-2 border-slate-200 bg-slate-50 text-slate-300'
                          }`}
                        >
                          {isFilled ? (
                            showPin ? (
                              <span className="animate-in zoom-in-75 duration-100">{digitChar}</span>
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full bg-[#030A91] ring-2 ring-[#FACB00] shadow-2xs animate-in zoom-in-50 duration-100" />
                            )
                          ) : isCurrent ? (
                            <span className="w-0.5 h-5 bg-[#FACB00] animate-pulse" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tactile Hardware-Style Keypad */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto mb-4">
                  {[
                    { digit: '1', sub: ' ' },
                    { digit: '2', sub: 'ABC' },
                    { digit: '3', sub: 'DEF' },
                    { digit: '4', sub: 'GHI' },
                    { digit: '5', sub: 'JKL' },
                    { digit: '6', sub: 'MNO' },
                    { digit: '7', sub: 'PQRS' },
                    { digit: '8', sub: 'TUV' },
                    { digit: '9', sub: 'WXYZ' },
                  ].map(({ digit, sub }) => {
                    const isPressed = pressedKey === digit;
                    return (
                      <button
                        key={digit}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleKeypadPress(digit)}
                        className={`h-13 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 select-none shadow-2xs active:scale-95 disabled:opacity-50 ${
                          isPressed
                            ? 'bg-[#030A91] text-[#FACB00] scale-95 ring-2 ring-[#FACB00]'
                            : 'bg-slate-100 hover:bg-[#030A91] hover:text-[#FACB00] text-slate-800'
                        }`}
                      >
                        <span className="font-black text-xl leading-none">{digit}</span>
                        {sub.trim() ? (
                          <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
                            {sub}
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-0 mt-0.5">-</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Clear Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || enteredPin.length === 0}
                    onClick={handleKeypadClear}
                    className={`h-13 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40 select-none ${
                      pressedKey === 'clear'
                        ? 'bg-rose-600 text-white scale-95'
                        : 'bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500'
                    }`}
                  >
                    <X className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Clear</span>
                  </button>

                  {/* 0 Button */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleKeypadPress('0')}
                    className={`h-13 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 select-none shadow-2xs active:scale-95 disabled:opacity-50 ${
                      pressedKey === '0'
                        ? 'bg-[#030A91] text-[#FACB00] scale-95 ring-2 ring-[#FACB00]'
                        : 'bg-slate-100 hover:bg-[#030A91] hover:text-[#FACB00] text-slate-800'
                    }`}
                  >
                    <span className="font-black text-xl leading-none">0</span>
                    <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">+</span>
                  </button>

                  {/* Backspace Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || enteredPin.length === 0}
                    onClick={handleKeypadBackspace}
                    className={`h-13 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40 select-none ${
                      pressedKey === 'backspace'
                        ? 'bg-amber-500 text-white scale-95'
                        : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600'
                    }`}
                  >
                    <Delete className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Delete</span>
                  </button>
                </div>

                {/* Primary Unlock Action */}
                <button
                  type="button"
                  disabled={isSubmitting || enteredPin.length !== 6}
                  onClick={() => handlePinSubmit()}
                  className="w-full py-3.5 bg-gradient-to-r from-[#030A91] to-[#0412B3] text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center space-x-2 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-[#FACB00] animate-spin" />
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock POS Terminal</span>
                      <ArrowRight className="w-4 h-4 text-[#FACB00]" />
                    </>
                  )}
                </button>

                {/* Demo Helper & PIN Hint Footer Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">
                      Hint:{' '}
                      <strong className="text-slate-800 font-mono">
                        {selectedStaffUser.pinHint || `${getDemoPinForUser(selectedStaffUser).slice(0, 2)}••${getDemoPinForUser(selectedStaffUser).slice(-2)}`}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const demoPin = getDemoPinForUser(selectedStaffUser);
                        setEnteredPin(demoPin);
                        playSound('press');
                        handlePinSubmit(demoPin);
                      }}
                      className="text-[11px] font-black text-[#030A91] hover:underline px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 hover:bg-blue-100 active:scale-95 transition-all"
                    >
                      Auto-Fill ({getDemoPinForUser(selectedStaffUser)})
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Cashier Switch Modal */}
              {isCashierSwitchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#030A91]" />
                        <h4 className="font-black text-sm text-slate-900">Switch POS Cashier</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCashierSwitchModalOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 mb-3">
                      Select the cashier currently logging into this terminal station:
                    </p>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {staffList.map((cashier) => {
                        const isCurrent = cashier.id === selectedStaffUser.id;
                        return (
                          <button
                            key={cashier.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffUser(cashier);
                              setEnteredPin('');
                              setErrorMessage('');
                              setIsCashierSwitchModalOpen(false);
                              playSound('press');
                            }}
                            className={`w-full p-2.5 rounded-xl border flex items-center space-x-3 text-left transition-all ${
                              isCurrent
                                ? 'border-[#030A91] bg-blue-50/60 ring-2 ring-[#030A91]/20'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-[#030A91] text-[#FACB00] flex items-center justify-center font-bold text-xs shrink-0">
                              {cashier.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-slate-900 block truncate">
                                {cashier.name}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {cashier.branchName} • PIN {cashier.pinHint || 'Active'}
                              </span>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="w-4 h-4 text-[#030A91] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PIN Assistance & Supervisor Override Modal */}
              {isPinHelpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                        <h4 className="font-black text-sm text-slate-900">PIN & Terminal Help</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPinHelpModalOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="py-3 text-xs text-slate-600 space-y-2.5">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <strong className="text-amber-900 block mb-1">Forgot or Lost Cashier PIN?</strong>
                        <p className="text-amber-800">
                          Branch Managers and Administrators can update or reset any staff member's 6-digit PIN in the <strong>Staff & Users</strong> section.
                        </p>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <strong className="text-[#030A91] block mb-1">Supervisor Direct Login:</strong>
                        <p className="text-blue-900">
                          Administrators and Accountants can log in directly using email and password with zero restrictions.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinHelpModalOpen(false);
                            handleSelectRoleBox('ADMIN');
                          }}
                          className="mt-2 text-xs font-bold text-white bg-[#030A91] hover:bg-blue-900 px-3 py-1.5 rounded-lg inline-flex items-center space-x-1"
                        >
                          <span>Go to Administrator Login</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#FACB00]" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 pt-1">
                        Active Cashier: <strong>{selectedStaffUser.name}</strong> • PIN Hint:{' '}
                        <strong>{selectedStaffUser.pinHint || '33••33'}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsPinHelpModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

              {selectedRole === 'ADMIN' && (
                <div className="mb-4 space-y-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleOpenGoogleModal()}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2.5 shadow-xs transition-all active:scale-98"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>Sign in with Google (Administrator)</span>
                  </button>
                  <div className="flex items-center my-3">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or sign in with password</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Staff Username / Name
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Secure Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setResetStep("EMAIL");
                          setIsResetModalOpen(true);
                        }}
                        className="text-xs font-bold text-[#030A91] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    {selectedRole === 'ADMIN' && (
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Optional (No Rules)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={selectedRole === 'ADMIN' ? 'Optional (No rules enforced)' : '••••••••••••'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                      required={selectedRole !== 'ADMIN'}
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
                      : selectedRole === 'ADMIN'
                      ? '⚡ Enter Admin Workspace (No Rules Enforced)'
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
              Naisia Textiles •  • Tel: 0792021496 / 0112264870 • Uhuru Market, Nairobi
            </div>
          </div>
        )}

        {/* GOOGLE SIGN IN MODAL FOR ADMINISTRATOR */}
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center p-1.5">
                    <GoogleIcon className="w-full h-full" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                      Sign in with Google
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Administrator Access • Naisia Textiles ERP
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  Choose a Google Account to sign in as System Administrator:
                </p>

                {/* Account Option 1: Optimum Engineering */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleGoogleLogin('', 'Optimum Engineering')}
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-[#030A91] hover:bg-blue-50/40 transition-all text-left flex items-center justify-between group active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white">
                      O
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#030A91] truncate">
                          Optimum Engineering
                        </h4>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Primary Admin
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#030A91] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Account Option 2: Naisia Textiles */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleGoogleLogin('', 'Naisia Textiles Admin')}
                  className="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-left flex items-center justify-between group active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white">
                      N
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 truncate">
                          Naisia Textiles Workspace
                        </h4>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Owner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Custom Google Account Section */}
                <div className="pt-2">
                  {!showCustomGoogleInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(true)}
                      className="text-[11px] font-bold text-slate-600 hover:text-[#030A91] hover:underline flex items-center space-x-1"
                    >
                      <span>+ Use another Google Account</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Enter Google Email:
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="email"
                          value={customGoogleEmail}
                          onChange={(e) => setCustomGoogleEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                        />
                        <button
                          type="button"
                          disabled={isSubmitting || !customGoogleEmail.includes('@')}
                          onClick={() => handleGoogleLogin(customGoogleEmail)}
                          className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 disabled:opacity-50"
                        >
                          Sign In
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Identity Verified</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleModalOpen(false);
                    handleSelectRoleBox('ADMIN');
                  }}
                  className="text-slate-600 hover:text-[#030A91] font-bold underline"
                >
                  Use password instead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* GLOBAL FOOTER (MUTED GREY BACKGROUND)               */}
      {/* ==================================================== */}
      <footer className="w-full relative mt-auto leading-none select-none bg-slate-200 border-t border-slate-300">
        {/* SINGLE CURVE TOP EDGE WITH GOLD ACCENT */}
        <div className="w-full leading-none overflow-hidden select-none -mb-[1px]">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-4 sm:h-8 md:h-10 block"
            preserveAspectRatio="none"
          >
            {/* Subtle Golden Accent Curve behind */}
            <path
              d="M0,45 C380,-10 1060,55 1440,15 L1440,60 L0,60 Z"
              fill="#FACB00"
              fillOpacity="0.4"
            />
            {/* Primary Footer Grey Wave cut */}
            <path
              d="M0,52 C400,2 1040,63 1440,25 L1440,60 L0,60 Z"
              fill="#E2E8F0"
            />
          </svg>
        </div>

        {/* Grey Footer Content */}
        <div className="bg-slate-200 text-slate-700 py-3 sm:py-4 px-4 text-center border-t border-slate-300/70">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-slate-700 gap-1.5 sm:gap-4">
            <p className="font-medium">
              &copy; {new Date().getFullYear()} <strong className="text-slate-900 font-bold">Naisia Textiles Ltd</strong>. All rights reserved.
            </p>
            <p className="text-slate-600 font-mono text-[10px] sm:text-xs font-medium">
              naisiaetextiles.com • Tel: 0792021496 / 0112264870 • Uhuru Market, Nairobi
            </p>
          </div>
        </div>
      </footer>
    
      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#030A91] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500">
                  {resetStep === "EMAIL" ? "Enter your email to receive a 6-digit code" : "Enter verification code & new password"}
                </p>
              </div>
            </div>

            {resetStep === "EMAIL" ? (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. admin@naisiaetextiles.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full py-3 bg-[#030A91] text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-blue-900 transition-all shadow-md disabled:opacity-50"
                >
                  <span>{isResetSubmitting ? "Sending Code..." : "Send 6-Digit Reset Code"}</span>
                  <ArrowRight className="w-4 h-4 text-[#FACB00]" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                {devResetCode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <span className="font-bold">Development Verification Code:</span> <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">{devResetCode}</code>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep("EMAIL")}
                    className="w-1/3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="w-2/3 py-2.5 bg-[#030A91] text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-blue-900 transition-all shadow-md disabled:opacity-50"
                  >
                    <span>{isResetSubmitting ? "Resetting..." : "Reset Password"}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
</div>
  );
};
