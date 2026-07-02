import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, Ship, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_FORM = { nama: '', tipe: 'Kapal Perintis', kapasitas_penumpang: '', kapasitas_muatan: '', status: 'Beroperasi', tahun_buat: '', operator_id: '' };

export default function Armada() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterOperator, setFilterOperator] = useState('');
  const toast = useToast();

  const { role: userRole, user } = useAuth();
  const canManage = userRole === ROLES.ADMIN;
  const isOperator = userRole === ROLES.OPERATOR;
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const { rows: kapalList, loading, insert, update, remove } = useSupabaseTable('kapal', {
    select: '*, operator:operator_id(nama, instansi)',
    order: { column: 'created_at', ascending: false },
    eq: effectiveOperatorId ? { operator_id: effectiveOperatorId } : undefined,
  });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      nama: row.nama || '', tipe: row.tipe || '', status: row.status || 'Beroperasi',
      kapasitas_penumpang: row.kapasitas_penumpang ?? '', kapasitas_muatan: row.kapasitas_muatan ?? '', tahun_buat: row.tahun_buat ?? '',
      operator_id: row.operator_id || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      nama: form.nama, tipe: form.tipe, status: form.status,
      kapasitas_penumpang: form.kapasitas_penumpang === '' ? null : Number(form.kapasitas_penumpang),
      kapasitas_muatan: form.kapasitas_muatan === '' ? null : Number(form.kapasitas_muatan),
      tahun_buat: form.tahun_buat === '' ? null : Number(form.tahun_buat),
      operator_id: form.operator_id || null,
    };
    const { error } = editingId ? await update(editingId, payload) : await insert(payload);
    if (error) { toast(error.message, 'error'); return; }
    setModalOpen(false);
    toast(editingId ? 'Kapal berhasil diperbarui!' : 'Kapal berhasil ditambahkan!', 'success');
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus kapal "${row.nama}"?`)) return;
    const { error } = await remove(row.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Kapal berhasil dihapus.', 'success');
  };

  const columns = [
    { key: 'nama', header: 'Nama Kapal', accessor: 'nama', render: (v) => <span className="font-semibold text-navy-900">{v}</span> },
    { key: 'operator', header: 'Operator', accessor: (row) => row.operator?.instansi || '', render: (v) => v ? <span className="text-sm">{v}</span> : <span className="text-xs text-slate-400 italic">Belum ditentukan</span> },
    { key: 'tipe', header: 'Tipe', accessor: 'tipe' },
    { key: 'kapasitas_penumpang', header: 'Kapasitas Penumpang', accessor: 'kapasitas_penumpang', render: (v) => <span className="font-mono">{v} org</span> },
    { key: 'kapasitas_muatan', header: 'Kapasitas Muatan', accessor: 'kapasitas_muatan', render: (v) => <span className="font-mono">{v} ton</span> },
    { key: 'tahun_buat', header: 'Tahun', accessor: 'tahun_buat' },
    { key: 'status', header: 'Status', accessor: 'status',
      render: (v) => <Badge variant={v === 'Beroperasi' ? 'beroperasi' : 'docking'}>{v}</Badge>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Armada</h1>
          <p className="text-sm text-slate-500 mt-0.5">Data kapal perintis: nama, operator, dan status kapal.</p>
        </div>
        {canManage && (
          <Button icon={Plus} onClick={openAdd}>Tambah Kapal</Button>
        )}
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

      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={kapalList}
            loading={loading}
            searchPlaceholder="Cari kapal..."
            actions={(row) => (
              <>
                <button onClick={() => setDetailModal(row)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Lihat Detail">
                  <Eye size={15} />
                </button>
                {canManage && (
                  <>
                    <button onClick={() => openEdit(row)} className="p-1.5 rounded-md text-slate-400 hover:text-warning-500 hover:bg-warning-500/10 transition-colors cursor-pointer" title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(row)} className="p-1.5 rounded-md text-slate-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer" title="Hapus">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </>
            )}
          />
        </div>
      </Card>

      {canManage && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Kapal' : 'Tambah Kapal Baru'} size="md"
          footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>Simpan Kapal</Button></>}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kapal</label>
              <input type="text" placeholder="KM. ..." value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <Select
                label="Operator"
                value={form.operator_id}
                onChange={(e) => setForm({ ...form, operator_id: e.target.value })}
                placeholder="— Belum ditentukan —"
                options={operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }))}
              />
              <p className="text-xs text-slate-400 mt-1">Operator dapat diubah kapan saja apabila penugasan kapal berganti.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kapasitas Penumpang</label>
                <input type="number" min="0" placeholder="0" value={form.kapasitas_penumpang} onChange={(e) => setForm({ ...form, kapasitas_penumpang: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kapasitas Muatan (ton)</label>
                <input type="number" min="0" placeholder="0" value={form.kapasitas_muatan} onChange={(e) => setForm({ ...form, kapasitas_muatan: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tahun Buat</label>
                <input type="number" min="0" placeholder="2020" value={form.tahun_buat} onChange={(e) => setForm({ ...form, tahun_buat: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <Select
                  label="Status"
                  clearable={false}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={['Beroperasi', 'Docking']}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.nama || ''} size="md">
        {detailModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sea-500/10 flex items-center justify-center">
                <Ship size={20} className="text-sea-500" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">{detailModal.nama}</p>
                <Badge variant={detailModal.status === 'Beroperasi' ? 'beroperasi' : 'docking'}>{detailModal.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><p className="text-xs text-slate-400">Operator</p><p className="font-semibold text-navy-900">{detailModal.operator?.instansi || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Tipe</p><p className="font-semibold text-navy-900">{detailModal.tipe}</p></div>
              <div><p className="text-xs text-slate-400">Tahun Buat</p><p className="font-semibold text-navy-900">{detailModal.tahun_buat}</p></div>
              <div><p className="text-xs text-slate-400">Kapasitas Penumpang</p><p className="font-semibold text-navy-900">{detailModal.kapasitas_penumpang} orang</p></div>
              <div><p className="text-xs text-slate-400">Kapasitas Muatan</p><p className="font-semibold text-navy-900">{detailModal.kapasitas_muatan} ton</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
