import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

export default function FasilitasPelabuhan() {
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const canEdit = userRole === ROLES.UPP || userRole === ROLES.ADMIN;

  const { rows: pelabuhanList, loading } = useSupabaseTable('pelabuhan', {
    select: '*, fasilitas_pelabuhan(id)',
    order: { column: 'created_at', ascending: false },
  });

  const columns = [
    { key: 'nama', header: 'Nama Pelabuhan', accessor: 'nama', render: (v) => <span className="font-semibold text-navy-900">{v}</span> },
    { key: 'kabupaten', header: 'Lokasi', accessor: 'kabupaten' },
    { key: 'koordinat', header: 'Koordinat', accessor: 'koordinat', render: (v) => <span className="text-xs font-mono text-slate-500">{v}</span> },
    { key: 'fasilitas', header: 'Data Fasilitas', accessor: (row) => row.fasilitas_pelabuhan?.length > 0 ? 1 : 0,
      render: (v) => v
        ? <span className="inline-flex items-center gap-1 text-xs text-success-500"><CheckCircle2 size={12} /> Lengkap</span>
        : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><XCircle size={12} /> Belum dilengkapi</span>
    },
    { key: 'status', header: 'Status', accessor: 'status',
      render: (v) => <Badge variant={v === 'Aktif' ? 'aktif' : 'nonaktif'}>{v}</Badge>
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Fasilitas Pelabuhan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {canEdit ? 'Kelola data fasilitas dan dokumentasi pelabuhan.' : 'Data fasilitas pelabuhan yang dikelola oleh UPP.'}
        </p>
      </div>

      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={pelabuhanList}
            loading={loading}
            searchPlaceholder="Cari pelabuhan..."
            actions={(row) => (
              <button onClick={() => navigate(`/dashboard/fasilitas-pelabuhan/${row.id}`)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title={canEdit ? 'Kelola Fasilitas' : 'Lihat Detail'}>
                {canEdit ? <Pencil size={15} /> : <Eye size={15} />}
              </button>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
