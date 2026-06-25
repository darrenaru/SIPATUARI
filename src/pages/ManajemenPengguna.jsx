import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import { ROLE_OPTIONS } from '../constants/roles';

const roleLabel = (value) => ROLE_OPTIONS.find((opt) => opt.value === value)?.label || value;
const EMPTY_NEW_FORM = { nama: '', email: '', password: '', nip: '', instansi: '', role: 'operator', status: 'Aktif' };

async function extractFunctionError(error) {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // respons bukan JSON, pakai pesan default di bawah
    }
  }
  return error?.message || 'Gagal menambah pengguna.';
}

export default function ManajemenPengguna() {
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ role: '', instansi: '', status: 'Aktif' });
  const [newForm, setNewForm] = useState(EMPTY_NEW_FORM);
  const toast = useToast();

  const { rows: userList, loading, update, refetch } = useSupabaseTable('profiles', { order: { column: 'created_at', ascending: false } });

  const openEdit = (row) => {
    setEditModal(row);
    setForm({ role: row.role, instansi: row.instansi || '', status: row.status });
  };

  const handleSave = async () => {
    if (form.role === 'operator' && !form.instansi.trim()) {
      toast('Nama Perusahaan/Operator wajib diisi untuk akun operator.', 'error');
      return;
    }
    const { error } = await update(editModal.id, form);
    if (error) { toast(error.message, 'error'); return; }
    setEditModal(null);
    toast('Pengguna berhasil diperbarui!', 'success');
  };

  const openAdd = () => {
    setNewForm(EMPTY_NEW_FORM);
    setAddModal(true);
  };

  const handleAdd = async () => {
    if (!newForm.nama || !newForm.email || !newForm.password) {
      toast('Nama, email, dan password wajib diisi.', 'error');
      return;
    }
    if (newForm.role === 'operator' && !newForm.instansi.trim()) {
      toast('Nama Perusahaan/Operator wajib diisi untuk akun operator.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.functions.invoke('admin-create-user', { body: newForm });
    setSaving(false);
    if (error) {
      toast(await extractFunctionError(error), 'error');
      return;
    }
    refetch();
    setAddModal(false);
    toast('Pengguna berhasil ditambahkan!', 'success');
  };

  const informUnavailable = (action) => toast(
    `${action} akun login memerlukan proses admin Supabase terpisah (butuh service role key, tidak tersedia di browser) — belum didukung di halaman ini.`,
    'info'
  );

  const columns = [
    { key: 'nama', header: 'Nama', accessor: 'nama', render: (v) => <span className="font-semibold text-navy-900">{v}</span> },
    { key: 'email', header: 'Email', accessor: 'email', render: (v) => <span className="text-xs font-mono text-slate-500">{v}</span> },
    { key: 'instansi', header: 'Instansi', accessor: 'instansi' },
    { key: 'role', header: 'Role', accessor: 'role', render: (v) => <Badge variant="sea">{roleLabel(v)}</Badge> },
    { key: 'status', header: 'Status', accessor: 'status', render: (v) => <Badge variant={v === 'Aktif' ? 'aktif' : 'nonaktif'}>{v}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola akun pengguna sistem untuk seluruh role.</p>
        </div>
        <Button icon={Plus} onClick={openAdd}>Tambah Pengguna</Button>
      </div>

      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={userList}
            loading={loading}
            searchPlaceholder="Cari pengguna..."
            actions={(row) => (
              <>
                <button onClick={() => openEdit(row)} className="p-1.5 rounded-md text-slate-400 hover:text-warning-500 hover:bg-warning-500/10 transition-colors cursor-pointer" title="Edit">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => informUnavailable('Menghapus')} className="p-1.5 rounded-md text-slate-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer" title="Hapus">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          />
        </div>
      </Card>

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title={`Edit Pengguna — ${editModal?.nama || ''}`} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditModal(null)}>Batal</Button><Button onClick={handleSave}>Simpan Perubahan</Button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
            <input type="text" value={editModal?.nama || ''} disabled className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-lg text-sm text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={editModal?.email || ''} disabled className="w-full px-3.5 py-2.5 bg-surface-100 border border-surface-200 rounded-lg text-sm text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{form.role === 'operator' ? 'Nama Perusahaan/Operator' : 'Instansi'}</label>
            <input type="text" placeholder={form.role === 'operator' ? 'cth. PT. Pelayaran Nasional Indonesia (PELNI)' : 'cth. UPP Pelabuhan Bitung'} value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Aktif</option><option>Nonaktif</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Tambah Pengguna Baru" size="md"
        footer={<><Button variant="ghost" onClick={() => setAddModal(false)}>Batal</Button><Button onClick={handleAdd} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
            <input type="text" value={newForm.nama} onChange={(e) => setNewForm({ ...newForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Awal</label>
              <input type="text" placeholder="min. 6 karakter" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">NIP (untuk login)</label>
              <input type="text" placeholder="opsional" value={newForm.nip} onChange={(e) => setNewForm({ ...newForm, nip: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{newForm.role === 'operator' ? 'Nama Perusahaan/Operator' : 'Instansi'}</label>
              <input type="text" placeholder={newForm.role === 'operator' ? 'cth. PT. Pelayaran Nasional Indonesia (PELNI)' : 'cth. UPP Pelabuhan Bitung'} value={newForm.instansi} onChange={(e) => setNewForm({ ...newForm, instansi: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={newForm.status} onChange={(e) => setNewForm({ ...newForm, status: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Aktif</option><option>Nonaktif</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
