import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Globe } from 'lucide-react';
import loginBg from '../assets/images/login-bg.png';
import logoWhite from '../assets/logo/logo-white.png';
import logoBlue from '../assets/logo/logo-blue.png';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [lang, setLang] = useState('id');
  const [form, setForm] = useState({ nip: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invalidCredentialsMessage = lang === 'id' ? 'NIP atau kata sandi salah.' : 'Invalid NIP or password.';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const identifier = form.nip.trim();
    let email = identifier;

    if (!identifier.includes('@')) {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_nip', { p_nip: identifier });
      if (rpcError || !resolvedEmail) {
        setError(invalidCredentialsMessage);
        setLoading(false);
        return;
      }
      email = resolvedEmail;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: form.password });
    if (authError || !data.session) {
      setError(invalidCredentialsMessage);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero items-center justify-center">
        <div className="absolute inset-0 opacity-30">
          <img src={loginBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950/90 via-navy-900/70 to-sea-600/50" />
        <div className="relative z-10 px-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mx-auto mb-8">
            <img src={logoWhite} alt="SIPATUARI" className="w-10 h-10 object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4 font-[var(--font-heading)]">SIPATUARI</h2>
          <p className="text-base text-slate-300 leading-relaxed max-w-md mx-auto">
            Sistem Pelaporan Angkutan Laut Perintis Provinsi Sulawesi Utara
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { val: '5', label: 'Kapal' },
              { val: '12', label: 'Pelabuhan' },
              { val: '4.7K', label: 'Penumpang' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/8 border border-white/10">
                <p className="text-xl font-bold text-white">{s.val}</p>
                <p className="text-[10px] text-cyan-300/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 w-full opacity-20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
            <path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md">
          {/* Language toggle */}
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setLang(l => l === 'id' ? 'en' : 'id')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-surface-200 transition-colors cursor-pointer"
            >
              <Globe size={14} />
              {lang === 'id' ? 'Bahasa Indonesia' : 'English'}
            </button>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <img src={logoBlue} alt="SIPATUARI" className="w-9 h-9 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-navy-900 font-[var(--font-heading)]">SIPATUARI</h1>
              <p className="text-[11px] text-slate-400">Pelaporan Angkutan Laut Perintis</p>
            </div>
          </div>

          <div className="mt-8 mb-6">
            <h2 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">
              {lang === 'id' ? 'Selamat Datang' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'id' ? 'Masuk ke dashboard untuk melanjutkan.' : 'Sign in to your dashboard to continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
            )}
            <div>
              <label htmlFor="nip" className="block text-sm font-medium text-slate-700 mb-1.5">
                {lang === 'id' ? 'NIP / Email' : 'Employee ID / Email'}
              </label>
              <input
                id="nip"
                type="text"
                value={form.nip}
                onChange={e => setForm({ ...form, nip: e.target.value })}
                placeholder={lang === 'id' ? 'Masukkan NIP atau email' : 'Enter your ID or email'}
                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                {lang === 'id' ? 'Kata Sandi' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-white border border-surface-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-sea-600 focus:ring-cyan-500" />
                <span className="text-sm text-slate-600">{lang === 'id' ? 'Ingat saya' : 'Remember me'}</span>
              </label>
              <a href="#" className="text-sm font-medium text-sea-600 hover:text-sea-500 transition-colors">
                {lang === 'id' ? 'Lupa kata sandi?' : 'Forgot password?'}
              </a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sea-600 text-white rounded-xl text-sm font-bold hover:bg-sea-500 transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                lang === 'id' ? 'Masuk' : 'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            © 2026 Dinas Perhubungan Prov. Sulawesi Utara
          </p>
        </div>
      </div>
    </div>
  );
}
