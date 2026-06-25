import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import logo from '../../assets/logo/logo-white.png';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white relative overflow-hidden">
      {/* Wave top decoration */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,0 L0,0 Z" fill="#F0F4F8" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <img src={logo} alt="SIPATUARI" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-[var(--font-heading)]">SIPATUARI</h3>
                <p className="text-[10px] text-cyan-300/60">Sistem Pelaporan Angkutan Laut Perintis</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Aplikasi pemantauan dan pelaporan operasional kapal perintis oleh Dinas Perhubungan Provinsi Sulawesi Utara.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Tautan</h4>
            <ul className="space-y-2.5">
              {['Tentang Sistem', 'Trayek Perintis', 'Jadwal Kapal', 'Hubungi Kami'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-2">
                    <ExternalLink size={12} />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Kontak</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin size={16} className="flex-shrink-0 text-cyan-400 mt-0.5" />
                <span>Jl. 17 Agustus No. 123, Manado, Sulawesi Utara 95119</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Phone size={16} className="flex-shrink-0 text-cyan-400" />
                <span>(0431) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Mail size={16} className="flex-shrink-0 text-cyan-400" />
                <span>dishub@sulutprov.go.id</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © 2026 Dinas Perhubungan Provinsi Sulawesi Utara. Hak cipta dilindungi.
          </p>
          <p className="text-xs text-slate-500">
            SIPATUARI v1.0 — Dibangun untuk pelayanan publik yang lebih baik
          </p>
        </div>
      </div>
    </footer>
  );
}
