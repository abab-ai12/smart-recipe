import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function Auth({ setAuth, setUserRole }: { setAuth: (status: boolean) => void, setUserRole: (role: string | null) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        const res = await apiClient.post('/api/auth/login', { username, password });
        const { token, userId, role } = res.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId.toString());
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
        
        setAuth(true);
        setUserRole(role);
        navigate('/');
      } else {
        // Handle Register
        await apiClient.post('/api/auth/register', { username, password });
        // After successful registration, switch to login view
        setIsLogin(true);
        setPassword('');
        alert('Registration successful! Please login.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="max-w-md w-full ios-glass bg-white/70 dark:bg-zinc-900/50 rounded-[32px] shadow-2xl border border-zinc-150/60 dark:border-zinc-800/80 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-100/60 dark:bg-orange-950/40 p-3.5 rounded-[22px]">
              <ChefHat className="text-orange-500" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-center text-zinc-900 dark:text-white mb-8 tracking-tight">
            {isLogin ? t('auth_login_title') : t('auth_register_title')}
          </h2>
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl text-sm font-medium border border-red-200/30">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wide mb-2">{t('auth_username')}</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wide mb-2">{t('auth_password')}</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all duration-200"
                placeholder="Enter password"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-orange-500 text-white font-extrabold py-3 px-4 rounded-2xl shadow-md transition-all duration-200 hover:bg-orange-600 disabled:opacity-50 ios-active-scale cursor-pointer"
            >
              {isLoading ? 'Processing...' : (isLogin ? t('auth_login_btn') : t('auth_register_btn'))}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-orange-500 dark:text-orange-400 hover:text-orange-600 font-bold text-sm transition-colors duration-150 cursor-pointer"
            >
              {isLogin ? t('auth_toggle_to_register') : t('auth_toggle_to_login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}