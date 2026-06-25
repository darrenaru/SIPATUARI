import { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Menu,
  Navigation,
  Route,
  AlertTriangle,
  Anchor,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ROLE_PROFILE, ROLES } from '../../constants/roles';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { relativeTime } from '../../lib/time';

const notifIcons = {
  voyage: Navigation, deviasi: AlertTriangle, trayek: Route, pelabuhan: Anchor, perubahan: MapPin,
  'usulan-diterima': CheckCircle2, 'usulan-ditolak': XCircle,
};
const notifColors = { 'usulan-diterima': 'text-success-500', 'usulan-ditolak': 'text-danger-500' };

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/dashboard/armada': 'Armada',
  '/dashboard/trayek': 'Manajemen Trayek',
  '/dashboard/voyage': 'Realisasi Voyage',
  '/dashboard/penumpang': 'Data Penumpang',
  '/dashboard/bongkar-muat': 'Data Bongkar Muat',
  '/dashboard/usulan-trayek': 'Usulan Trayek',
  '/dashboard/fasilitas-pelabuhan': 'Fasilitas Pelabuhan',
  '/dashboard/kondisi-ekonomi': 'Kondisi Ekonomi',
  '/dashboard/laporan': 'Laporan',
  '/dashboard/pengguna': 'Manajemen Pengguna',
};

