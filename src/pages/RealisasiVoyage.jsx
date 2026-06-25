import { useState } from 'react';
import { Plus, Navigation, Calendar, Ship, Route, AlertTriangle, MapPin, Check, X, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const ALASAN_OMISI = ['Cuaca buruk', 'Gelombang tinggi', 'Kerusakan kapal', 'Lainnya'];
const STATUS_OPTIONS = ['Belum Disinggahi', 'Sudah Disinggahi', 'Dilewati'];
const EMPTY_FORM = { kapal_id: '', trayek_id: '', tgl_berangkat: '', tgl_tiba: '' };

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalInput(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function latestRequest(requests) {
  return [...(requests || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
}

function DataFields({ input, onChange }) {
  return (
    <div className="space-y-2 pt-1">
      <input
        type="datetime-local"
        value={input.waktu || ''}
        onChange={(e) => onChange('waktu', e.target.value)}
        className="w-full px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" placeholder="Naik" value={input.naik} onChange={(e) => onChange('naik', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <input type="number" min="0" placeholder="Turun" value={input.turun} onChange={(e) => onChange('turun', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <input type="number" min="0" placeholder="Muat (Ton)" value={input.muat} onChange={(e) => onChange('muat', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <input type="number" min="0" placeholder="Bongkar (Ton)" value={input.bongkar} onChange={(e) => onChange('bongkar', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <input type="number" min="0" placeholder="Muat (m³)" value={input.muat_m3} onChange={(e) => onChange('muat_m3', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <input type="number" min="0" placeholder="Bongkar (m³)" value={input.bongkar_m3} onChange={(e) => onChange('bongkar_m3', e.target.value)} className="px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
    </div>
  );
}

export default function RealisasiVoyage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPelabuhan, setSelectedPelabuhan] = useState([]);
  const [singgahModal, setSinggahModal] = useState(null);
  const [singgahInputs, setSinggahInputs] = useState({});
  const [confirmingSave, setConfirmingSave] = useState({});
  const [requestForms, setRequestForms] = useState({});
  const [requestInputs, setRequestInputs] = useState({});
  const [filterOperator, setFilterOperator] = useState('');
  const toast = useToast();

  const { role: userRole, user } = useAuth();
  const isAdmin = userRole === ROLES.ADMIN;
  const isOperator = userRole === ROLES.OPERATOR;
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const { rows: allVoyageList, loading, insert, refetch } = useSupabaseTable('voyage', {
    select: `*, kapal:kapal_id(nama, operator_id), trayek:trayek_id(kode,nama),
      voyage_singgah(id, urutan, status, waktu_singgah, alasan_dilewati, pelabuhan_id, pelabuhan:pelabuhan_id(nama),
        penumpang_data(naik, turun), bongkar_muat_data(muat, muat_m3, bongkar, bongkar_m3),
        voyage_singgah_request(id, status, alasan, proposed_status, proposed_waktu_singgah, proposed_alasan_dilewati,
          proposed_naik, proposed_turun, proposed_muat, proposed_muat_m3, proposed_bongkar, proposed_bongkar_m3, created_at))`,
    order: { column: 'created_at', ascending: false },
  });
  const { rows: allKapalList } = useSupabaseTable('kapal', { order: { column: 'nama' } });
  const { rows: trayekList } = useSupabaseTable('trayek', { order: { column: 'kode' } });
  const { rows: pelabuhanList } = useSupabaseTable('pelabuhan', { order: { column: 'nama' } });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  // Operator hanya boleh melihat & mencatat voyage untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const kapalList = effectiveOperatorId
    ? allKapalList.filter((k) => k.operator_id === effectiveOperatorId)
    : allKapalList;
  const voyageList = effectiveOperatorId
    ? allVoyageList.filter((v) => v.kapal?.operator_id === effectiveOperatorId)
    : allVoyageList;

  const togglePelabuhan = (pelabuhanId) => {
    setSelectedPelabuhan((prev) =>
      prev.includes(pelabuhanId) ? prev.filter((id) => id !== pelabuhanId) : [...prev, pelabuhanId]
    );
  };

  const resetModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setSelectedPelabuhan([]);
  };

  const handleSave = async () => {
    const payload = {
      kapal_id: form.kapal_id ? Number(form.kapal_id) : null,
      trayek_id: form.trayek_id ? Number(form.trayek_id) : null,
      tgl_berangkat: form.tgl_berangkat || null,
      tgl_tiba: form.tgl_tiba || null,
      status: 'Berlayar',
    };
    const { data, error } = await insert(payload);
    if (error) { toast(error.message, 'error'); return; }

    if (selectedPelabuhan.length > 0) {
      const singgahRows = selectedPelabuhan.map((pelabuhan_id, idx) => ({ voyage_id: data[0].id, pelabuhan_id, urutan: idx + 1 }));
      const { error: singgahError } = await supabase.from('voyage_singgah').insert(singgahRows);
      if (singgahError) { toast(singgahError.message, 'error'); return; }
    }

    refetch();
    resetModal();
    toast('Voyage berhasil dicatat!', 'success');
  };

  const openSinggahModal = (row) => {
    setSinggahModal(row);
    const inputs = {};
    const reqInputs = {};
    (row.voyage_singgah || []).forEach((s) => {
      const pen = s.penumpang_data || {};
      const bm = s.bongkar_muat_data || {};
      inputs[s.id] = {
        status: s.status,
        waktu: s.waktu_singgah ? toLocalInput(s.waktu_singgah) : nowLocalInput(),
        naik: pen.naik ?? '',
        turun: pen.turun ?? '',
        muat: bm.muat ?? '',
        muat_m3: bm.muat_m3 ?? '',
        bongkar: bm.bongkar ?? '',
        bongkar_m3: bm.bongkar_m3 ?? '',
        alasan: s.alasan_dilewati || '',
      };
      reqInputs[s.id] = {
        status: s.status === 'Dilewati' ? 'Dilewati' : 'Sudah Disinggahi',
        waktu: s.waktu_singgah ? toLocalInput(s.waktu_singgah) : nowLocalInput(),
        naik: pen.naik ?? '',
        turun: pen.turun ?? '',
        muat: bm.muat ?? '',
        muat_m3: bm.muat_m3 ?? '',
        bongkar: bm.bongkar ?? '',
        bongkar_m3: bm.bongkar_m3 ?? '',
        alasanDilewati: s.alasan_dilewati || '',
        alasanPermintaan: '',
      };
    });
    setSinggahInputs(inputs);
    setRequestInputs(reqInputs);
    setConfirmingSave({});
    setRequestForms({});
  };

  const updateSinggahInput = (id, field, value) => {
    setSinggahInputs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setConfirmingSave((prev) => ({ ...prev, [id]: false }));
  };

  const updateRequestInput = (id, field, value) => {
    setRequestInputs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSimpanClick = (singgahRow) => {
    if (!confirmingSave[singgahRow.id]) {
      setConfirmingSave((prev) => ({ ...prev, [singgahRow.id]: true }));
      return;
    }
    handleSaveSinggah(singgahRow);
  };

  const handleSaveSinggah = async (singgahRow) => {
    const input = singgahInputs[singgahRow.id];
    const isSudah = input.status === 'Sudah Disinggahi';
    const isDilewati = input.status === 'Dilewati';

    if (isDilewati && !input.alasan) { toast('Alasan wajib diisi untuk titik yang dilewati.', 'error'); return; }

    const naik = isDilewati ? 0 : Number(input.naik || 0);
    const turun = isDilewati ? 0 : Number(input.turun || 0);
    const muat = isDilewati ? 0 : Number(input.muat || 0);
    const muat_m3 = isDilewati ? 0 : Number(input.muat_m3 || 0);
    const bongkar = isDilewati ? 0 : Number(input.bongkar || 0);
    const bongkar_m3 = isDilewati ? 0 : Number(input.bongkar_m3 || 0);

    const singgahPayload = { status: input.status, waktu_singgah: null, alasan_dilewati: null };
    if (isSudah) singgahPayload.waktu_singgah = new Date(input.waktu).toISOString();
    if (isDilewati) singgahPayload.alasan_dilewati = input.alasan;

    const { error: singgahError } = await supabase.from('voyage_singgah').update(singgahPayload).eq('id', singgahRow.id);
    if (singgahError) { toast(singgahError.message, 'error'); return; }

    if (isSudah || isDilewati) {
      const { error: penError } = await supabase.from('penumpang_data').upsert({
        voyage_singgah_id: singgahRow.id, voyage_id: singgahModal.id, pelabuhan_id: singgahRow.pelabuhan_id, naik, turun,
      }, { onConflict: 'voyage_singgah_id' });
      if (penError) { toast(penError.message, 'error'); return; }

      const { error: bmError } = await supabase.from('bongkar_muat_data').upsert({
        voyage_singgah_id: singgahRow.id, voyage_id: singgahModal.id, pelabuhan_id: singgahRow.pelabuhan_id, muat, muat_m3, bongkar, bongkar_m3,
      }, { onConflict: 'voyage_singgah_id' });
      if (bmError) { toast(bmError.message, 'error'); return; }
    }

    const allResolved = (singgahModal.voyage_singgah || []).every((s) =>
      s.id === singgahRow.id ? (isSudah || isDilewati) : s.status !== 'Belum Disinggahi'
    );
    const voyagePayload = {};
    if (allResolved) {
      voyagePayload.status = 'Selesai';
      if (!singgahModal.tgl_tiba && isSudah) voyagePayload.tgl_tiba = input.waktu.slice(0, 10);
    }
    if (isDilewati) {
      voyagePayload.deviasi = `Omisi ${singgahRow.pelabuhan?.nama || ''} (${input.alasan})`;
    }
    if (Object.keys(voyagePayload).length > 0) {
      const { error: voyageError } = await supabase.from('voyage').update(voyagePayload).eq('id', singgahModal.id);
      if (voyageError) { toast(voyageError.message, 'error'); return; }
    }

    refetch();
    toast(allResolved ? 'Titik singgah diperbarui — voyage otomatis Selesai!' : 'Titik singgah berhasil diperbarui.', 'success');
    setSinggahModal(null);
  };

  const toggleRequestForm = (id, open) => {
    setRequestForms((prev) => ({ ...prev, [id]: open }));
  };

  const handleSubmitRequest = async (singgahRow) => {
    const input = requestInputs[singgahRow.id];
    if (!input.alasanPermintaan?.trim()) { toast('Alasan permintaan perubahan wajib diisi.', 'error'); return; }
    const isSudah = input.status === 'Sudah Disinggahi';
    const isDilewati = input.status === 'Dilewati';
    if (isDilewati && !input.alasanDilewati) { toast('Alasan dilewati wajib diisi.', 'error'); return; }

    const naik = isDilewati ? 0 : Number(input.naik || 0);
    const turun = isDilewati ? 0 : Number(input.turun || 0);
    const muat = isDilewati ? 0 : Number(input.muat || 0);
    const muat_m3 = isDilewati ? 0 : Number(input.muat_m3 || 0);
    const bongkar = isDilewati ? 0 : Number(input.bongkar || 0);
    const bongkar_m3 = isDilewati ? 0 : Number(input.bongkar_m3 || 0);

    const { error } = await supabase.from('voyage_singgah_request').insert({
      voyage_singgah_id: singgahRow.id,
      requested_by: user.id,
      alasan: input.alasanPermintaan,
      proposed_status: input.status,
      proposed_waktu_singgah: isSudah ? new Date(input.waktu).toISOString() : null,
      proposed_alasan_dilewati: isDilewati ? input.alasanDilewati : null,
      proposed_naik: naik, proposed_turun: turun,
      proposed_muat: muat, proposed_muat_m3: muat_m3, proposed_bongkar: bongkar, proposed_bongkar_m3: bongkar_m3,
    });
    if (error) { toast(error.message, 'error'); return; }

    refetch();
    toast('Permintaan perubahan terkirim, menunggu persetujuan Admin.', 'success');
    setSinggahModal(null);
  };

  const handleReviewRequest = async (singgahRow, request, decision) => {
    if (decision === 'Ditolak') {
      const { error } = await supabase.from('voyage_singgah_request').update({
        status: 'Ditolak', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', request.id);
      if (error) { toast(error.message, 'error'); return; }
      refetch();
      toast('Permintaan perubahan ditolak.', 'success');
      setSinggahModal(null);
      return;
    }

    const { error: singgahError } = await supabase.from('voyage_singgah').update({
      status: request.proposed_status,
      waktu_singgah: request.proposed_waktu_singgah,
      alasan_dilewati: request.proposed_alasan_dilewati,
    }).eq('id', singgahRow.id);
    if (singgahError) { toast(singgahError.message, 'error'); return; }

    const { error: penError } = await supabase.from('penumpang_data').upsert({
      voyage_singgah_id: singgahRow.id, voyage_id: singgahModal.id, pelabuhan_id: singgahRow.pelabuhan_id,
      naik: request.proposed_naik, turun: request.proposed_turun,
    }, { onConflict: 'voyage_singgah_id' });
    if (penError) { toast(penError.message, 'error'); return; }

    const { error: bmError } = await supabase.from('bongkar_muat_data').upsert({
      voyage_singgah_id: singgahRow.id, voyage_id: singgahModal.id, pelabuhan_id: singgahRow.pelabuhan_id,
      muat: request.proposed_muat, muat_m3: request.proposed_muat_m3, bongkar: request.proposed_bongkar, bongkar_m3: request.proposed_bongkar_m3,
    }, { onConflict: 'voyage_singgah_id' });
    if (bmError) { toast(bmError.message, 'error'); return; }

    const allResolved = (singgahModal.voyage_singgah || []).every((s) => s.status !== 'Belum Disinggahi');
    if (allResolved) {
      await supabase.from('voyage').update({ status: 'Selesai' }).eq('id', singgahModal.id);
    }

    const { error: reqError } = await supabase.from('voyage_singgah_request').update({
      status: 'Diterima', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', request.id);
    if (reqError) { toast(reqError.message, 'error'); return; }

    refetch();
    toast('Permintaan perubahan diterima dan data diterapkan.', 'success');
    setSinggahModal(null);
  };

  const columns = [
    { key: 'id', header: 'ID', accessor: 'id', render: (v) => <span className="font-mono text-xs text-slate-400">#{v}</span> },
    { key: 'kapal', header: 'Kapal', accessor: (row) => row.kapal?.nama || '', render: (v) => <span className="font-semibold text-sm">{v}</span> },
    { key: 'trayek', header: 'Trayek', accessor: (row) => row.trayek?.kode || '', render: (v) => <span className="font-mono font-semibold text-sea-600">{v}</span> },
    { key: 'tgl_berangkat', header: 'Berangkat', accessor: 'tgl_berangkat', render: (v) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'tgl_tiba', header: 'Tiba', accessor: 'tgl_tiba', render: (v) => v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-slate-400 italic">—</span> },
    { key: 'singgah', header: 'Singgah', accessor: (row) => row.voyage_singgah || [], sortable: false,
      render: (list) => {
        const total = list.length;
        const done = list.filter((s) => s.status !== 'Belum Disinggahi').length;
        return <span className="text-xs text-slate-500">{done}/{total} selesai</span>;
      }
    },
    { key: 'status', header: 'Status', accessor: 'status',
      render: (v) => <Badge variant={v === 'Selesai' ? 'selesai' : 'berlayar'}>{v}</Badge>
    },
    { key: 'deviasi', header: 'Deviasi', accessor: 'deviasi', sortable: false,
      render: (v) => v
        ? <span className="inline-flex items-center gap-1 text-xs text-warning-500"><AlertTriangle size={12} /> Ya</span>
        : <span className="text-xs text-slate-400">—</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Realisasi Voyage</h1>
          <p className="text-sm text-slate-500 mt-0.5">Input dan monitor realisasi pelayaran kapal perintis.</p>
        </div>

        {/* Tombol Input hanya muncul untuk operator/admin */}
        {(isOperator || isAdmin) && (
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Input Voyage Baru</Button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sea-500/10 flex items-center justify-center">
            <Navigation size={20} className="text-sea-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total Voyage</p>
            <p className="text-2xl font-bold text-navy-900">{voyageList.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
            <Ship size={20} className="text-success-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Selesai</p>
            <p className="text-2xl font-bold text-navy-900">{voyageList.filter(v => v.status === 'Selesai').length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-warning-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Deviasi</p>
            <p className="text-2xl font-bold text-navy-900">{voyageList.filter(v => v.deviasi).length}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="p-5">
          <DataTable
            columns={columns}
            data={voyageList}
            loading={loading}
            searchPlaceholder="Cari voyage..."
            actions={(row) => {
              const show = (row.voyage_singgah?.length || 0) > 0;
              return show && (
                <button onClick={() => openSinggahModal(row)} className="p-1.5 rounded-md text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer" title="Update Persinggahan">
                  <MapPin size={15} />
                </button>
              );
            }}
          />
        </div>
      </Card>

      {/* Add Modal */}
      {(isOperator || isAdmin) && (
        <Modal isOpen={modalOpen} onClose={resetModal} title="Input Voyage Baru" size="lg"
          footer={<><Button variant="ghost" onClick={resetModal}>Batal</Button><Button onClick={handleSave}>Simpan Voyage</Button></>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pilih Kapal</label>
                <select value={form.kapal_id} onChange={(e) => setForm({ ...form, kapal_id: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  <option value="">— Pilih Kapal —</option>
                  {kapalList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pilih Trayek</label>
                <select value={form.trayek_id} onChange={(e) => setForm({ ...form, trayek_id: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  <option value="">— Pilih Trayek —</option>
                  {trayekList.map(t => <option key={t.id} value={t.id}>{t.kode} — {t.nama}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Keberangkatan</label>
                <input type="date" value={form.tgl_berangkat} onChange={(e) => setForm({ ...form, tgl_berangkat: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Kedatangan</label>
                <input type="date" value={form.tgl_tiba} onChange={(e) => setForm({ ...form, tgl_tiba: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pelabuhan yang Disinggahi</label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-surface-50 rounded-lg border border-surface-200">
                {pelabuhanList.filter(p => p.status === 'Aktif').map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selectedPelabuhan.includes(p.id)} onChange={() => togglePelabuhan(p.id)} className="w-3.5 h-3.5 rounded border-surface-300 text-sea-600 focus:ring-cyan-500" />
                    {p.nama.replace('Pelabuhan ', '')}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Status setiap titik (disinggahi/dilewati) diperbarui kemudian lewat tombol <MapPin size={11} className="inline" /> "Update Persinggahan".</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Update Persinggahan Modal */}
      <Modal isOpen={!!singgahModal} onClose={() => setSinggahModal(null)} title={`Update Persinggahan — Voyage #${singgahModal?.id || ''}`} size="md">
        {singgahModal && (
          <div className="space-y-3">
            {[...(singgahModal.voyage_singgah || [])].sort((a, b) => a.urutan - b.urutan).map((s) => {
              const input = singgahInputs[s.id] || {};
              const reqInput = requestInputs[s.id] || {};
              const locked = s.status !== 'Belum Disinggahi';
              const lastReq = latestRequest(s.voyage_singgah_request);
              const pending = lastReq?.status === 'Menunggu' ? lastReq : null;

              return (
                <div key={s.id} className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-6">#{s.urutan}</span>
                      <p className="font-semibold text-navy-900 text-sm">{s.pelabuhan?.nama?.replace('Pelabuhan ', '')}</p>
                    </div>
                    <Badge variant={s.status === 'Sudah Disinggahi' ? 'selesai' : s.status === 'Dilewati' ? 'warning' : 'default'}>{s.status}</Badge>
                  </div>

                  {/* OPERATOR: belum terkunci -> form input + status selector seperti biasa */}
                  {isOperator && !locked && (
                    <>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((st) => (
                          <button
                            key={st}
                            onClick={() => updateSinggahInput(s.id, 'status', st)}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                              input.status === st
                                ? st === 'Dilewati' ? 'bg-warning-500 text-white' : st === 'Sudah Disinggahi' ? 'bg-success-500 text-white' : 'bg-slate-300 text-navy-900'
                                : 'bg-white text-slate-500 border border-surface-200 hover:bg-surface-100'
                            }`}
                          >
                            {st === 'Belum Disinggahi' ? 'Belum' : st === 'Sudah Disinggahi' ? 'Sudah' : 'Dilewati'}
                          </button>
                        ))}
                      </div>

                      {input.status === 'Sudah Disinggahi' && (
                        <DataFields input={input} onChange={(field, value) => updateSinggahInput(s.id, field, value)} />
                      )}
                      {input.status === 'Dilewati' && (
                        <Select placeholder="— Alasan dilewati —" options={ALASAN_OMISI} value={input.alasan} onChange={(e) => updateSinggahInput(s.id, 'alasan', e.target.value)} />
                      )}

                      <div className="flex justify-end">
                        <Button size="sm" variant={confirmingSave[s.id] ? 'cyan' : 'primary'} onClick={() => handleSimpanClick(s)}>
                          {confirmingSave[s.id] ? 'Klik Lagi untuk Konfirmasi' : 'Simpan'}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* OPERATOR: sudah terkunci -> ringkasan read-only + ajukan perubahan */}
                  {isOperator && locked && (
                    <>
                      <p className="text-xs text-slate-500">
                        {s.status === 'Dilewati'
                          ? `Dilewati — ${s.alasan_dilewati || '-'}`
                          : `Naik ${s.penumpang_data?.naik ?? 0} / Turun ${s.penumpang_data?.turun ?? 0} · Muat ${s.bongkar_muat_data?.muat ?? 0} Ton / Bongkar ${s.bongkar_muat_data?.bongkar ?? 0} Ton`}
                      </p>

                      {pending ? (
                        <div className="p-2 bg-warning-500/10 rounded-md text-xs text-warning-700">
                          Menunggu persetujuan Admin — usulan: {pending.proposed_status === 'Dilewati'
                            ? `Dilewati (${pending.proposed_alasan_dilewati})`
                            : `Naik ${pending.proposed_naik} / Turun ${pending.proposed_turun} · Muat ${pending.proposed_muat} Ton / Bongkar ${pending.proposed_bongkar} Ton`}
                        </div>
                      ) : requestForms[s.id] ? (
                        <div className="space-y-2 pt-1 border-t border-surface-200">
                          <div className="flex gap-1">
                            {['Sudah Disinggahi', 'Dilewati'].map((st) => (
                              <button
                                key={st}
                                onClick={() => updateRequestInput(s.id, 'status', st)}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                  reqInput.status === st
                                    ? st === 'Dilewati' ? 'bg-warning-500 text-white' : 'bg-success-500 text-white'
                                    : 'bg-white text-slate-500 border border-surface-200 hover:bg-surface-100'
                                }`}
                              >
                                {st === 'Sudah Disinggahi' ? 'Sudah' : 'Dilewati'}
                              </button>
                            ))}
                          </div>
                          {reqInput.status === 'Sudah Disinggahi' && (
                            <DataFields input={reqInput} onChange={(field, value) => updateRequestInput(s.id, field, value)} />
                          )}
                          {reqInput.status === 'Dilewati' && (
                            <Select placeholder="— Alasan dilewati —" options={ALASAN_OMISI} value={reqInput.alasanDilewati} onChange={(e) => updateRequestInput(s.id, 'alasanDilewati', e.target.value)} />
                          )}
                          <textarea
                            placeholder="Alasan permintaan perubahan (wajib)"
                            value={reqInput.alasanPermintaan}
                            onChange={(e) => updateRequestInput(s.id, 'alasanPermintaan', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => toggleRequestForm(s.id, false)}>Batal</Button>
                            <Button size="sm" onClick={() => handleSubmitRequest(s)}>Kirim Permintaan</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          {lastReq?.status === 'Ditolak' && <span className="text-xs text-danger-500">Permintaan terakhir ditolak</span>}
                          <Button size="sm" variant="outline" onClick={() => toggleRequestForm(s.id, true)}>Ajukan Perubahan</Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ADMIN: lihat data singgah yang sudah diinput operator, dan review permintaan perubahan (tidak ada edit langsung) */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        {s.status === 'Belum Disinggahi'
                          ? 'Belum ada data — operator belum melaporkan persinggahan ini.'
                          : s.status === 'Dilewati'
                            ? `Dilewati — ${s.alasan_dilewati || '-'}`
                            : `Naik ${s.penumpang_data?.naik ?? 0} / Turun ${s.penumpang_data?.turun ?? 0} · Muat ${s.bongkar_muat_data?.muat ?? 0} Ton / Bongkar ${s.bongkar_muat_data?.bongkar ?? 0} Ton`}
                      </p>
                      {pending ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-surface-100 rounded-md text-xs space-y-1">
                            <p className="text-slate-500">Alasan: {pending.alasan}</p>
                            <p><span className="text-slate-400">Usulan:</span> {pending.proposed_status === 'Dilewati' ? `Dilewati (${pending.proposed_alasan_dilewati})` : `Naik ${pending.proposed_naik} / Turun ${pending.proposed_turun} · Muat ${pending.proposed_muat} / Bongkar ${pending.proposed_bongkar}`}</p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="danger" icon={X} onClick={() => handleReviewRequest(s, pending, 'Ditolak')}>Tolak</Button>
                            <Button size="sm" variant="success" icon={Check} onClick={() => handleReviewRequest(s, pending, 'Diterima')}>Terima</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada permintaan perubahan untuk titik ini.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
