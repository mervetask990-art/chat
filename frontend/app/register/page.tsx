'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Zap, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

type ErrorResponse = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const response = (error as ErrorResponse).response;
    const message = response?.data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Kayıt olunamadı.';
};

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register(form);
      setAuth(res.data.user, res.data.token);
      router.push('/chat');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Zap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">EEE Chat</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Ücretsiz hesap oluştur</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-300"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: 'name', label: 'Ad Soyad', type: 'text', icon: User, placeholder: 'Adın Soyadın', key: 'name' as const },
              { id: 'email', label: 'Email', type: 'email', icon: Mail, placeholder: 'ornek@email.com', key: 'email' as const },
            ].map(({ id, label, type, icon: Icon, placeholder, key }) => (
              <div key={id}>
                <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    id={id}
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm glow-focus transition-all"
                    style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Şifre</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 karakter"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm glow-focus transition-all"
                  style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Zaten hesabın var mı?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: '#a5b4fc' }}>
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
