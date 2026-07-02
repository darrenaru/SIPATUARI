import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ArrowUpFromLine, ArrowDownToLine, Scale, Filter, Box, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import StatsCard from '../components/ui/StatsCard';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const STATUS_VARIANT = { 'Belum Disinggahi': 'default', 'Sudah Disinggahi': 'selesai', Dilewati: 'warning' };

export default function DataBongkarMuat() {
  const [filterVoyage, setFilterVoyage] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const { role: userRole, user } = useAuth();
  const isOperator = userRole === ROLES.OPERATOR;
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const eq = useMemo(() => (filterVoyage ? { voyage_id: Number(filterVoyage) } : undefined), [filterVoyage]);
  const { rows: allFiltered, loading } = useSupabaseTable('voyage_singgah', {
    select: 'id, urutan, status, alasan_dilewati, voyage_id, pelabuhan_id, voyage:voyage_id(trayek:trayek_id(kode), kapal:kapal_id(nama, operator_id)), pelabuhan:pelabuhan_id(nama), bongkar_muat_data(muat, muat_m3, bongkar, bongkar_m3)',
    eq,
    order: filterVoyage ? { column: 'urutan', ascending: true } : { column: 'id', ascending: false },
  });
  const { rows: allVoyageList } = useSupabaseTable('voyage', {
    select: '*, trayek:trayek_id(kode), kapal:kapal_id(nama, operator_id)',
    order: { column: 'tgl_berangkat', ascending: false },
  });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  // Operator hanya boleh melihat data bongkar muat untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const filtered = effectiveOperatorId
    ? allFiltered.filter((row) => row.voyage?.kapal?.operator_id === effectiveOperatorId)
    : allFiltered;
  const voyageList = effectiveOperatorId
    ? allVoyageList.filter((v) => v.kapal?.operator_id === effectiveOperatorId)
    : allVoyageList;

  const totalMuat = filtered.reduce((s, row) => s + (row.bongkar_muat_data?.muat || 0), 0);
  const totalMuatM3 = filtered.reduce((s, row) => s + (row.bongkar_muat_data?.muat_m3 || 0), 0);
  const totalBongkar = filtered.reduce((s, row) => s + (row.bongkar_muat_data?.bongkar || 0), 0);
  const totalBongkarM3 = filtered.reduce((s, row) => s + (row.bongkar_muat_data?.bongkar_m3 || 0), 0);
  const totalTonase = totalMuat + totalBongkar;
  const totalVolume = totalMuatM3 + totalBongkarM3;

  const columns = [
    { key: 'kapal', header: 'Kapal', accessor: (row) => row.voyage?.kapal?.nama, render: (v) => <span className="font-semibold text-sm text-navy-900">{v || '-'}</span> },
    { key: 'voyageId', header: 'Voyage', accessor: (row) => row.voyage?.trayek?.kode, render: (v, row) => (
      <span className="text-xs font-mono font-medium text-slate-500">{v ? `${v} (#${row.voyage_id})` : `#${row.voyage_id}`}</span>
    )},
    { key: 'urutan', header: 'Urutan', accessor: 'urutan', render: (v) => <span className="text-xs font-mono text-slate-400">#{v}</span> },
    { key: 'pelabuhan', header: 'Pelabuhan', accessor: (row) => row.pelabuhan?.nama?.replace('Pelabuhan ', ''), render: (v) => <span className="font-semibold text-navy-800">{v}</span> },
    { key: 'status', header: 'Status', accessor: 'status', sortable: false, render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        <Badge variant={STATUS_VARIANT[v] || 'default'}>{v}</Badge>
        {v === 'Dilewati' && row.alasan_dilewati && <span className="text-[10px] text-slate-400">{row.alasan_dilewati}</span>}
      </div>
    )},
    { key: 'muat', header: 'Muat', accessor: (row) => row.bongkar_muat_data?.muat || 0, render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-sea-600 font-bold font-mono text-sm">{v} Ton</span>
        <span className="text-xs text-sea-500/80 font-mono font-medium">{row.bongkar_muat_data?.muat_m3 || 0} M³</span>
      </div>
    )},
    { key: 'bongkar', header: 'Bongkar', accessor: (row) => row.bongkar_muat_data?.bongkar || 0, render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-cyan-600 font-bold font-mono text-sm">{v} Ton</span>
        <span className="text-xs text-cyan-500/80 font-mono font-medium">{row.bongkar_muat_data?.bongkar_m3 || 0} M³</span>
      </div>
    )},
  ];

  const exportExcel = () => {
    const rows = filtered.map((row) => ({
      Kapal: row.voyage?.kapal?.nama || '-',
      Voyage: row.voyage?.trayek?.kode ? `${row.voyage.trayek.kode} (#${row.voyage_id})` : `#${row.voyage_id}`,
      Urutan: row.urutan,
      Pelabuhan: row.pelabuhan?.nama?.replace('Pelabuhan ', '') || '-',
      Status: row.status,
      'Muat (Ton)': row.bongkar_muat_data?.muat || 0,
      'Muat (m³)': row.bongkar_muat_data?.muat_m3 || 0,
      'Bongkar (Ton)': row.bongkar_muat_data?.bongkar || 0,
      'Bongkar (m³)': row.bongkar_muat_data?.bongkar_m3 || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bongkar Muat');
    XLSX.writeFile(wb, 'data-bongkar-muat.xlsx');
  };

  const voyageOptions = voyageList.map(v => ({
    value: String(v.id),
    label: `${v.trayek?.kode || '—'} — ${v.kapal?.nama || '—'}`
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Data Bongkar Muat</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rekap data muat dan bongkar barang per titik singgah.</p>
        </div>
        <button onClick={exportExcel} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-success-500/10 text-success-700 hover:bg-success-500/20 text-sm font-medium transition-colors cursor-pointer">
          <Download size={15} /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard icon={ArrowUpFromLine} label="Muat (Ton)" value={totalMuat} color="sea" />
        <StatsCard icon={Box} label="Muat (m³)" value={totalMuatM3} color="sea" />
        <StatsCard icon={ArrowDownToLine} label="Bongkar (Ton)" value={totalBongkar} color="cyan" />
        <StatsCard icon={Box} label="Bongkar (m³)" value={totalBongkarM3} color="cyan" />
        <StatsCard icon={Scale} label="Total (Ton)" value={totalTonase} color="navy" />
        <StatsCard icon={Scale} label="Total (m³)" value={totalVolume} color="navy" />
      </div>

      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Filter size={16} /> Filter:</div>
          <Select
            options={voyageOptions}
            value={filterVoyage}
            onChange={(e) => setFilterVoyage(e.target.value)}
            placeholder="Semua Voyage"
            className="w-72"
          />
          {filterVoyage && (
            <button onClick={() => setFilterVoyage('')} className="text-xs text-sea-600 hover:underline cursor-pointer">Reset</button>
          )}
          {!isOperator && (
            <>
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
            </>
          )}
        </div>
      </Card>

      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder="Cari data barang..."
          />
        </div>
      </Card>
    </div>
  );
}
