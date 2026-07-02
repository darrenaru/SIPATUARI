import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Ship, Route, Users, BarChart3, FileText, Shield, ArrowRight, ChevronRight, MapPin, Phone } from 'lucide-react';
import Footer from '../components/layout/Footer';
import heroImg from '../assets/images/hero.png';
import masataLogo from '../assets/images/MasataSamuderaCargo.png';
import dishubLogo from '../assets/images/logo-dishub.png';
import logoBlue from '../assets/logo/logo-blue.png';
import logoWhite from '../assets/logo/logo-white.png';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    if (target === 0) return;
    done.current = false;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const t0 = Date.now();
        const go = () => {
          const p = Math.min((Date.now() - t0) / duration, 1);
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(go);
        };
        requestAnimationFrame(go);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref} className="tabular-nums">{count.toLocaleString('id-ID')}</span>;
}

const supporters = [
  {
    name: 'PT. Masata Samudera Cargo',
    logo: masataLogo,
    address: 'Kompleks Pelabuhan Lirung, Kel. Lirung, Kab. Kepulauan Talaud, Provinsi Sulawesi Utara',
    phone: '0852-9871-1414',
  },
  {
    name: 'Kantor Kesyahbandaran dan Otoritas Pelabuhan Kelas I Bitung',
    logo: dishubLogo,
    address: 'Jl. Ir Soekarno, Pateten Dua, Aertembaga, Kota Bitung, Sulawesi Utara 95522',
    phone: '0438-35762',
  },
  {
    name: 'Kantor Unit Penyelenggara Pelabuhan Kelas II Tahuna',
    logo: dishubLogo,
    address: 'Jalan Pelabuhan Tahuna No. 1, Kelurahan Tidore / Batulewer, Kecamatan Tahuna Timur, Kabupaten Kepulauan Sangihe, Sulawesi Utara, Kode Pos 95851',
    phone: '0812-9082-3231',
  },
];

