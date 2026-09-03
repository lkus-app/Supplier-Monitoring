import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  LogIn, 
  KeyRound, 
  User, 
  AlertCircle, 
  ShieldCheck, 
  ClipboardCheck, 
  HardHat, 
  BarChart3
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { RoleType } from '../types';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalRole, 
    loginWithCredentials 
  } = useWarehouse();

  const [selectedRole, setSelectedRole] = useState<RoleType>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authModalRole) {
      setSelectedRole(authModalRole);
      if (authModalRole === 'operator' || authModalRole === 'admin') {
        setLoginMethod('pin');
      } else {
        setLoginMethod('password');
      }
      setUsername('');
      setPassword('');
      setPin('');
      setErrorMessage('');
    }
  }, [authModalRole, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleRoleTabChange = (role: RoleType) => {
    setSelectedRole(role);
    setErrorMessage('');
    setUsername('');
    setPassword('');
    setPin('');
    if (role === 'operator' || role === 'admin') {
      setLoginMethod('pin');
    } else {
      setLoginMethod('password');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      let result;
      if ((selectedRole === 'operator' || selectedRole === 'admin') && loginMethod === 'pin') {
        result = loginWithCredentials(selectedRole, selectedRole, pin);
      } else {
        result = loginWithCredentials(selectedRole, username, password);
      }

      setIsSubmitting(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Username, password, atau PIN yang dimasukkan tidak sesuai.');
      }
    }, 200);
  };

  const roleMeta: Record<RoleType, { title: string; desc: string; icon: React.ReactNode; color: string }> = {
    security: {
      title: 'Pos Security',
      desc: 'Akses pos tanpa autentikasi sandi',
      icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
      color: 'blue'
    },
    admin: {
      title: 'Admin Gudang',
      desc: 'Verifikasi Surat Jalan & PO PPIC',
      icon: <ClipboardCheck className="w-5 h-5 text-orange-600" />,
      color: 'orange'
    },
    operator: {
      title: 'Operator Dock',
      desc: 'Kru Loading Dock & Eksekusi Bongkar',
      icon: <HardHat className="w-5 h-5 text-purple-600" />,
      color: 'purple'
    },
    spv: {
      title: 'SPV / Super Admin',
      desc: 'Control Tower & Laporan Analytics',
      icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
      color: 'emerald'
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="auth-modal-card"
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Autentikasi Akses Stasiun Kerja</h3>
              <p className="text-xs text-slate-500">Masuk untuk mengelola proses bongkaran</p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleRoleTabChange('admin')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              selectedRole === 'admin' 
                ? 'bg-white text-orange-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleTabChange('operator')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              selectedRole === 'operator' 
                ? 'bg-white text-purple-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>Operator</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleTabChange('spv')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
              selectedRole === 'spv' 
                ? 'bg-white text-emerald-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>SPV / Lead</span>
          </button>
        </div>

        {/* Active Role Info Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
            {roleMeta[selectedRole].icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">{roleMeta[selectedRole].title}</h4>
            <p className="text-[11px] text-slate-500 truncate">{roleMeta[selectedRole].desc}</p>
          </div>
        </div>

        {/* Form Error */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin & Operator Choice: PIN vs Password */}
          {(selectedRole === 'operator' || selectedRole === 'admin') && (
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs">
              <span className="text-slate-600 font-semibold">Metode Masuk:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('pin'); setErrorMessage(''); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition ${
                    loginMethod === 'pin' 
                      ? selectedRole === 'admin' ? 'bg-orange-600 text-white' : 'bg-purple-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  PIN Cepat
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setErrorMessage(''); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition ${
                    loginMethod === 'password' 
                      ? selectedRole === 'admin' ? 'bg-orange-600 text-white' : 'bg-purple-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  User &amp; Sandi
                </button>
              </div>
            </div>
          )}

          {(selectedRole === 'operator' || selectedRole === 'admin') && loginMethod === 'pin' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {selectedRole === 'admin' ? 'PIN Cepat Admin Gudang' : 'PIN Akses Operator Loading Dock'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan 6 digit PIN"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-mono tracking-widest focus:outline-none focus:bg-white ${
                    selectedRole === 'admin' ? 'focus:ring-2 focus:ring-orange-500' : 'focus:ring-2 focus:ring-purple-500'
                  }`}
                  required
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={closeAuthModal}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-auth-submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk Panel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
