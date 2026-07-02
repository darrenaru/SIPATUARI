import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ship,
  Route,
  Anchor,
  Navigation,
  Users,
  Package,
  FileText,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  UserCog,
  X,
} from 'lucide-react';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo/logo-white.png';

const MENU_BY_ROLE = {
  [ROLES.ADMIN]: [
    { section: 'UTAMA' },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { section: 'OPERASIONAL' },
    { label: 'Armada', icon: Ship, path: '/dashboard/armada' },
    { label: 'Manajemen Trayek', icon: Route, path: '/dashboard/trayek' },
    { label: 'Realisasi Voyage', icon: Navigation, path: '/dashboard/voyage' },
    { label: 'Data Penumpang', icon: Users, path: '/dashboard/penumpang' },
    { label: 'Bongkar Muat', icon: Package, path: '/dashboard/bongkar-muat' },
    { section: 'EVALUASI' },
    { label: 'Usulan Trayek', icon: ClipboardCheck, path: '/dashboard/usulan-trayek' },
    { label: 'Fasilitas Pelabuhan', icon: Anchor, path: '/dashboard/fasilitas-pelabuhan' },
    { label: 'Kondisi Ekonomi', icon: Landmark, path: '/dashboard/kondisi-ekonomi' },
    { section: 'PELAPORAN' },
    { label: 'Laporan', icon: FileText, path: '/dashboard/laporan' },
    { section: 'ADMINISTRASI' },
    { label: 'Manajemen Pengguna', icon: UserCog, path: '/dashboard/pengguna' },
  ],
  [ROLES.OPERATOR]: [
    { section: 'UTAMA' },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { section: 'OPERASIONAL' },
    { label: 'Armada', icon: Ship, path: '/dashboard/armada' },
    { label: 'Manajemen Trayek', icon: Route, path: '/dashboard/trayek' },
    { label: 'Realisasi Voyage', icon: Navigation, path: '/dashboard/voyage' },
    { label: 'Data Penumpang', icon: Users, path: '/dashboard/penumpang' },
    { label: 'Bongkar Muat', icon: Package, path: '/dashboard/bongkar-muat' },
    { section: 'PELAPORAN' },
    { label: 'Laporan', icon: FileText, path: '/dashboard/laporan' },
  ],
  [ROLES.UPP]: [
    { section: 'UTAMA' },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { section: 'PELABUHAN' },
    { label: 'Manajemen Trayek', icon: Route, path: '/dashboard/trayek' },
    { label: 'Fasilitas Pelabuhan', icon: Anchor, path: '/dashboard/fasilitas-pelabuhan' },
    { section: 'PELAPORAN' },
    { label: 'Laporan', icon: FileText, path: '/dashboard/laporan' },
  ],
  [ROLES.PEMKAB]: [
    { section: 'UTAMA' },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { section: 'EVALUASI TRAYEK' },
    { label: 'Manajemen Trayek', icon: Route, path: '/dashboard/trayek' },
    { label: 'Usulan Trayek', icon: ClipboardCheck, path: '/dashboard/usulan-trayek' },
    { label: 'Kondisi Ekonomi', icon: Landmark, path: '/dashboard/kondisi-ekonomi' },
    { section: 'PELAPORAN' },
    { label: 'Laporan', icon: FileText, path: '/dashboard/laporan' },
  ],
};

const getMenuItems = (role) => MENU_BY_ROLE[role] || MENU_BY_ROLE[ROLES.ADMIN];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { role } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 w-[260px] ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'linear-gradient(180deg, #0A1628 0%, #0F1F3A 100%)',
        }}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-white/8 gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
          <img src={logo} alt="SIPATUARI" className="h-8 w-8 object-contain flex-shrink-0" />
          {(!collapsed || mobileOpen) && (
            <div className="animate-fade-in flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white tracking-wide">SIPATUARI</h1>
              <p className="text-[10px] text-cyan-300/60 leading-tight">Pelaporan Angkutan Laut</p>
            </div>
          )}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {getMenuItems(role).map((item, idx) => {
            if (item.section) {
              return collapsed && !mobileOpen ? (
                <div key={idx} className="h-px bg-white/6 my-3 hidden lg:block" />
              ) : (
                <p key={idx} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1.5">
                  {item.section}
                </p>
              );
            }

            const isActive = item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path + idx}
                to={item.path}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-cyan-500/12 text-cyan-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }
                  ${collapsed ? 'lg:justify-center' : ''}
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-400" />
                )}
                <item.icon size={18} className={`flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-navy-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none hidden lg:block">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block p-2.5 border-t border-white/6">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-xs font-medium cursor-pointer"
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span>Tutup Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