const features = [
  { icon: Ship, title: 'Monitoring Kapal', desc: 'Pantau status operasional seluruh armada kapal perintis secara real-time.' },
  { icon: Route, title: 'Kelola Trayek', desc: 'Atur dan monitor trayek perintis beserta pelabuhan singgah.' },
  { icon: Users, title: 'Data Penumpang', desc: 'Rekap data penumpang naik/turun di setiap pelabuhan singgah.' },
  { icon: BarChart3, title: 'Statistik & Grafik', desc: 'Visualisasi data operasional dalam grafik dan dashboard interaktif.' },
  { icon: FileText, title: 'Laporan Otomatis', desc: 'Generate laporan periodik siap cetak dalam format PDF/Excel.' },
  { icon: Shield, title: 'Multi-Role Akses', desc: 'Sistem role-based untuk Admin, Operator, UPP, dan Pemda.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const { data: landingStatsData } = useSupabaseQuery(() => supabase.rpc('get_landing_stats'), []);
  const { data: trayekAktif } = useSupabaseQuery(() => supabase.rpc('get_landing_trayek_aktif'), []);

  const landingStats = [
    { label: 'Kapal Perintis', value: landingStatsData?.kapal || 0, suffix: 'Unit' },
    { label: 'Trayek Aktif', value: landingStatsData?.trayek_aktif || 0, suffix: 'Rute' },
    { label: 'Pelabuhan Terlayani', value: landingStatsData?.pelabuhan || 0, suffix: 'Pelabuhan' },
    { label: 'Penumpang / Tahun', value: landingStatsData?.penumpang_tahun || 0, suffix: 'Orang' },
  ];
  const trayekList = trayekAktif || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-lg shadow-sm border-b border-surface-200' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={scrolled ? logoBlue : logoWhite} alt="SIPATUARI" className="h-8 w-8 object-contain" />
            <span className={`text-base font-bold font-[var(--font-heading)] ${scrolled ? 'text-navy-900' : 'text-white'}`}>SIPATUARI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {['Tentang', 'Statistik', 'Trayek'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-navy-900' : 'text-white/80 hover:text-white'}`}>{item}</a>
            ))}
          </nav>
          <button onClick={() => navigate('/login')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${scrolled ? 'bg-sea-600 text-white hover:bg-sea-500' : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'}`}>
            Masuk
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden gradient-hero">
        <div className="absolute inset-0 opacity-20"><img src={heroImg} alt="" className="w-full h-full object-cover" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-900/80 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-12 items-center w-full">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-semibold mb-6">
              <Anchor size={14} /> Dinas Perhubungan Prov. Sulawesi Utara
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 font-[var(--font-heading)]">
              Sistem Pelaporan<span className="block text-gradient">Angkutan Laut</span>Perintis
            </h1>
            <p className="text-lg text-slate-300/90 leading-relaxed max-w-lg mb-8">
              Platform digital untuk pemantauan dan pelaporan operasional angkutan laut perintis di Provinsi Sulawesi Utara.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 px-7 py-3.5 bg-cyan-500 text-navy-900 rounded-xl text-sm font-bold hover:bg-cyan-400 transition-all shadow-lg cursor-pointer">
                Masuk <ArrowRight size={16} />
              </button>
              <a href="#tentang" className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-all cursor-pointer">
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>
          <div className="hidden lg:flex justify-end animate-slide-in-right">
            <div className="relative">
              <div className="absolute -inset-4 bg-cyan-500/10 rounded-3xl blur-2xl" />
              <img src={heroImg} alt="Kapal perintis" className="relative rounded-2xl shadow-2xl max-w-lg w-full object-cover border border-white/10" />
              <div className="absolute -bottom-4 -left-8 bg-white rounded-xl shadow-xl p-4 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sea-500/10 flex items-center justify-center"><Ship size={18} className="text-sea-500" /></div>
                  <div><p className="text-xs text-slate-400">Kapal Aktif</p><p className="text-lg font-bold text-navy-900">5 Unit</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16"><path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z" fill="#F0F4F8" /></svg>
        </div>
      </section>

      {/* Features */}
      <section id="tentang" className="py-20 bg-surface-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-cyan-600 uppercase tracking-wider mb-2">Fitur Unggulan</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900 font-[var(--font-heading)]">Tentang SIPATUARI</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto">Sistem terintegrasi untuk mengelola data operasional angkutan laut perintis secara digital.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-surface-200 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-sea-500/10 flex items-center justify-center mb-4 group-hover:bg-sea-500 transition-colors duration-300">
                  <f.icon size={22} className="text-sea-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-base font-bold text-navy-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="statistik" className="py-20 gradient-navy relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Data Terkini</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-[var(--font-heading)]">Statistik Angkutan Laut</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {landingStats.map((s, i) => (
              <div key={s.label} className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                <p className="text-4xl md:text-5xl font-extrabold text-white mb-2"><AnimatedCounter target={s.value} /></p>
                <p className="text-sm font-semibold text-cyan-300">{s.suffix}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trayek */}
      <section id="trayek" className="py-20 bg-surface-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-cyan-600 uppercase tracking-wider mb-2">Rute Layanan</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900 font-[var(--font-heading)]">Trayek Perintis</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trayekList.map((t, i) => (
              <div key={t.id} className="bg-white rounded-xl p-5 border border-surface-200 hover:shadow-[var(--shadow-card-hover)] transition-all animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{t.kode}</span>
                    <h3 className="text-sm font-bold text-navy-900 mt-1.5">{t.nama}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{t.jarak} km</span>
                </div>
                <div className="flex items-start gap-2 mt-3">
                  <MapPin size={14} className="text-sea-500 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {(t.pelabuhan || []).map((p, pi) => (
                      <span key={pi} className="text-xs text-slate-500">{p}{pi < t.pelabuhan.length - 1 && <span className="text-slate-300 mx-0.5">→</span>}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Frekuensi: <strong className="text-navy-900">{t.frekuensi}</strong></span>
                  <span className="text-xs text-slate-400">{t.kapal_nama}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900 mb-4 font-[var(--font-heading)]">Siap Menggunakan SIPATUARI?</h2>
          <p className="text-slate-500 mb-8">Masuk ke sistem untuk mulai memantau operasional angkutan laut perintis.</p>
          <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 px-8 py-4 bg-sea-600 text-white rounded-xl text-base font-bold hover:bg-sea-500 transition-all shadow-lg cursor-pointer">
            Masuk ke Dashboard <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Supported By */}
      <section className="py-16 bg-surface-100 border-t border-surface-200">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-bold text-cyan-600 uppercase tracking-wider mb-10 text-center">Supported By</p>
          <div className="grid md:grid-cols-3 gap-10">
            {supporters.map((s) => (
              <div key={s.name} className="text-center">
                {s.logo && <img src={s.logo} alt={s.name} className="h-16 mx-auto mb-4 object-contain" />}
                <h3 className="text-lg font-bold text-navy-900 mb-4 font-[var(--font-heading)]">{s.name}</h3>
                <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-sea-500 flex-shrink-0" />
                    <span>{s.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-sea-500 flex-shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