export default function Topbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const { role, profile, user, signOut, refreshProfile } = useAuth();
  const roleDesc = ROLE_PROFILE[role]?.desc || '';
  const roleName = profile?.nama || roleDesc || '...';
  const roleEmail = profile?.email || '';
  const roleInitials = roleName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { rows: voyageList, refetch: refetchVoyage } = useSupabaseTable('voyage', {
    select: 'id, status, deviasi, updated_at, kapal:kapal_id(nama), trayek:trayek_id(kode)',
    order: { column: 'updated_at', ascending: false },
  });
  const { rows: usulanList, refetch: refetchUsulan } = useSupabaseTable('usulan_trayek', {
    select: 'id, judul_usulan, kabupaten, status, updated_at',
    order: { column: 'updated_at', ascending: false },
  });
  const { rows: fasilitasList, refetch: refetchFasilitas } = useSupabaseTable('fasilitas_pelabuhan', {
    select: 'id, updated_at, pelabuhan:pelabuhan_id(nama)',
    order: { column: 'updated_at', ascending: false },
  });
  const { rows: singgahRequestList, refetch: refetchSinggahRequest } = useSupabaseTable('voyage_singgah_request', {
    select: 'id, status, requested_by, created_at, reviewed_at, voyage_singgah:voyage_singgah_id(voyage_id, pelabuhan:pelabuhan_id(nama))',
    order: { column: 'created_at', ascending: false },
  });

  const handleToggleNotif = () => {
    const next = !showNotif;
    setShowNotif(next);
    if (next) {
      refetchVoyage();
      refetchUsulan();
      refetchFasilitas();
      refetchSinggahRequest();
    }
  };

  const lastRead = profile?.notifikasi_dibaca_at ? new Date(profile.notifikasi_dibaca_at) : null;

  const notifications = useMemo(() => {
    const canSeeVoyage = role === ROLES.ADMIN || role === ROLES.OPERATOR;
    const canSeeUsulan = role === ROLES.ADMIN || role === ROLES.PEMKAB;
    const canSeeFasilitas = role === ROLES.ADMIN || role === ROLES.UPP;

    const fromVoyage = !canSeeVoyage ? [] : voyageList.map((v) => v.deviasi ? {
      id: `voyage-deviasi-${v.id}`, tipe: 'deviasi', path: '/dashboard/voyage',
      judul: 'Deviasi Dilaporkan', deskripsi: `${v.kapal?.nama || 'Kapal'}: ${v.deviasi}`, ts: v.updated_at,
    } : {
      id: `voyage-${v.id}`, tipe: 'voyage', path: '/dashboard/voyage',
      judul: v.status === 'Selesai' ? 'Voyage Selesai' : 'Voyage Baru Dimulai',
      deskripsi: `${v.kapal?.nama || 'Kapal'} — Trayek ${v.trayek?.kode || '-'}`, ts: v.updated_at,
    });
    const fromUsulan = !canSeeUsulan ? [] : usulanList.map((u) => ({
      id: `usulan-${u.id}`,
      tipe: u.status === 'Menunggu' ? 'trayek' : u.status === 'Diterima' ? 'usulan-diterima' : 'usulan-ditolak',
      path: '/dashboard/usulan-trayek',
      judul: u.status === 'Menunggu' ? 'Usulan Trayek Baru' : `Usulan Trayek ${u.status}`,
      deskripsi: `${u.judul_usulan} — ${u.kabupaten}`, ts: u.updated_at,
    }));
    const fromFasilitas = !canSeeFasilitas ? [] : fasilitasList.map((f) => ({
      id: `fasilitas-${f.id}`, tipe: 'pelabuhan', path: '/dashboard/fasilitas-pelabuhan',
      judul: 'Fasilitas Pelabuhan Diperbarui', deskripsi: f.pelabuhan?.nama || '-', ts: f.updated_at,
    }));
    const fromSinggahRequest = role === ROLES.ADMIN
      ? singgahRequestList.map((r) => ({
          id: `singgah-request-${r.id}`,
          tipe: r.status === 'Menunggu' ? 'perubahan' : r.status === 'Diterima' ? 'usulan-diterima' : 'usulan-ditolak',
          path: '/dashboard/voyage',
          judul: r.status === 'Menunggu' ? 'Permintaan Perubahan Data Singgah' : `Permintaan Perubahan ${r.status}`,
          deskripsi: `${r.voyage_singgah?.pelabuhan?.nama || '-'} (Voyage #${r.voyage_singgah?.voyage_id})`,
          ts: r.status === 'Menunggu' ? r.created_at : r.reviewed_at,
        }))
      : role === ROLES.OPERATOR
        ? singgahRequestList.filter((r) => r.requested_by === user?.id && r.status !== 'Menunggu').map((r) => ({
            id: `singgah-request-${r.id}`, tipe: r.status === 'Diterima' ? 'usulan-diterima' : 'usulan-ditolak', path: '/dashboard/voyage',
            judul: `Permintaan Perubahan ${r.status}`,
            deskripsi: `${r.voyage_singgah?.pelabuhan?.nama || '-'} (Voyage #${r.voyage_singgah?.voyage_id})`,
            ts: r.reviewed_at,
          }))
        : [];
    return [...fromVoyage, ...fromUsulan, ...fromFasilitas, ...fromSinggahRequest]
      .filter((n) => n.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 8)
      .map((n) => ({ ...n, unread: !lastRead || new Date(n.ts) > lastRead }));
  }, [voyageList, usulanList, fasilitasList, singgahRequestList, lastRead, role, user?.id]);

  const hasUnread = notifications.some((n) => n.unread);

  const handleMarkAllRead = async () => {
    await supabase.rpc('mark_notifications_read');
    refreshProfile();
  };

  const handleNotifClick = (n) => {
    setShowNotif(false);
    navigate(n.path);
  };

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors text-slate-600 cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-navy-900 font-[var(--font-heading)]">{pageTitle}</h1>
          <p className="text-xs text-slate-400 hidden sm:block">Dinas Perhubungan Prov. Sulawesi Utara</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari..."
            className="pl-9 pr-4 py-2 w-52 bg-surface-50 border border-surface-200 rounded-lg text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleToggleNotif}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors text-slate-500 cursor-pointer"
          >
            <Bell size={18} />
            {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
              <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-900">Notifikasi</h3>
                {hasUnread && (
                  <button onClick={handleMarkAllRead} className="text-xs text-cyan-600 font-medium cursor-pointer hover:underline">Tandai semua dibaca</button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">Tidak ada notifikasi.</p>
                )}
                {notifications.map((n) => {
                  const Icon = notifIcons[n.tipe] || Clock;
                  const iconColor = notifColors[n.tipe] || 'text-sea-500';
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full flex items-start gap-2.5 text-left px-4 py-3 border-b border-surface-100 last:border-0 hover:bg-surface-50 cursor-pointer transition-colors ${n.unread ? 'bg-cyan-500/5' : ''}`}
                    >
                      <Icon size={14} className={`${iconColor} mt-0.5 flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{n.judul}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.deskripsi}</p>
                        <p className="text-xs text-slate-400 mt-1">{relativeTime(n.ts)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-200 mx-1" />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sea-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
              {roleInitials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-navy-900 leading-tight">{roleName}</p>
              <p className="text-[10px] text-slate-400">{roleDesc}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-surface-200 overflow-hidden animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
              <div className="p-3 border-b border-surface-200">
                <p className="text-sm font-semibold text-navy-900">{roleName}</p>
                <p className="text-xs text-slate-400">{roleEmail}</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-surface-50 hover:text-navy-900 transition-colors cursor-pointer">
                  <User size={15} /> Profil Saya
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-surface-50 hover:text-navy-900 transition-colors cursor-pointer">
                  <Settings size={15} /> Pengaturan
                </button>
              </div>
              <div className="border-t border-surface-200 py-1">
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut size={15} /> Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
