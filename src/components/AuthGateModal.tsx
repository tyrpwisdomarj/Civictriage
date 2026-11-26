import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Cloud,
  Compass,
  GraduationCap,
  HeartPulse,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Shield,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { KERALA_DISTRICTS } from '../data/keralaMapData';
import {
  ACADEMIC_STREAM_OPTIONS,
  getAvatarInitials,
  type UserProfile,
  type UserRole,
} from '../shared/authSchema';
import type {
  AuthModalMode,
  SignUpInput,
  UpdateProfileInput,
} from '../hooks/useUserVaultAuth';

interface AuthGateModalProps {
  open: boolean;
  mode: AuthModalMode;
  activeUser: UserProfile | null;
  savedAccounts: UserProfile[];
  busy: boolean;
  error: string | null;
  cloudSyncEnabled: boolean;
  onModeChange: (mode: AuthModalMode) => void;
  onClose: () => void;
  onSignInGoogle: () => Promise<boolean>;
  onSignInEmail: (email: string, password: string) => Promise<boolean>;
  onSignUpEmail: (input: SignUpInput) => Promise<boolean>;
  onContinueAsGuest: () => void;
  onUpdateProfile: (input: UpdateProfileInput) => Promise<boolean>;
  onSignOut: () => Promise<void>;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  open,
  mode,
  activeUser,
  savedAccounts,
  busy,
  error,
  cloudSyncEnabled,
  onModeChange,
  onClose,
  onSignInGoogle,
  onSignInEmail,
  onSignUpEmail,
  onContinueAsGuest,
  onUpdateProfile,
  onSignOut,
}) => {
  const isFirstLaunchGate = !activeUser;

  // Sign In form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Create Account / Edit Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [homeDistrictId, setHomeDistrictId] = useState('pathanamthitta');
  const [role, setRole] = useState<UserRole>('Citizen');
  const [abhaHealthId, setAbhaHealthId] = useState('');
  const [academicStream, setAcademicStream] = useState<string>(ACADEMIC_STREAM_OPTIONS[0]);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProfileSavedToast(false);
    if (mode === 'profile' && activeUser) {
      setFullName(activeUser.fullName);
      setEmail(activeUser.email);
      setHomeDistrictId(activeUser.homeDistrictId || 'pathanamthitta');
      setRole(activeUser.role);
      setAbhaHealthId(activeUser.abhaHealthId || '');
      setAcademicStream(activeUser.academicStream || ACADEMIC_STREAM_OPTIONS[0]);
    } else if (mode === 'signup') {
      setFullName('');
      setEmail('');
      setPassword('');
      setHomeDistrictId('pathanamthitta');
      setRole('Citizen');
      setAbhaHealthId('');
      setAcademicStream(ACADEMIC_STREAM_OPTIONS[0]);
    }
  }, [open, mode, activeUser]);

  useEffect(() => {
    if (!open || isFirstLaunchGate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, isFirstLaunchGate, onClose]);

  const resolveDistrictLabel = (id: string) => {
    const found = KERALA_DISTRICTS.find((d) => d.id === id);
    return found ? `${found.name}, Kerala` : 'Pathanamthitta, Kerala';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSignInEmail(loginEmail, loginPassword);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSignUpEmail({
      fullName,
      email,
      password,
      homeDistrictId,
      homeDistrictName: resolveDistrictLabel(homeDistrictId),
      role,
      abhaHealthId,
      academicStream,
    });
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onUpdateProfile({
      fullName,
      homeDistrictId,
      homeDistrictName: resolveDistrictLabel(homeDistrictId),
      role,
      abhaHealthId,
      academicStream,
    });
    if (ok) {
      setProfileSavedToast(true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-gate-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="CivicTriage LSG Account Access"
        >
          {/* Backdrop */}
          <div
            className={`fixed inset-0 ${
              isFirstLaunchGate
                ? 'bg-[#EAE8E4]/90 dark:bg-[#0A0D14]/92 backdrop-blur-2xl'
                : 'bg-black/35 backdrop-blur-md'
            }`}
            onClick={() => {
              if (!isFirstLaunchGate) onClose();
            }}
          />

          {/* Ambient Liquid Glass Orbs on First-Launch Gate */}
          {isFirstLaunchGate && (
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -top-24 -left-16 w-[420px] h-[420px] rounded-full bg-[#4F5BD5]/28 blur-[110px]" />
              <div className="absolute bottom-[-10%] right-[-5%] w-[460px] h-[460px] rounded-full bg-cyan-400/20 dark:bg-[#8E96FF]/20 blur-[120px]" />
            </div>
          )}

          {/* Liquid Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative z-10 w-full max-w-xl my-auto rounded-[32px] bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl backdrop-saturate-[180%] border border-white/90 dark:border-white/15 shadow-[0_32px_90px_rgba(17,19,21,0.22)] overflow-hidden"
          >
            {/* Header Strip */}
            <div className="px-6 pt-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#111315] dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-lg shadow-black/15 shrink-0">
                  <Sparkles className="w-5 h-5 text-[#8E96FF] dark:text-[#4F5BD5]" />
                </span>
                <div>
                  <h2
                    className="text-lg sm:text-xl font-extrabold tracking-tight text-[#111315] dark:text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {mode === 'profile'
                      ? 'Citizen Profile & Vault'
                      : mode === 'signup'
                        ? 'Create CivicTriage Account'
                        : 'Sign in to CivicTriage LSG'}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Per-user isolated civic tickets, QR passes, OP slips, study plans &amp; autofill vault
                  </p>
                </div>
              </div>

              {!isFirstLaunchGate && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close account modal"
                  className="p-2 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Segmented Mode Switcher */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#EFECE8]/90 dark:bg-slate-950/70 border border-black/5 dark:border-white/10">
                {activeUser && (
                  <button
                    type="button"
                    onClick={() => onModeChange('profile')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mode === 'profile'
                        ? 'bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    My Profile
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onModeChange('signin')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('signup')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create Account
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[72vh] overflow-y-auto space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {profileSavedToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Profile updated! Your autofills across Hospitals, Admissions, Police &amp; AI Co-Pilot are synced.
                </div>
              )}

              {/* Google + Guest Quick Actions (shown in Sign In & Create Account tabs) */}
              {mode !== 'profile' && (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onSignInGoogle()}
                    data-testid="auth-google-btn"
                    className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/90 border border-black/10 dark:border-white/15 text-sm font-bold text-[#111315] dark:text-white shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3a7.17 7.17 0 0 1-10.67-3.77H1.4v3.1A12 12 0 0 0 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.39 14.33a7.21 7.21 0 0 1 0-4.66v-3.1H1.4a12 12 0 0 0 0 10.86l3.99-3.1Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.4 6.57l3.99 3.1A7.16 7.16 0 0 1 12 4.75Z"
                      />
                    </svg>
                    <span>Sign in with Google (Cloud Sync Vault)</span>
                  </button>

                  <div className="relative flex items-center justify-center py-1">
                    <div className="w-full border-t border-black/8 dark:border-white/10" />
                    <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white/80 dark:bg-slate-900/85 shrink-0">
                      or with Email Vault
                    </span>
                    <div className="w-full border-t border-black/8 dark:border-white/10" />
                  </div>
                </div>
              )}

              {/* SIGN IN TAB */}
              {mode === 'signin' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  {savedAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                        Saved Accounts on This Device
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {savedAccounts.slice(0, 4).map((acct) => (
                          <button
                            key={acct.userId}
                            type="button"
                            onClick={() => {
                              if (acct.authProvider === 'google') {
                                void onSignInGoogle();
                              } else {
                                setLoginEmail(acct.email);
                              }
                            }}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-left transition-all cursor-pointer"
                          >
                            <span className="w-8 h-8 rounded-xl bg-[#4F5BD5]/15 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC] font-extrabold text-xs flex items-center justify-center shrink-0">
                              {getAvatarInitials(acct.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#111315] dark:text-white truncate">
                                {acct.fullName}
                              </p>
                              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                                {acct.authProvider === 'google' ? 'Google Sync' : acct.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="citizen@kerala.in"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="auth-signin-submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#111315] dark:bg-[#8E96FF] text-white dark:text-slate-950 text-sm font-bold shadow-lg shadow-black/15 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    Sign In &amp; Open My Isolated Vault
                  </button>
                </form>
              )}

              {/* CREATE ACCOUNT TAB */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Arjit Anil"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Password (min 6 chars) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Home District / City
                      </label>
                      <select
                        value={homeDistrictId}
                        onChange={(e) => setHomeDistrictId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      >
                        {KERALA_DISTRICTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}, Kerala
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Account Role
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['Citizen', 'LSG / Police Officer'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                            role === r
                              ? 'bg-[#4F5BD5]/15 dark:bg-[#8E96FF]/20 border-[#4F5BD5] dark:border-[#8E96FF] text-[#4F5BD5] dark:text-[#A5B4FC]'
                              : 'bg-[#EFECE8]/70 dark:bg-slate-800/60 border-black/8 dark:border-white/10 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {r === 'Citizen' ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Smart Autofill Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        ABHA Health ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={abhaHealthId}
                        onChange={(e) => setAbhaHealthId(e.target.value)}
                        placeholder="91-XXXX-XXXX-XXXX"
                        className="w-full px-3.5 py-2 rounded-2xl bg-[#EFECE8]/70 dark:bg-slate-800/70 border border-black/8 dark:border-white/12 text-xs text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                        Academic Stream (Optional)
                      </label>
                      <select
                        value={academicStream}
                        onChange={(e) => setAcademicStream(e.target.value)}
                        className="w-full px-3 py-2 rounded-2xl bg-[#EFECE8]/70 dark:bg-slate-800/70 border border-black/8 dark:border-white/12 text-xs text-[#111315] dark:text-white focus:outline-none focus:border-[#4F5BD5]"
                      >
                        {ACADEMIC_STREAM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="auth-signup-submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#111315] dark:bg-[#8E96FF] text-white dark:text-slate-950 text-sm font-bold shadow-lg shadow-black/15 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Create Account &amp; Initialize Personal Vault
                  </button>
                </form>
              )}

              {/* EDIT PROFILE TAB */}
              {mode === 'profile' && activeUser && (
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/70 border border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-2xl bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {getAvatarInitials(activeUser.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#111315] dark:text-white truncate">
                          {activeUser.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {activeUser.email}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC] shrink-0">
                      <Cloud className="w-3 h-3" />
                      {cloudSyncEnabled
                        ? 'Firestore Sync'
                        : activeUser.authProvider === 'guest'
                          ? 'Guest Vault'
                          : 'Isolated Vault'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-[#4F5BD5]" />
                        Home District
                      </label>
                      <select
                        value={homeDistrictId}
                        onChange={(e) => setHomeDistrictId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-sm text-[#111315] dark:text-white"
                      >
                        {KERALA_DISTRICTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}, Kerala
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {(['Citizen', 'LSG / Police Officer'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          role === r
                            ? 'bg-[#4F5BD5]/15 dark:bg-[#8E96FF]/20 border-[#4F5BD5] dark:border-[#8E96FF] text-[#4F5BD5] dark:text-[#A5B4FC]'
                            : 'bg-[#EFECE8]/70 dark:bg-slate-800/60 border-black/8 dark:border-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        ABHA Health ID (Hospital OP Autofill)
                      </label>
                      <input
                        type="text"
                        value={abhaHealthId}
                        onChange={(e) => setAbhaHealthId(e.target.value)}
                        placeholder="91-XXXX-XXXX-XXXX"
                        className="w-full px-3.5 py-2 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-xs text-[#111315] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Academic Stream (Admissions Autofill)
                      </label>
                      <select
                        value={academicStream}
                        onChange={(e) => setAcademicStream(e.target.value)}
                        className="w-full px-3 py-2 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/80 border border-black/8 dark:border-white/12 text-xs text-[#111315] dark:text-white"
                      >
                        {ACADEMIC_STREAM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#111315] dark:bg-[#8E96FF] text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-95 cursor-pointer"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Save Profile &amp; Autofills
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSignOut()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-500/12 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-xs font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </form>
              )}

              {/* One-Click Guest Access Footer */}
              {mode !== 'profile' && (
                <div className="pt-3 border-t border-black/6 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Compass className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF] shrink-0" />
                    <span>Evaluating for a demo? Jump straight in with isolated guest storage.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    data-testid="auth-guest-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/18 hover:bg-[#4F5BD5]/20 dark:hover:bg-[#8E96FF]/28 text-[#4F5BD5] dark:text-[#A5B4FC] border border-[#4F5BD5]/25 dark:border-[#8E96FF]/30 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Continue as Guest / Demo Citizen
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
