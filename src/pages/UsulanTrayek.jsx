import { useMemo, useState } from 'react';
import { Plus, Eye, Download, Check, X, MapPin, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import DocumentList from '../components/ui/DocumentList';
import UploadButton from '../components/ui/UploadButton';
import TrayekMap from '../components/maps/TrayekMap';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { getLampiranUrl, removeLampiran } from '../lib/storage';
import { resolvePelabuhanCoords } from '../lib/geo';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const STATUS_VARIANT = { Menunggu: 'warning', Diterima: 'aktif', Ditolak: 'nonaktif' };
const EMPTY_FORM = { kabupaten: '', judul_usulan: '', usulan_rute: '', alasan: '', trayek_existing: [] };

function resolveUsulanStops(rute, pelabuhanRows) {
  const matched = [];
  const unmatched = [];
  (rute || []).forEach((name, i) => {
    const cleanName = name.trim().toLowerCase();
    const found = pelabuhanRows.find((p) => p.nama?.replace('Pelabuhan ', '').toLowerCase() === cleanName);
    const coords = found ? resolvePelabuhanCoords(found) : null;
    if (found && coords) {
      matched.push({ urutan: i + 1, nama: found.nama, kabupaten: found.kabupaten, ...coords });
    } else {
      unmatched.push(name);
    }
  });
  return { matched, unmatched };
}

export default function UsulanTrayek() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDokumen, setPendingDokumen] = useState([]);
  const [draftFolder, setDraftFolder] = useState(() => `usulan-trayek/draft-${crypto.randomUUID()}`);
  const toast = useToast();

  const { role: userRole } = useAuth();
  const isAdmin = userRole === ROLES.ADMIN;

  const { rows: usulanTrayekList, loading, insert, update } = useSupabaseTable('usulan_trayek', { order: { column: 'created_at', ascending: false } });
  const { rows: pelabuhanRows } = useSupabaseTable('pelabuhan', { select: 'nama, kabupaten, fasilitas_pelabuhan(koordinat)' });
  const { rows: trayekRows } = useSupabaseTable('trayek', { select: 'kode, nama', order: { column: 'kode' } });
  const kabupatenOptions = useMemo(
    () => [...new Set(pelabuhanRows.map((p) => p.kabupaten))].filter(Boolean).sort(),
    [pelabuhanRows]
  );

  const isUsulanBaru = form.trayek_existing.length === 0;

  const openSubmitModal = () => {
    setForm(EMPTY_FORM);
    setPendingDokumen([]);
    setDraftFolder(`usulan-trayek/draft-${crypto.randomUUID()}`);
    setModalOpen(true);
  };

  const toggleTrayekExisting = (kode) => {
    setForm((prev) => ({
      ...prev,
      trayek_existing: prev.trayek_existing.includes(kode)
        ? prev.trayek_existing.filter((k) => k !== kode)
        : [...prev.trayek_existing, kode],
    }));
  };

  const handleSubmit = async () => {
    if (isUsulanBaru && (!form.alasan.trim() || pendingDokumen.length === 0)) {
      toast('Alasan/Justifikasi dan Dokumen Pendukung wajib diisi untuk usulan trayek baru.', 'error');
      return;
    }
    const payload = {
      kabupaten: form.kabupaten,
      judul_usulan: form.judul_usulan,
      usulan_rute: form.usulan_rute.split(',').map((s) => s.trim()).filter(Boolean),
      trayek_existing: form.trayek_existing,
      alasan: form.alasan,
      dokumen: pendingDokumen,
    };
    const { error } = await insert(payload);
    if (error) { toast(error.message, 'error'); return; }
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setPendingDokumen([]);
    toast('Usulan trayek berhasil diajukan!', 'success');
  };

  const handleDownloadFirst = async (row) => {
    if (!row.dokumen?.length) { toast('Tidak ada dokumen untuk usulan ini.', 'info'); return; }
    const { url, error } = await getLampiranUrl(row.dokumen[0]);
    if (error || !url) { toast(error?.message || 'Gagal membuka dokumen', 'error'); return; }
    window.open(url, '_blank');
  };

  const handleDecision = async (row, status) => {
    const { error } = await update(row.id, { status });
    if (error) { toast(error.message, 'error'); return; }
    toast(status === 'Diterima' ? 'Usulan trayek diterima' : 'Usulan trayek ditolak', status === 'Diterima' ? 'success' : 'warning');
  };

  const columns = [
    { key: 'judul_usulan', header: 'Usulan Trayek', accessor: 'judul_usulan', render: (v) => <span className="font-semibold text-navy-900">{v}</span> },
    { key: 'kabupaten', header: 'Kabupaten Pengusul', accessor: 'kabupaten' },
    { key: 'tanggal_usulan', header: 'Tanggal', accessor: 'tanggal_usulan', render: (v) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'status', header: 'Status', accessor: 'status', render: (v) => <Badge variant={STATUS_VARIANT[v]}>{v}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Usulan Trayek</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin ? 'Verifikasi usulan trayek baru dari Pemerintah Kabupaten/Kota.' : 'Ajukan usulan trayek baru ke Dinas Perhubungan.'}
          </p>
        </div>
        {!isAdmin && (
          <Button icon={Plus} onClick={openSubmitModal}>Ajukan Usulan Baru</Button>
        )}
      </div>

      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={usulanTrayekList}
            loading={loading}
            searchPlaceholder="Cari usulan trayek..."
            actions={(row) => (
              <>
                <button onClick={() => setDetailModal(row)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Lihat Detail">
                  <Eye size={15} />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDownloadFirst(row)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Download Dokumen">
                    <Download size={15} />
                  </button>
                )}
                {isAdmin && row.status === 'Menunggu' && (
                  <>
                    <button onClick={() => handleDecision(row, 'Diterima')} className="p-1.5 rounded-md text-slate-400 hover:text-success-500 hover:bg-success-500/10 transition-colors cursor-pointer" title="Terima">
                      <Check size={15} />
                    </button>
                    <button onClick={() => handleDecision(row, 'Ditolak')} className="p-1.5 rounded-md text-slate-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer" title="Tolak">
                      <X size={15} />
                    </button>
                  </>
                )}
              </>
            )}
          />
        </div>
      </Card>

      {/* Ajukan Usulan Baru */}
      {!isAdmin && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajukan Usulan Trayek Baru" size="lg"
          footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSubmit}>Ajukan</Button></>}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kabupaten Pengusul</label>
              <select value={form.kabupaten} onChange={(e) => setForm({ ...form, kabupaten: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Pilih kabupaten...</option>
                {kabupatenOptions.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode Trayek</label>
              <input type="text" placeholder="R-XX" value={form.judul_usulan} onChange={(e) => setForm({ ...form, judul_usulan: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Trayek yang Diperpanjang/Diubah <span className="text-slate-400">(opsional — kosongkan jika ini trayek baru)</span></label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-surface-50 rounded-lg border border-surface-200 max-h-32 overflow-y-auto">
                {trayekRows.length === 0 && <p className="text-xs text-slate-400 italic col-span-2">Belum ada trayek terdaftar.</p>}
                {trayekRows.map((t) => (
                  <label key={t.kode} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.trayek_existing.includes(t.kode)} onChange={() => toggleTrayekExisting(t.kode)} className="w-3.5 h-3.5 rounded border-surface-300 text-sea-600 focus:ring-cyan-500" />
                    <span className="font-mono">{t.kode}</span> — {t.nama}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rute yang Diusulkan (pelabuhan, pisahkan dengan koma)</label>
              <textarea rows={2} placeholder="Bitung, Tahuna, Lirung, Melonguane, Karatung" value={form.usulan_rute} onChange={(e) => setForm({ ...form, usulan_rute: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Alasan / Justifikasi <span className={isUsulanBaru ? 'text-danger-500' : 'text-slate-400'}>({isUsulanBaru ? 'wajib untuk usulan baru' : 'opsional'})</span>
              </label>
              <textarea rows={3} placeholder="Jelaskan kebutuhan dan dampak usulan trayek ini..." value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Dokumen Pendukung <span className={isUsulanBaru ? 'text-danger-500' : 'text-slate-400'}>({isUsulanBaru ? 'wajib untuk usulan baru' : 'opsional'})</span>
              </label>
              <p className="text-xs text-slate-400 mb-2">Surat Bupati, Kajian Ekonomi, Usulan Trayek, Dokumen Pendukung (PDF/DOCX)</p>
              <DocumentList
                paths={pendingDokumen}
                icon={FileText}
                emptyText="Belum ada dokumen dipilih."
                onRemove={(path) => { removeLampiran(path); setPendingDokumen((prev) => prev.filter((p) => p !== path)); }}
              />
              <div className="mt-2">
                <UploadButton folder={draftFolder} accept=".pdf,.doc,.docx" label="Pilih Dokumen" icon={FileText}
                  onUploaded={(path) => setPendingDokumen((prev) => [...prev, path])} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.judul_usulan || ''} size="lg">
        {detailModal && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={14} className="text-sea-500" /> {detailModal.kabupaten}
              </div>
              <Badge variant={STATUS_VARIANT[detailModal.status]}>{detailModal.status}</Badge>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Trayek Existing</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(detailModal.trayek_existing || []).length === 0 && <p className="text-xs text-slate-400 italic">Tidak ada.</p>}
                {(detailModal.trayek_existing || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-navy-900 bg-surface-50 px-2.5 py-1 rounded-lg">{p}</span>
                    {i < detailModal.trayek_existing.length - 1 && <span className="text-slate-300">→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Usulan Rute</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(detailModal.usulan_rute || []).map((p, i) => {
                  const isNew = !(detailModal.trayek_existing || []).includes(p);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-sm px-2.5 py-1 rounded-lg ${isNew ? 'bg-cyan-500/10 text-cyan-700 font-semibold ring-1 ring-cyan-500/30' : 'bg-surface-50 text-navy-900'}`}>{p}</span>
                      {i < detailModal.usulan_rute.length - 1 && <span className="text-slate-300">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Peta Jaringan Trayek</p>
              {(() => {
                const { matched, unmatched } = resolveUsulanStops(detailModal.usulan_rute, pelabuhanRows);
                return (
                  <>
                    <TrayekMap stops={matched} />
                    {unmatched.length > 0 && (
                      <p className="text-xs text-slate-400 italic mt-1.5">
                        Belum ada koordinat untuk: {unmatched.join(', ')}.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Alasan</p>
              <p className="text-sm text-navy-800 leading-relaxed">{detailModal.alasan}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dokumen</p>
              <DocumentList paths={detailModal.dokumen || []} icon={FileText} emptyText="Tidak ada dokumen." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
