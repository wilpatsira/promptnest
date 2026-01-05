
import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, ArrowRight, Loader2, AlertCircle, ArrowLeft, AtSign, Eye, EyeOff, ShieldCheck, Wifi, WifiOff, Lock, Sparkles, RefreshCcw } from 'lucide-react';
import { signInWithLicense, checkConnection } from '../services/auth';
import { User as UserType } from '../types';

interface AuthModalProps {
  onLogin: (user: UserType, isNewUser?: boolean) => void;
  onBack?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onBack }) => {
  const [licenseCode, setLicenseCode] = useState('');
  const [username, setUsername] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showLicense, setShowLicense] = useState(false);
  
  const [status, setStatus] = useState<'online' | 'connecting' | 'offline'>('connecting');
  const [statusMsg, setStatusMsg] = useState('Establishing connection...');
  
  const isPinging = useRef(false);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadingMessages = [
    'Verifying Access Key...',
    'Opening Secure Vault...',
    'Synchronizing Library...',
    'Opening Workspace...'
  ];

  const pingServer = async () => {
    if (isPinging.current) return;
    isPinging.current = true;

    try {
      const res = await checkConnection();
      setStatus(res.status);
      
      if (res.status === 'online') {
        setStatusMsg('Security: Online');
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      } else {
        setStatusMsg('Synchronizing vault...');
      }
    } catch (err) {
      setStatus('offline');
      setStatusMsg('Connection paused');
    } finally {
      isPinging.current = false;
    }
  };

  useEffect(() => {
    pingServer();
    // Cek koneksi setiap 5 detik jika belum online
    retryIntervalRef.current = setInterval(() => {
      if (status !== 'online') pingServer();
    }, 5000);

    return () => {
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [status]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
        interval = setInterval(() => {
            setLoadingStep(prev => (prev + 1) % loadingMessages.length);
        }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handleLicenseLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !licenseCode) {
        setError('Please fill in all fields.');
        return;
    }

    setError('');
    setIsLoading(true);
    
    try {
        const result = await signInWithLicense(username, licenseCode);
        if (result.success && result.user) {
            onLogin(result.user, result.isNewUser);
        } else {
            setError(result.message || 'Verification timed out. Please try once more.');
            setIsLoading(false);
        }
    } catch (err) {
        setError('Connection interrupted. Retrying...');
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#FDFBF7]">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative min-h-[560px] flex flex-col">
        
        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative mb-8">
                    <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-gray-900/20">
                        <Lock className="text-white animate-pulse" size={32} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                        <Loader2 className="animate-spin text-white" size={14} />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-gray-900">{loadingMessages[loadingStep]}</p>
                    <p className="text-xs text-gray-400 font-medium px-12 leading-relaxed">Securing your private library environment.</p>
                </div>
            </div>
        )}

        <div className="p-8 sm:p-12 flex-1 flex flex-col justify-center relative">
          {onBack && !isLoading && (
              <button onClick={onBack} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                  <ArrowLeft size={20} />
              </button>
          )}

          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gray-900 rounded-[1.5rem] shadow-2xl shadow-gray-900/20 flex items-center justify-center text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-black group-hover:scale-110 transition-transform duration-500"></div>
                <ShieldCheck size={42} strokeWidth={1.5} className="relative z-10" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-3 tracking-tight">Access Workspace</h1>
          <p className="text-center text-gray-500 text-sm mb-10 px-2 leading-relaxed">Login with your assigned license to sync your prompts.</p>
          
          <div className="space-y-6 w-full">
            <form onSubmit={handleLicenseLoginSubmit} className="space-y-5 w-full">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Username / ID</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"><AtSign size={18} /></div>
                        <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-300 transition-all placeholder:text-gray-300 font-medium" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">License Access Key</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"><KeyRound size={18} /></div>
                        <input 
                            type={showLicense ? "text" : "password"}
                            required 
                            value={licenseCode} 
                            onChange={(e) => setLicenseCode(e.target.value)} 
                            placeholder="PN-XXXX-XXXX" 
                            className="block w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-300 transition-all font-mono text-sm tracking-wider" 
                        />
                        <button type="button" onClick={() => setShowLicense(!showLicense)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-300 hover:text-gray-600 transition-colors">
                            {showLicense ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-center pt-2">
                     <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-700 ${
                         status === 'online' ? 'text-green-600' : 'text-gray-400'
                     }`}>
                        {status === 'connecting' ? <Loader2 size={10} className="animate-spin" /> : status === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                        {statusMsg}
                     </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-900/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group mt-4"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Verify Credentials <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                </button>
            </form>

            {error && (
                <div className="p-4 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 bg-red-50 text-red-600 border border-red-100">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            
            <div className="pt-6 flex flex-col items-center">
                <button onClick={pingServer} className="flex items-center gap-2 text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] hover:text-gray-600 transition-colors">
                    <RefreshCcw size={10} /> Re-sync Secure Channel
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
