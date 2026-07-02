import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, MapPin, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import TrayekMap from '../components/maps/TrayekMap';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { resolvePelabuhanCoords } from '../lib/geo';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_FORM = { kode: '', nama: '', kapal_id: '', status: 'Aktif' };

function singgahNames(row) {
  return (row.trayek_singgah || [])
    .slice()
    .sort((a, b) => a.urutan - b.urutan)
    .map((s) => s.pelabuhan?.nama?.replace('Pelabuhan ', '') || '');
}

function routeStops(row) {
  return (row.trayek_singgah || [])
    .slice()
    .sort((a, b) => a.urutan - b.urutan)
    .map((s) => {
      const coords = resolvePelabuhanCoords(s.pelabuhan);
      if (!coords) return null;
      return { urutan: s.urutan, nama: s.pelabuhan?.nama || '', kabupaten: s.pelabuhan?.kabupaten, ...coords };
    })
    .filter(Boolean);
}

export default function ManajemenTrayek() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPelabuhan, setSelectedPelabuhan] = useState([]);
  const [jarakMap, setJarakMap] = useState({});
  const [filterOperator, setFilterOperator] = useState('');
  const toast = useToast();

  // Hanya Admin yang boleh membuat/mengubah kode trayek
  const { role: userRole, user } = useAuth();
  const canManage = userRole === ROLES.ADMIN;
  const isOperator = userRole === ROLES.OPERATOR;
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const { rows: allTrayekList, loading, insert, update, remove, refetch } = useSupabaseTable('trayek', {
    select: '*, kapal:kapal_id(nama, operator_id, operator:operator_id(nama, instansi)), trayek_singgah(urutan, jarak, pelabuhan:pelabuhan_id(nama, kabupaten, fasilitas_pelabuhan(koordinat)))',
    order: { column: 'created_at', ascending: false },
  });
  // Operator hanya boleh melihat trayek untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const trayekList = effectiveOperatorId
    ? allTrayekList.filter((t) => t.kapal?.operator_id === effectiveOperatorId)
    : allTrayekList;
  const { rows: kapalList } = useSupabaseTable('kapal', { select: '*, operator:operator_id(instansi)', order: { column: 'nama' } });
  const { rows: pelabuhanList } = useSupabaseTable('pelabuhan', { order: { column: 'nama' } });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedPelabuhan([]);
    setJarakMap({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ kode: row.kode, nama: row.nama, kapal_id: row.kapal_id || '', status: row.status || 'Aktif' });
    const ordered = (row.trayek_singgah || []).slice().sort((a, b) => a.urutan - b.urutan);
    const ids = ordered.map((s) => pelabuhanList.find((p) => p.nama === s.pelabuhan?.nama)?.id).filter(Boolean);
    setSelectedPelabuhan(ids);
    const jarakInit = {};
    ordered.forEach((s) => {
      const pid = pelabuhanList.find((p) => p.nama === s.pelabuhan?.nama)?.id;
      if (pid != null) jarakInit[pid] = s.jarak ?? '';
    });
    setJarakMap(jarakInit);
    setModalOpen(true);
  };

  const togglePelabuhan = (pelabuhanId) => {
    setSelectedPelabuhan((prev) =>
      prev.includes(pelabuhanId) ? prev.filter((id) => id !== pelabuhanId) : [...prev, pelabuhanId]
    );
  };

  const handleSave = async () => {
    const payload = {
      kode: form.kode, nama: form.nama,
      kapal_id: form.kapal_id ? Number(form.kapal_id) : null, status: form.status,
    };

    let trayekId = editingId;
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast(error.message, 'error'); return; }
      await supabase.from('trayek_singgah').delete().eq('trayek_id', editingId);
    } else {
      const { data, error } = await insert(payload);
      if (error) { toast(error.message, 'error'); return; }
      trayekId = data[0].id;
    }

    if (selectedPelabuhan.length > 0) {
      const singgahRows = selectedPelabuhan.map((pelabuhan_id, idx) => ({ trayek_id: trayekId, pelabuhan_id, urutan: idx + 1, jarak: jarakMap[pelabuhan_id] !== '' && jarakMap[pelabuhan_id] != null ? Number(jarakMap[pelabuhan_id]) : null }));
      const { error: singgahError } = await supabase.from('trayek_singgah').insert(singgahRows);
      if (singgahError) { toast(singgahError.message, 'error'); return; }
    }

    refetch();
    setModalOpen(false);
    toast(editingId ? 'Trayek berhasil diperbarui!' : 'Trayek berhasil ditambahkan!', 'success');
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus trayek "${row.kode}"?`)) return;
    const { error } = await remove(row.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Trayek berhasil dihapus.', 'success');
  };

  const columns = [
    { key: 'kode', header: 'Kode', accessor: 'kode', render: (v) => <span className="font-mono font-semibold text-sea-600">{v}</span> },
    { key: 'nama', header: 'Nama Trayek', accessor: 'nama' },
    { key: 'operator', header: 'Operator', accessor: (row) => row.kapal?.operator?.instansi || '', render: (v) => v ? <span className="text-sm">{v}</span> : <span className="text-xs text-slate-400 italic">Belum ditentukan</span> },
    { key: 'pelabuhan', header: 'Pelabuhan Singgah', accessor: (row) => singgahNames(row), sortable: false,
      render: (v) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {v.slice(0, 3).map((p, i) => (
            <span key={i} className="text-xs bg-surface-100 text-slate-600 px-1.5 py-0.5 rounded">{p}</span>
          ))}
          {v.length > 3 && <span className="text-xs text-slate-400">+{v.length - 3} lainnya</span>}
        </div>
      )
    },
    { key: 'kapal', header: 'Kapal', accessor: (row) => row.kapal?.nama || '', render: (v) => <span className="text-xs">{v}</span> },
    { key: 'status', header: 'Status', accessor: 'status',
      render: (v) => <Badge variant={v === 'Aktif' ? 'aktif' : 'nonaktif'}>{v}</Badge>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Manajemen Trayek</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola trayek angkutan laut perintis dan pelabuhan singgah.</p>
        </div>
        {canManage && (
          <Button icon={Plus} onClick={openAdd}>Tambah Trayek</Button>
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
            data={trayekList}
            loading={loading}
            searchPlaceholder="Cari trayek..."
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

      {/* Add/Edit Modal */}
      {canManage && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Trayek' : 'Tambah Trayek Baru'} size="lg"
          footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>Simpan Trayek</Button></>}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode Trayek</label>
              <input type="text" placeholder="R-XX" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Trayek</label>
              <input type="text" placeholder="cth. Bitung — Ternate" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pelabuhan Singgah</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-surface-50 rounded-lg border border-surface-200 max-h-48 overflow-y-auto">
                {pelabuhanList.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selectedPelabuhan.includes(p.id)} onChange={() => togglePelabuhan(p.id)} className="w-3.5 h-3.5 rounded border-surface-300 text-sea-600 focus:ring-cyan-500" />
                    {p.nama.replace('Pelabuhan ', '')}
                  </label>
                ))}
              </div>
              {selectedPelabuhan.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Jarak Antar Pelabuhan (mil laut)</p>
                  <div className="flex flex-col gap-0">
                    {selectedPelabuhan.map((id, idx) => {
                      const p = pelabuhanList.find((x) => x.id === id);
                      const nama = p?.nama?.replace('Pelabuhan ', '') || id;
                      return (
                        <div key={id}>
                          <div className="flex items-center gap-2 py-1">
                            <span className="w-2 h-2 rounded-full bg-sea-500 flex-shrink-0" />
                            <span className="text-sm text-navy-900">{nama}</span>
                          </div>
                          {idx < selectedPelabuhan.length - 1 && (
                            <div className="flex items-center gap-2 ml-1 py-0.5">
                              <div className="w-px h-6 bg-surface-300 ml-0.5" />
                              <input
                                type="number" min="0" step="0.1" placeholder="jarak"
                                value={jarakMap[selectedPelabuhan[idx + 1]] ?? ''}
                                onChange={(e) => setJarakMap((prev) => ({ ...prev, [selectedPelabuhan[idx + 1]]: e.target.value }))}
                                className="w-24 px-2 py-1 bg-white border border-surface-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                              <span className="text-xs text-slate-400">mil</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Total: <span className="font-semibold text-navy-900">
                      {selectedPelabuhan.slice(1).reduce((sum, id) => sum + (Number(jarakMap[id]) || 0), 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span> mil laut
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Kapal"
                  value={form.kapal_id}
                  onChange={(e) => setForm({ ...form, kapal_id: e.target.value })}
                  placeholder="— Pilih Kapal —"
                  options={kapalList.map((k) => ({ value: k.id, label: `${k.nama}${k.operator?.instansi ? ` — ${k.operator.instansi}` : ''}` }))}
                />
              </div>
              <div>
                <Select
                  label="Status"
                  clearable={false}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={['Aktif', 'Nonaktif']}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Detail Trayek ${detailModal?.kode || ''}`} size="lg">
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400">Kode</p><p className="font-semibold text-navy-900 font-mono">{detailModal.kode}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><Badge variant={detailModal.status === 'Aktif' ? 'aktif' : 'nonaktif'}>{detailModal.status}</Badge></div>
              <div className="sm:col-span-2"><p className="text-xs text-slate-400">Operator</p><p className="font-semibold text-navy-900">{detailModal.kapal?.operator?.instansi || '—'}</p></div>
            </div>
            <div><p className="text-xs text-slate-400 mb-2">Kapal</p><p className="font-semibold text-navy-900">{detailModal.kapal?.nama}</p></div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Rute Pelabuhan</p>
              <div className="flex items-center gap-1 flex-wrap">
                {[...(detailModal.trayek_singgah || [])].sort((a, b) => a.urutan - b.urutan).map((s, i, arr) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-sm text-navy-900 bg-surface-50 px-2.5 py-1 rounded-lg">
                      <MapPin size={12} className="text-sea-500" /> {s.pelabuhan?.nama?.replace('Pelabuhan ', '')}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs mx-1">
                        —{arr[i + 1].jarak != null ? ` ${arr[i + 1].jarak} mil ` : ' '}—
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {(() => {
                const stops = [...(detailModal.trayek_singgah || [])].sort((a, b) => a.urutan - b.urutan);
                const total = stops.slice(1).reduce((sum, s) => sum + (Number(s.jarak) || 0), 0);
                return total > 0 ? (
                  <p className="text-xs text-slate-400 mt-1.5">Total jarak: <span className="font-semibold text-navy-900">{total.toLocaleString('id-ID', { maximumFractionDigits: 2 })} mil laut</span></p>
                ) : null;
              })()}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Peta Jaringan Trayek</p>
              <TrayekMap stops={routeStops(detailModal)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
