import { useState } from 'react';
import { Landmark, FileText, Pencil, MapPin } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DocumentList from '../components/ui/DocumentList';
import UploadButton from '../components/ui/UploadButton';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { removeLampiran } from '../lib/storage';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const NARASI_FIELDS = [
  { key: 'kondisi_ekonomi', label: 'Kondisi Ekonomi Daerah' },
  { key: 'potensi_wilayah', label: 'Potensi Wilayah' },
  { key: 'potensi_perdagangan', label: 'Potensi Perdagangan' },
  { key: 'potensi_hasil_laut', label: 'Potensi Hasil Laut' },
  { key: 'potensi_penumpang', label: 'Potensi Penumpang' },
];

export default function KondisiEkonomi() {
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({});
  const toast = useToast();

  const { role: userRole } = useAuth();
  const canEdit = userRole === ROLES.PEMKAB || userRole === ROLES.ADMIN;

  const { rows: kondisiEkonomiList, loading, update } = useSupabaseTable('kondisi_ekonomi', { order: { column: 'created_at', ascending: false } });

  const openEdit = (item) => {
    setEditModal(item);
    setForm({ ...Object.fromEntries(NARASI_FIELDS.map(f => [f.key, item[f.key] || ''])), dokumen: item.dokumen || [] });
  };

  const handleSave = async () => {
    const { error } = await update(editModal.id, form);
    if (error) { toast(error.message, 'error'); return; }
    setEditModal(null);
    toast('Data kondisi ekonomi berhasil disimpan!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Kondisi Ekonomi Daerah</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {canEdit ? 'Lengkapi data pendukung evaluasi trayek perintis untuk daerah Anda.' : 'Data pendukung evaluasi trayek perintis dari Pemkab.'}
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat data...</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        {kondisiEkonomiList.map(item => (
          <Card key={item.id}>
            <CardHeader action={canEdit && (
              <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Edit">
                <Pencil size={15} />
              </button>
            )}>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark size={16} className="text-sea-500" /> {item.kabupaten}
              </CardTitle>
              <CardDescription>Data potensi ekonomi dan kewilayahan.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {NARASI_FIELDS.map(f => (
                <div key={f.key}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</p>
                  <p className="text-sm text-navy-800 leading-relaxed">{item[f.key]}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-surface-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dokumen Pendukung</p>
                <DocumentList paths={item.dokumen || []} icon={FileText} emptyText="Belum ada dokumen diunggah." />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title={`Edit Kondisi Ekonomi — ${editModal?.kabupaten || ''}`} size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditModal(null)}>Batal</Button><Button onClick={handleSave}>Simpan</Button></>}
      >
        {editModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin size={14} className="text-sea-500" /> {editModal.kabupaten}
            </div>
            {NARASI_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <textarea rows={2} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dokumen Pendukung</label>
              <DocumentList
                paths={form.dokumen || []}
                icon={FileText}
                emptyText="Belum ada dokumen."
                onRemove={(path) => { removeLampiran(path); setForm((f) => ({ ...f, dokumen: (f.dokumen || []).filter((p) => p !== path) })); }}
              />
              <div className="mt-2">
                <UploadButton folder={`kondisi-ekonomi/${editModal.id}`} accept=".pdf,.doc,.docx" label="Unggah Dokumen" icon={FileText}
                  onUploaded={(path) => setForm((f) => ({ ...f, dokumen: [...(f.dokumen || []), path] }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
