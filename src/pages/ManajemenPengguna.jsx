import { useState } from 'react';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import { ROLE_OPTIONS } from '../constants/roles';

const roleLabel = (value) => ROLE_OPTIONS.find((opt) => opt.value === value)?.label || value;
const EMPTY_NEW_FORM = { nama: '', email: '', password: '', instansi: '', role: 'operator', username: '' };

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
  const [pwModal, setPwModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);
  const [form, setForm] = useState({ role: '', instansi: '', username: '' });
  const [newForm, setNewForm] = useState(EMPTY_NEW_FORM);
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const toast = useToast();

  const { rows: userList, loading, update, refetch } = useSupabaseTable('profiles', { order: { column: 'created_at', ascending: false } });

  const openEdit = (row) => {
    setEditModal(row);
    setForm({ role: row.role, instansi: row.instansi || '', username: row.username || '' });
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

  const handleChangePassword = async () => {
    if (!pwForm.password || !pwForm.confirm) { toast('Password dan konfirmasi wajib diisi.', 'error'); return; }
    if (pwForm.password.length < 6) { toast('Password minimal 6 karakter.', 'error'); return; }
    if (pwForm.password !== pwForm.confirm) { toast('Password dan konfirmasi tidak cocok.', 'error'); return; }
    setSavingPw(true);
    const { error } = await supabase.functions.invoke('admin-update-user', { body: { user_id: pwModal.id, password: pwForm.password } });
    setSavingPw(false);
    if (error) { toast(await extractFunctionError(error), 'error'); return; }
    setPwModal(null);
    setPwForm({ password: '', confirm: '' });
    toast('Password berhasil diubah!', 'success');
  };

  const handleDelete = async () => {
    setSavingDelete(true);
    const { error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: deleteModal.id } });
    setSavingDelete(false);
    if (error) {
      let msg = 'Gagal menghapus pengguna.';
      try {
        const body = await error.context?.json?.();
        if (body?.error) msg = body.error;
        else if (error.message && error.message !== '{}') msg = error.message;
      } catch {
        if (error.message && error.message !== '{}') msg = error.message;
      }
      console.error('Delete user error:', { error, name: error?.name, message: error?.message, deleteModalId: deleteModal?.id });
      toast(msg, 'error');
      return;
    }
    refetch();
    setDeleteModal(null);
    toast('Pengguna berhasil dihapus.', 'success');
  };

  const columns = [
    { key: 'nama', header: 'Nama', accessor: 'nama', render: (v) => <span className="font-semibold text-navy-900">{v}</span> },
    { key: 'email', header: 'Email', accessor: 'email', render: (v) => <span className="text-xs font-mono text-slate-500">{v}</span> },
    { key: 'username', header: 'Username', accessor: 'username', render: (v) => <span className="text-xs font-mono text-slate-500">{v || '—'}</span> },
    { key: 'instansi', header: 'Instansi', accessor: 'instansi' },
    { key: 'role', header: 'Role', accessor: 'role', render: (v) => <Badge variant="sea">{roleLabel(v)}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <button onClick={() => { setPwModal(row); setPwForm({ password: '', confirm: '' }); }} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Ganti Password">
                  <KeyRound size={15} />
                </button>
                <button onClick={() => setDeleteModal(row)} className="p-1.5 rounded-md text-slate-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer" title="Hapus">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          />
        </div>
      </Card>

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Pengguna" size="md"
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username <span className="text-slate-400 font-normal">(opsional)</span></label>
            <input type="text" placeholder="cth. operator_asdp" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{form.role === 'operator' ? 'Nama Perusahaan/Operator' : 'Instansi'}</label>
            <input type="text" placeholder={form.role === 'operator' ? 'cth. PT. Pelayaran Nasional Indonesia (PELNI)' : 'cth. UPP Pelabuhan Bitung'} value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <Select label="Role" clearable={false} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLE_OPTIONS} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!pwModal} onClose={() => setPwModal(null)} title={`Ganti Password — ${pwModal?.nama || ''}`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setPwModal(null)}>Batal</Button><Button onClick={handleChangePassword} disabled={savingPw}>{savingPw ? 'Menyimpan...' : 'Ganti Password'}</Button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Password baru untuk akun <span className="font-semibold text-navy-900">{pwModal?.email}</span>.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
            <input type="password" placeholder="min. 6 karakter" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
            <input type="password" placeholder="ulangi password baru" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Hapus Pengguna" size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteModal(null)}>Batal</Button><Button variant="danger" onClick={handleDelete} disabled={savingDelete}>{savingDelete ? 'Menghapus...' : 'Hapus Permanen'}</Button></>}
      >
        <p className="text-sm text-slate-700">Hapus akun <span className="font-semibold text-navy-900">{deleteModal?.nama}</span> (<span className="font-mono text-xs text-slate-500">{deleteModal?.email}</span>)?</p>
        <p className="text-sm text-danger-600 mt-2">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
      </Modal>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Tambah Pengguna Baru" size="md"
        footer={<><Button variant="ghost" onClick={() => setAddModal(false)}>Batal</Button><Button onClick={handleAdd} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
            <input type="text" value={newForm.nama} onChange={(e) => setNewForm({ ...newForm, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Awal</label>
              <input type="text" placeholder="min. 6 karakter" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username <span className="text-slate-400 font-normal">(opsional)</span></label>
            <input type="text" placeholder="cth. operator_asdp" value={newForm.username} onChange={(e) => setNewForm({ ...newForm, username: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{newForm.role === 'operator' ? 'Nama Perusahaan/Operator' : 'Instansi'}</label>
            <input type="text" placeholder={newForm.role === 'operator' ? 'cth. PT. Pelayaran Nasional Indonesia (PELNI)' : 'cth. UPP Pelabuhan Bitung'} value={newForm.instansi} onChange={(e) => setNewForm({ ...newForm, instansi: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <Select label="Role" clearable={false} value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} options={ROLE_OPTIONS} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
