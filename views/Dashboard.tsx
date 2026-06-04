

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, BottomSheet, Input, Button } from '../components/UI';
import { formatCurrency, formatDate } from '../utils';
import { 
  TrendingUp, Activity, ArrowRight, User as UserIcon, LogOut, Settings, Wifi, Target, CheckCircle, Clock, History
} from 'lucide-react';
import { ItemStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { spks, navigate, isAuthenticated, user, login, logout, updateAccount, showNotification } = useAppStore();
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

  // Login Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Settings Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSettingsMode, setIsSettingsMode] = useState(false);

  // --- NEW LOGIC: Production Monitoring ---
  // Filter SPK Aktif: SPK yang total completed < total qty
  const activeSPKs = spks.filter(spk => {
    const totalCompletedInSpk = spk.items.reduce((sum, item) => sum + (item.completedQty || 0), 0);
    return totalCompletedInSpk < spk.totalQty;
  });

  // Calculate Metrics from Active SPKs
  const totalTargetActive = activeSPKs.reduce((acc, spk) => acc + spk.totalQty, 0);
  
  const totalCompletedActive = activeSPKs.reduce((acc, spk) => {
     const spkCompleted = spk.items.reduce((sum, item) => sum + (item.completedQty || 0), 0);
     return acc + spkCompleted;
  }, 0);

  const totalRemainingActive = totalTargetActive - totalCompletedActive;
  const progressPercent = totalTargetActive > 0 ? (totalCompletedActive / totalTargetActive) * 100 : 0;
  
  const recentSPKs = spks.slice(0, 3);

  const handleOpenAuth = () => {
    setIsAuthSheetOpen(true);
    // Reset states
    setLoginUser('');
    setLoginPass('');
    setNewUsername(user.username);
    setNewPassword(user.password);
    setIsSettingsMode(false);
    setIsLoggingIn(false);
  };

  const handleLogin = async () => {
    if (!loginUser.trim() || !loginPass.trim()) {
        showNotification('Email dan Password wajib diisi', 'warning');
        return;
    }

    setIsLoggingIn(true);
    try {
        const success = await login(loginUser, loginPass);
        if (success) setIsAuthSheetOpen(false);
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleUpdateAccount = () => {
    updateAccount(newUsername, newPassword);
    setIsSettingsMode(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          {/* LOGO REPLACEMENT */}
          <img 
            src="https://lh3.googleusercontent.com/d/16TbJmSBwcJkzgYYKh_EM9jyislTE8Ylz" 
            alt="SPINER" 
            className="h-10 object-contain mb-1"
          />
          <p className="text-slate-400 text-sm">
            {isAuthenticated ? `Halo, ${user.username}` : 'Mode Tamu (Hanya Lihat)'}
          </p>
        </div>
        <button 
          onClick={handleOpenAuth}
          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95 ${
            isAuthenticated 
            ? 'bg-gradient-to-br from-primary to-accent text-white shadow-primary/20' 
            : 'bg-slate-700 text-slate-300'
          }`}
        >
          <UserIcon size={20} />
        </button>
      </header>

      {/* Production Monitoring Hero Card */}
      <Card className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 border-indigo-500/20 shadow-2xl overflow-hidden relative">
          <div className="relative z-10">
              {/* Header Card */}
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                          <Activity className="text-indigo-400" size={18} />
                      </div>
                      <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Monitor Produksi</h3>
                  </div>
                  <div className="px-2 py-1 bg-white/5 rounded-md border border-white/5">
                      <span className="text-[10px] text-slate-400">{activeSPKs.length} SPK Aktif</span>
                  </div>
              </div>

              {/* Big Stats: Remaining */}
              <div className="text-center py-2">
                  <p className="text-slate-400 text-xs font-medium mb-1 flex items-center justify-center gap-1">
                      <Clock size={12} /> Sisa Produksi (Pending)
                  </p>
                  <h2 className="text-5xl font-bold text-white tracking-tighter drop-shadow-lg">
                      {totalRemainingActive}
                      <span className="text-lg text-slate-500 font-medium ml-2">Pcs</span>
                  </h2>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 mb-6">
                  <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400 font-medium">Progres Keseluruhan</span>
                      <span className="text-white font-bold">{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
                      <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${progressPercent}%` }}
                      />
                  </div>
              </div>

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div className="flex flex-col items-center border-r border-white/10 pr-2">
                       <div className="flex items-center gap-1.5 mb-1">
                           <Target size={14} className="text-slate-400" />
                           <p className="text-xs text-slate-400 font-bold uppercase">Total Target</p>
                       </div>
                       <p className="text-xl font-bold text-white">{totalTargetActive}</p>
                  </div>
                  <div className="flex flex-col items-center pl-2">
                       <div className="flex items-center gap-1.5 mb-1">
                           <CheckCircle size={14} className="text-emerald-400" />
                           <p className="text-xs text-emerald-400/80 font-bold uppercase">Sudah Masuk</p>
                       </div>
                       <p className="text-xl font-bold text-emerald-400">+{totalCompletedActive}</p>
                  </div>
              </div>
          </div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
      </Card>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">SPK Terbaru</h3>
          <button 
            onClick={() => navigate('SPK_LIST')} 
            className="text-primary text-sm flex items-center gap-1 hover:text-primary-glow"
          >
            Lihat Semua <ArrowRight size={14} />
          </button>
        </div>
        
        <div className="space-y-3">
          {recentSPKs.map(spk => (
            <Card key={spk.id} onClick={() => navigate('SPK_LIST')} className="flex justify-between items-center active:bg-slate-800 transition-colors">
              <div>
                <p className="font-semibold text-white">{spk.spkNumber}</p>
                <p className="text-xs text-slate-400">{formatDate(spk.date)} • {spk.items.length} Item</p>
              </div>
              <div className="text-right">
                 <div className="bg-white/5 px-2 py-1 rounded text-xs font-mono text-slate-300">
                    {spk.totalQty} Pcs
                 </div>
              </div>
            </Card>
          ))}
          {recentSPKs.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">Belum ada data SPK</div>
          )}
        </div>
      </div>

      {/* Auth Bottom Sheet */}
      <BottomSheet
        isOpen={isAuthSheetOpen}
        onClose={() => setIsAuthSheetOpen(false)}
        title={isAuthenticated ? (isSettingsMode ? 'Pengaturan Akun' : 'Profil Saya') : 'Login Aplikasi'}
      >
        <div className="space-y-4 pb-4">
            {!isAuthenticated ? (
                <>
                    <div className="flex justify-center mb-4">
                        <img 
                          src="https://lh3.googleusercontent.com/d/16TbJmSBwcJkzgYYKh_EM9jyislTE8Ylz" 
                          alt="SPINER" 
                          className="h-12 object-contain"
                        />
                    </div>
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl mb-4">
                        <p className="text-xs text-primary text-center">Login untuk mengelola data (Tambah, Edit, Hapus).</p>
                    </div>
                    <Input 
                        label="Email / Username" 
                        value={loginUser} 
                        onChange={e => setLoginUser(e.target.value)} 
                        placeholder="Masukkan email"
                    />
                    <Input 
                        label="Password" 
                        type="password"
                        value={loginPass} 
                        onChange={e => setLoginPass(e.target.value)} 
                        placeholder="Masukkan password"
                    />
                    <Button fullWidth onClick={handleLogin} isLoading={isLoggingIn}>
                        {isLoggingIn ? 'Memproses...' : 'Masuk'}
                    </Button>
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                        <Wifi size={14} />
                        <p>Pastikan terhubung internet</p>
                    </div>
                </>
            ) : isSettingsMode ? (
                <>
                    <Input 
                        label="Username Baru" 
                        value={newUsername} 
                        onChange={e => setNewUsername(e.target.value)} 
                    />
                    <Input 
                        label="Password Baru" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        type="password"
                    />
                    <div className="flex gap-2">
                        <Button fullWidth variant="secondary" onClick={() => setIsSettingsMode(false)}>Batal</Button>
                        <Button fullWidth onClick={handleUpdateAccount}>Simpan</Button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white shadow-xl mb-2">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold text-white">{user.username}</h3>
                    <div className="w-full flex flex-col gap-3 mt-4">
                        <Button fullWidth variant="secondary" onClick={() => { setIsAuthSheetOpen(false); navigate('ACTIVITY_LOG'); }}>
                            <History size={18} className="mr-2" /> Log Aktivitas
                        </Button>
                        <Button fullWidth variant="secondary" onClick={() => setIsSettingsMode(true)}>
                            <Settings size={18} className="mr-2" /> Pengaturan Akun
                        </Button>
                        <Button fullWidth variant="danger" onClick={() => { logout(); setIsAuthSheetOpen(false); }}>
                            <LogOut size={18} className="mr-2" /> Keluar
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </BottomSheet>
    </div>
  );
};