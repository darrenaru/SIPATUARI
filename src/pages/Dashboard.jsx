import { useState, useMemo } from 'react';
import { Ship, Route, Users, Package, Navigation, Clock, AlertTriangle, Anchor, Filter } from 'lucide-react';
import StatsCard from '../components/ui/StatsCard';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { relativeTime } from '../lib/time';
import { ROLE_PROFILE, ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const activityIcons = {
  voyage: Navigation,
  penumpang: Users,
  barang: Package,
  deviasi: AlertTriangle,
  trayek: Route,
  pelabuhan: Anchor,
};

const activityColors = {
  voyage: 'text-sea-500 bg-sea-500/10',
  penumpang: 'text-cyan-500 bg-cyan-500/10',
  barang: 'text-success-500 bg-success-500/10',
  deviasi: 'text-warning-500 bg-warning-500/10',
  trayek: 'text-sea-500 bg-sea-500/10',
  pelabuhan: 'text-cyan-500 bg-cyan-500/10',
};

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function trailingMonths() {
  const now = new Date();
  const keys = [];
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    labels.push(d.toLocaleDateString('id-ID', { month: 'short' }));
  }
  return { keys, labels };
}

function pctChange(curr, prev) {
  if (prev === 0) return curr === 0 ? '0%' : '+100%';
  const pct = Math.round(((curr - prev) / prev) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

export default function Dashboard() {
  const { role, profile, user } = useAuth();
  const roleLabel = profile?.nama || ROLE_PROFILE[role]?.desc || '';
  const isOperator = role === ROLES.OPERATOR;
  const [filterOperator, setFilterOperator] = useState('');
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const { rows: kapalList } = useSupabaseTable('kapal', {
    order: { column: 'nama' },
    eq: effectiveOperatorId ? { operator_id: effectiveOperatorId } : undefined,
  });
  const { rows: allTrayekList } = useSupabaseTable('trayek', { select: '*, kapal:kapal_id(operator_id)' });
  const { rows: allVoyageList } = useSupabaseTable('voyage', {
    select: 'id, status, deviasi, created_at, updated_at, tgl_berangkat, kapal:kapal_id(nama, operator_id), trayek:trayek_id(kode)',
  });
  const { rows: allPenumpangData } = useSupabaseTable('penumpang_data', { select: 'naik, turun, voyage:voyage_id(tgl_berangkat, kapal:kapal_id(operator_id))' });
  const { rows: allBongkarMuatData } = useSupabaseTable('bongkar_muat_data', { select: 'muat, muat_m3, bongkar, bongkar_m3, voyage:voyage_id(tgl_berangkat, kapal:kapal_id(operator_id))' });
  const { rows: usulanTrayekList } = useSupabaseTable('usulan_trayek', { select: 'id, judul_usulan, kabupaten, created_at', order: { column: 'created_at', ascending: false } });
  const { rows: fasilitasList } = useSupabaseTable('fasilitas_pelabuhan', { select: 'id, updated_at, pelabuhan:pelabuhan_id(nama)', order: { column: 'updated_at', ascending: false } });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  // Operator hanya boleh melihat data untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const trayekList = effectiveOperatorId ? allTrayekList.filter((t) => t.kapal?.operator_id === effectiveOperatorId) : allTrayekList;
  const voyageList = effectiveOperatorId ? allVoyageList.filter((v) => v.kapal?.operator_id === effectiveOperatorId) : allVoyageList;
  const penumpangData = effectiveOperatorId ? allPenumpangData.filter((p) => p.voyage?.kapal?.operator_id === effectiveOperatorId) : allPenumpangData;
  const bongkarMuatData = effectiveOperatorId ? allBongkarMuatData.filter((b) => b.voyage?.kapal?.operator_id === effectiveOperatorId) : allBongkarMuatData;

  const { keys: monthKeys, labels: monthLabels } = trailingMonths();
  const thisMonth = monthKeys[monthKeys.length - 1];
  const lastMonth = monthKeys[monthKeys.length - 2];

  const totalPenumpang = penumpangData.reduce((s, p) => s + p.naik, 0);
  const totalBarang = bongkarMuatData.reduce((s, b) => s + b.muat + b.bongkar, 0);

  const sumByMonth = (rows, monthKey_, valueFn) =>
    rows.filter((r) => r.voyage?.tgl_berangkat && monthKey(r.voyage.tgl_berangkat) === monthKey_).reduce((s, r) => s + valueFn(r), 0);
  const countByMonth = (rows, monthKey_) =>
    rows.filter((r) => r.tgl_berangkat && monthKey(r.tgl_berangkat) === monthKey_).length;

  const stats = [
    { icon: Ship, label: 'Armada', value: kapalList.length, color: 'sea' },
    { icon: Route, label: 'Jumlah Trayek', value: trayekList.length, color: 'cyan' },
    { icon: Users, label: 'Penumpang', value: totalPenumpang, color: 'success',
      trend: pctChange(sumByMonth(penumpangData, thisMonth, (p) => p.naik), sumByMonth(penumpangData, lastMonth, (p) => p.naik)) },
    { icon: Package, label: 'Barang', value: totalBarang, color: 'warning',
      trend: pctChange(sumByMonth(bongkarMuatData, thisMonth, (b) => b.muat + b.bongkar), sumByMonth(bongkarMuatData, lastMonth, (b) => b.muat + b.bongkar)) },
    { icon: Navigation, label: 'Voyage', value: voyageList.length, color: 'navy',
      trend: pctChange(countByMonth(voyageList, thisMonth), countByMonth(voyageList, lastMonth)) },
  ];

  const penumpangBulanan = useMemo(() => ({
    labels: monthLabels,
    naik: monthKeys.map((mk) => sumByMonth(penumpangData, mk, (p) => p.naik)),
    turun: monthKeys.map((mk) => sumByMonth(penumpangData, mk, (p) => p.turun)),
  }), [penumpangData]);

  const bongkarMuatBulanan = useMemo(() => ({
    labels: monthLabels,
    muat: monthKeys.map((mk) => sumByMonth(bongkarMuatData, mk, (b) => b.muat)),
    bongkar: monthKeys.map((mk) => sumByMonth(bongkarMuatData, mk, (b) => b.bongkar)),
    muat_m3: monthKeys.map((mk) => sumByMonth(bongkarMuatData, mk, (b) => b.muat_m3 || 0)),
    bongkar_m3: monthKeys.map((mk) => sumByMonth(bongkarMuatData, mk, (b) => b.bongkar_m3 || 0)),
  }), [bongkarMuatData]);

  const aktivitasTerbaru = useMemo(() => {
    const fromVoyage = voyageList.map((v) => v.deviasi ? {
      id: `voyage-deviasi-${v.id}`, tipe: 'deviasi', aksi: 'Deviasi dilaporkan',
      detail: `${v.kapal?.nama || 'Kapal'} — ${v.deviasi}`, ts: v.updated_at,
    } : {
      id: `voyage-${v.id}`, tipe: 'voyage', aksi: v.status === 'Selesai' ? 'Voyage selesai' : 'Voyage baru dimulai',
      detail: `${v.kapal?.nama || 'Kapal'} pada trayek ${v.trayek?.kode || '-'}`, ts: v.updated_at,
    });
    const fromUsulan = usulanTrayekList.map((u) => ({
      id: `usulan-${u.id}`, tipe: 'trayek', aksi: 'Usulan trayek baru',
      detail: `${u.judul_usulan} — ${u.kabupaten}`, ts: u.created_at,
    }));
    const fromFasilitas = fasilitasList.map((f) => ({
      id: `fasilitas-${f.id}`, tipe: 'pelabuhan', aksi: 'Fasilitas pelabuhan diperbarui',
      detail: f.pelabuhan?.nama || '-', ts: f.updated_at,
    }));
    return [...fromVoyage, ...fromUsulan, ...fromFasilitas]
      .filter((a) => a.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 8);
  }, [voyageList, usulanTrayekList, fasilitasList]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Selamat Datang, {roleLabel}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan operasional angkutan laut perintis hari ini.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
          <Clock size={14} />
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {!isOperator && (
        <Card>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Filter size={16} /> Filter:</div>
            <Select
              options={operatorOptions}
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              placeholder="Semua Operator"
              className="w-72"
            />
            {filterOperator && (
              <button onClick={() => setFilterOperator('')} className="text-xs text-sea-600 hover:underline cursor-pointer">Reset</button>
            )}
          </div>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <StatsCard key={s.label} {...s} delay={i * 80} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Penumpang Bulanan</CardTitle></CardHeader>
          <LineChart
            labels={penumpangBulanan.labels}
            datasets={[
              { label: 'Naik', data: penumpangBulanan.naik, color: '#1E6091' },
              { label: 'Turun', data: penumpangBulanan.turun, color: '#00BCD4' },
            ]}
          />
        </Card>
        <Card>
          <CardHeader><CardTitle>Bongkar Muat Barang</CardTitle></CardHeader>
          <BarChart
            labels={bongkarMuatBulanan.labels}
            datasets={[
              { label: 'Muat (Ton)', data: bongkarMuatBulanan.muat, color: '#1E6091', hoverColor: '#1A537C' },
              { label: 'Bongkar (Ton)', data: bongkarMuatBulanan.bongkar, color: '#3B82F6', hoverColor: '#2563EB' },
              { label: 'Muat (M³)', data: bongkarMuatBulanan.muat_m3, color: '#10B981', hoverColor: '#059669' },
              { label: 'Bongkar (M³)', data: bongkarMuatBulanan.bongkar_m3, color: '#F59E0B', hoverColor: '#D97706' },
            ]}
          />
        </Card>
      </div>

      {/* Activity & Quick Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 min-w-0">
          <Card>
            <CardHeader><CardTitle>Aktivitas Terbaru</CardTitle></CardHeader>
            <div className="space-y-0 divide-y divide-surface-100">
              {aktivitasTerbaru.length === 0 && <p className="text-sm text-slate-400 py-3.5">Belum ada aktivitas.</p>}
              {aktivitasTerbaru.map((a) => {
                const Icon = activityIcons[a.tipe] || Clock;
                const iconClass = activityColors[a.tipe] || 'text-slate-500 bg-slate-100';
                return (
                  <div key={a.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{a.aksi}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{a.detail}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{relativeTime(a.ts)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader><CardTitle>Status Kapal</CardTitle></CardHeader>
          <div className="space-y-3">
            {kapalList.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sea-500/10 flex items-center justify-center flex-shrink-0">
                    <Ship size={14} className="text-sea-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-900 truncate">{k.nama}</p>
                    <p className="text-[10px] text-slate-400 truncate">{k.tipe}</p>
                  </div>
                </div>
                <Badge variant={k.status === 'Beroperasi' ? 'beroperasi' : 'docking'}>
                  {k.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
