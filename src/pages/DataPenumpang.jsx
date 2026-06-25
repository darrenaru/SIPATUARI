import { useState, useMemo } from 'react';
import { Users, UserPlus, UserMinus, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import StatsCard from '../components/ui/StatsCard';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const STATUS_VARIANT = { 'Belum Disinggahi': 'default', 'Sudah Disinggahi': 'selesai', Dilewati: 'warning' };

export default function DataPenumpang() {
  const [filterVoyage, setFilterVoyage] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const { role: userRole, user } = useAuth();
  const isOperator = userRole === ROLES.OPERATOR;
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const eq = useMemo(() => (filterVoyage ? { voyage_id: Number(filterVoyage) } : undefined), [filterVoyage]);
  const { rows: allFiltered, loading } = useSupabaseTable('voyage_singgah', {
    select: 'id, urutan, status, alasan_dilewati, voyage_id, pelabuhan_id, voyage:voyage_id(trayek:trayek_id(kode), kapal:kapal_id(nama, operator_id)), pelabuhan:pelabuhan_id(nama), penumpang_data(naik, turun)',
    eq,
    order: filterVoyage ? { column: 'urutan', ascending: true } : { column: 'id', ascending: false },
  });
  const { rows: allVoyageList } = useSupabaseTable('voyage', {
    select: '*, trayek:trayek_id(kode), kapal:kapal_id(nama, operator_id)',
    order: { column: 'tgl_berangkat', ascending: false },
  });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  // Operator hanya boleh melihat data penumpang untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const filtered = effectiveOperatorId
    ? allFiltered.filter((row) => row.voyage?.kapal?.operator_id === effectiveOperatorId)
    : allFiltered;
  const voyageList = effectiveOperatorId
    ? allVoyageList.filter((v) => v.kapal?.operator_id === effectiveOperatorId)
    : allVoyageList;

  const totalNaik = filtered.reduce((s, row) => s + (row.penumpang_data?.naik || 0), 0);
  const totalTurun = filtered.reduce((s, row) => s + (row.penumpang_data?.turun || 0), 0);
  const selisih = totalNaik - totalTurun;

  const columns = [
    { key: 'voyage', header: 'Voyage', accessor: (row) => row.voyage?.trayek?.kode, render: (v, row) => (
      <span className="text-xs font-mono text-sea-600">{v ? `${v} (#${row.voyage_id})` : `#${row.voyage_id}`}</span>
    )},
    { key: 'urutan', header: 'Urutan', accessor: 'urutan', render: (v) => <span className="text-xs font-mono text-slate-400">#{v}</span> },
    { key: 'pelabuhan', header: 'Pelabuhan', accessor: (row) => row.pelabuhan?.nama?.replace('Pelabuhan ', ''), render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'status', header: 'Status', accessor: 'status', sortable: false, render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        <Badge variant={STATUS_VARIANT[v] || 'default'}>{v}</Badge>
        {v === 'Dilewati' && row.alasan_dilewati && <span className="text-[10px] text-slate-400">{row.alasan_dilewati}</span>}
      </div>
    )},
    { key: 'naik', header: 'Naik', accessor: (row) => row.penumpang_data?.naik || 0, render: (v) => <span className="text-success-500 font-semibold font-mono">+{v}</span> },
    { key: 'turun', header: 'Turun', accessor: (row) => row.penumpang_data?.turun || 0, render: (v) => <span className="text-danger-500 font-semibold font-mono">-{v}</span> },
    { key: 'selisih', header: 'Selisih', accessor: (row) => (row.penumpang_data?.naik || 0) - (row.penumpang_data?.turun || 0),
      render: (v) => <span className={`font-semibold font-mono ${v >= 0 ? 'text-sea-600' : 'text-danger-500'}`}>{v >= 0 ? '+' : ''}{v}</span>
    },
  ];

  const voyageOptions = voyageList.map(v => ({
    value: String(v.id),
    label: `${v.trayek?.kode || '—'} — ${v.kapal?.nama || '—'} (${new Date(v.tgl_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Data Penumpang</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rekap data penumpang naik dan turun per titik singgah.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={UserPlus} label="Total Naik" value={totalNaik} color="success" />
        <StatsCard icon={UserMinus} label="Total Turun" value={totalTurun} color="warning" />
        <StatsCard icon={Users} label="Selisih Penumpang" value={selisih} color="sea" />
      </div>

      {/* Filter */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter size={16} /> Filter:
          </div>
          <Select
            options={voyageOptions}
            value={filterVoyage}
            onChange={(e) => setFilterVoyage(e.target.value)}
            placeholder="Semua Voyage"
            className="w-72"
          />
          {filterVoyage && (
            <button onClick={() => setFilterVoyage('')} className="text-xs text-sea-600 hover:underline cursor-pointer">
              Reset Filter
            </button>
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
                <button onClick={() => setFilterOperator('')} className="text-xs text-sea-600 hover:underline cursor-pointer">
                  Reset Filter
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder="Cari pelabuhan..."
          />
        </div>
      </Card>
    </div>
  );
}
