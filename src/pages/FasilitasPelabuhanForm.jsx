import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Image, FileText, CheckCircle2, XCircle, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import Card, { CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import DocumentList from '../components/ui/DocumentList';
import UploadButton from '../components/ui/UploadButton';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabaseClient';
import { removeLampiran } from '../lib/storage';
import { generateFasilitasDocx } from '../lib/docxReport';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

const STATUS_PELABUHAN_OPTIONS = [
  { value: 'umum_diusahakan', label: 'Pelabuhan Umum diusahakan' },
  { value: 'umum_tidak_diusahakan', label: 'Pelabuhan Umum tidak diusahakan' },
  { value: 'khusus', label: 'Pelabuhan Khusus' },
  { value: 'dermaga_khusus', label: 'Dermaga Khusus' },
];

const STATUS_TERBUKA_OPTIONS = [
  { value: 'terbuka', label: 'Terbuka untuk perdagangan Luar Negeri' },
  { value: 'tidak_terbuka', label: 'Tidak terbuka untuk perdagangan Luar Negeri' },
];

const KELAS_PELABUHAN_OPTIONS = [
  { value: 'utama', label: 'Kelas Utama' },
  { value: 'kelas_i', label: 'Kelas I' },
  { value: 'kelas_ii', label: 'Kelas II' },
  { value: 'kelas_iii', label: 'Kelas III' },
  { value: 'kelas_iv', label: 'Kelas IV' },
  { value: 'kelas_v', label: 'Kelas V' },
  { value: 'wilayah_kerja', label: 'Wilayah Kerja' },
];

const FUNGSI_PELABUHAN_OPTIONS = [
  { value: 'internasional', label: 'Internasional' },
  { value: 'internasional_hub', label: 'Internasional HUB' },
  { value: 'nasional', label: 'Nasional' },
  { value: 'regional', label: 'Regional' },
  { value: 'lokal', label: 'Lokal' },
];

const PERAN_PELABUHAN_OPTIONS = [
  { value: 'utama', label: 'Utama' },
  { value: 'pengumpul', label: 'Pengumpul' },
  { value: 'pengumpan', label: 'Pengumpan' },
];

const STATUS_OPERASIONAL_OPTIONS = [
  { value: 'rencana', label: 'R-Rencana' },
  { value: 'sedang_dibangun', label: 'B-Sedang dibangun' },
  { value: 'beroperasi', label: 'O-Beroperasi' },
  { value: 'beroperasi_dikembangkan', label: 'K-Beroperasi & Dikembangkan' },
  { value: 'tidak_operasi', label: 'T-Tidak operasi' },
];

const KONDISI_PELABUHAN_OPTIONS = [
  { value: 'baik', label: 'Baik' },
  { value: 'cukup', label: 'Cukup' },
  { value: 'kurang', label: 'Kurang' },
  { value: 'tidak_ada_data', label: 'Tidak ada data' },
];

const STATUS_PEMANDUAN_OPTIONS = [
  { value: 'wajib_pandu', label: 'Wajib pandu' },
  { value: 'melayani', label: 'Melayani' },
  { value: 'tidak_melayani', label: 'Tidak melayani' },
  { value: 'tidak_ada', label: 'Tidak ada' },
];

const STATUS_DATA_OPTIONS = [
  { value: 'telah_disurvey', label: 'Telah disurvey' },
  { value: 'belum_disurvey', label: 'Belum disurvey' },
  { value: 'baru', label: 'Baru' },
];

const DERMAGA_ROWS = [
  { key: 'betonCurah', label: 'Beton Curah' },
  { key: 'betonI', label: 'Beton I' },
  { key: 'betonII', label: 'Beton II' },
  { key: 'serbaguna', label: 'Serbaguna' },
];

const DERMAGA_COLS = [
  { key: 'konstruksi', label: 'Konstruksi' },
  { key: 'kapasitas', label: 'Kekuatan/Kapasitas' },
  { key: 'panjang', label: 'Panjang' },
  { key: 'kedalaman', label: 'Kedalaman' },
  { key: 'peruntukan', label: 'Peruntukan' },
];

const GUDANG_ROWS = [
  { key: 'tertutup', label: 'Tertutup' },
  { key: 'terbuka', label: 'Terbuka' },
];

const GUDANG_COLS = [
  { key: 'luas', label: 'Luas (m²)' },
  { key: 'kapasitas', label: 'Kapasitas (Ton)' },
];

const FASILITAS_LAINNYA_OPTIONS = [
  { key: 'teleponUmum', label: 'Telepon Umum' },
  { key: 'rumahSakit', label: 'Rumah sakit' },
  { key: 'bank', label: 'Bank' },
  { key: 'pemadamKebakaran', label: 'Pemadam Kebakaran' },
  { key: 'penanggulanganPencemaran', label: 'Penanggulangan Pencemaran' },
];

const EMPTY_GROUP = (keys) => Object.fromEntries(keys.map((k) => [k, '']));

const EMPTY_FORM = {
  kode_pelabuhan: '', alamat: '', kode_pos: '', kabupaten_kota: '', provinsi: '', telepon: '', fax: '', telex: '',
  pengelola: '', alamat_pengelola: '',
  koordinat: { lu: '', bt: '' },
  status_pelabuhan: '', status_terbuka: '', kelas_pelabuhan: '', fungsi_pelabuhan: '', peran_pelabuhan: '', status_operasional: '',
  tahun_dibangun: '', tahun_selesai_dibangun: '', tahun_operasi_ditutup: '', kondisi_pelabuhan: '',
  alur_masuk: EMPTY_GROUP(['panjang', 'lebar', 'kedalaman']),
  kolam_pelabuhan: EMPTY_GROUP(['luas', 'kedalamanMin', 'kedalamanMaks']),
  status_pemanduan: '', stasiun_radio_pantai: '', koordinat_lego_jangkar: '', jumlah_petugas_psc: '',
  jam_kerja_pelabuhan: EMPTY_GROUP(['hari', 'jam']),
  jam_kerja_kantor: EMPTY_GROUP(['hari', 'jam']),
  dermaga: {
    betonCurah: EMPTY_GROUP(['konstruksi', 'kapasitas', 'panjang', 'kedalaman', 'peruntukan']),
    betonI: EMPTY_GROUP(['konstruksi', 'kapasitas', 'panjang', 'kedalaman', 'peruntukan']),
    betonII: EMPTY_GROUP(['konstruksi', 'kapasitas', 'panjang', 'kedalaman', 'peruntukan']),
    serbaguna: EMPTY_GROUP(['konstruksi', 'kapasitas', 'panjang', 'kedalaman', 'peruntukan']),
  },
  gudang: {
    tertutup: EMPTY_GROUP(['luas', 'kapasitas']),
    terbuka: EMPTY_GROUP(['luas', 'kapasitas']),
  },
  lapangan_penumpukan: EMPTY_GROUP(['luas', 'kapasitas']),
  terminal_penumpang: EMPTY_GROUP(['luas', 'kapasitas']),
  container_yard: false,
  peralatan_bongkar_muat: EMPTY_GROUP(['shoreCrane', 'forklift']),
  tenaga_kerja_bongkar_muat: EMPTY_GROUP(['tkbm', 'gang', 'kemampuan']),
  fasilitas_pemanduan: EMPTY_GROUP(['pandu', 'kapalPanduTunda', 'kapalKepil', 'stasiunPandu']),
  penampungan_limbah: false,
  tarif: {
    jasaLabuh: EMPTY_GROUP(['kapalNiagaRp', 'kapalNiagaUsd', 'kapalBukanNiagaRp']),
    jasaTambat: EMPTY_GROUP(['dermagaRp', 'dermagaUsd', 'breastingRp', 'breastingUsd', 'pinggiranRp', 'pinggiranUsd']),
    jasaPemanduan: EMPTY_GROUP(['tarifTetapRp', 'tarifTetapUsd', 'tarifVariabelRp', 'tarifVariabelUsd']),
    jasaAirKapal: EMPTY_GROUP(['dalamNegeriRp', 'luarNegeriUsd']),
  },
  fasilitas_lainnya: EMPTY_GROUP(['teleponUmum', 'rumahSakit', 'bank', 'pemadamKebakaran', 'penanggulanganPencemaran']),
  status_data: 'baru', keterangan: '', foto: [], dokumen: [],
};

function rowToForm(row) {
  if (!row) return EMPTY_FORM;
  const merge = (empty, val) => ({ ...empty, ...(val || {}) });
  return {
    ...EMPTY_FORM,
    ...row,
    koordinat: merge(EMPTY_FORM.koordinat, row.koordinat),
    alur_masuk: merge(EMPTY_FORM.alur_masuk, row.alur_masuk),
    kolam_pelabuhan: merge(EMPTY_FORM.kolam_pelabuhan, row.kolam_pelabuhan),
    jam_kerja_pelabuhan: merge(EMPTY_FORM.jam_kerja_pelabuhan, row.jam_kerja_pelabuhan),
    jam_kerja_kantor: merge(EMPTY_FORM.jam_kerja_kantor, row.jam_kerja_kantor),
    dermaga: {
      betonCurah: merge(EMPTY_FORM.dermaga.betonCurah, row.dermaga?.betonCurah),
      betonI: merge(EMPTY_FORM.dermaga.betonI, row.dermaga?.betonI),
      betonII: merge(EMPTY_FORM.dermaga.betonII, row.dermaga?.betonII),
      serbaguna: merge(EMPTY_FORM.dermaga.serbaguna, row.dermaga?.serbaguna),
    },
    gudang: {
      tertutup: merge(EMPTY_FORM.gudang.tertutup, row.gudang?.tertutup),
      terbuka: merge(EMPTY_FORM.gudang.terbuka, row.gudang?.terbuka),
    },
    lapangan_penumpukan: merge(EMPTY_FORM.lapangan_penumpukan, row.lapangan_penumpukan),
    terminal_penumpang: merge(EMPTY_FORM.terminal_penumpang, row.terminal_penumpang),
    peralatan_bongkar_muat: merge(EMPTY_FORM.peralatan_bongkar_muat, row.peralatan_bongkar_muat),
    tenaga_kerja_bongkar_muat: merge(EMPTY_FORM.tenaga_kerja_bongkar_muat, row.tenaga_kerja_bongkar_muat),
    fasilitas_pemanduan: merge(EMPTY_FORM.fasilitas_pemanduan, row.fasilitas_pemanduan),
    tarif: {
      jasaLabuh: merge(EMPTY_FORM.tarif.jasaLabuh, row.tarif?.jasaLabuh),
      jasaTambat: merge(EMPTY_FORM.tarif.jasaTambat, row.tarif?.jasaTambat),
      jasaPemanduan: merge(EMPTY_FORM.tarif.jasaPemanduan, row.tarif?.jasaPemanduan),
      jasaAirKapal: merge(EMPTY_FORM.tarif.jasaAirKapal, row.tarif?.jasaAirKapal),
    },
    fasilitas_lainnya: merge(EMPTY_FORM.fasilitas_lainnya, row.fasilitas_lainnya),
    foto: row.foto || [],
    dokumen: row.dokumen || [],
  };
}

function setIn(obj, path, value) {
  const keys = path.split('.');
  if (keys.length === 1) return { ...obj, [keys[0]]: value };
  const [head, ...rest] = keys;
  return { ...obj, [head]: setIn(obj[head] || {}, rest.join('.'), value) };
}

function Field({ label, value, onChange, suffix, canEdit, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="-" className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          {suffix && <span className="text-xs text-slate-400 whitespace-nowrap">{suffix}</span>}
        </div>
      ) : (
        <p className="font-semibold text-navy-900">{value ? `${value}${suffix ? ` ${suffix}` : ''}` : '—'}</p>
      )}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange, canEdit }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return canEdit ? (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer px-3 py-2 rounded-lg bg-surface-50 border border-surface-200">
            <input type="radio" name={name} checked={isActive} onChange={() => onChange(opt.value)} className="w-3.5 h-3.5 border-surface-300 text-sea-600 focus:ring-cyan-500" />
            {opt.label}
          </label>
        ) : (
          <div key={opt.value} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${isActive ? 'bg-success-500/5 border-success-500/20 text-success-700' : 'bg-surface-50 border-surface-200 text-slate-400'}`}>
            {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {opt.label}
          </div>
        );
      })}
    </div>
  );
}

function CheckboxGroup({ flags, canEdit, gridClass = 'grid-cols-3', onChange }) {
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {flags.map((f) =>
        canEdit ? (
          <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded-lg bg-surface-50 border border-surface-200">
            <input type="checkbox" checked={!!f.active} onChange={(e) => onChange(f.key, e.target.checked)} className="w-3.5 h-3.5 rounded border-surface-300 text-sea-600 focus:ring-cyan-500" />
            {f.label}
          </label>
        ) : (
          <div key={f.key} className={`flex items-center gap-2 text-sm p-2 rounded-lg border ${f.active ? 'bg-success-500/5 border-success-500/20 text-success-700' : 'bg-surface-50 border-surface-200 text-slate-400'}`}>
            {f.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {f.label}
          </div>
        )
      )}
    </div>
  );
}

function FacilityTable({ rows, columns, data, canEdit, onChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-surface-100">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 border border-surface-200"></th>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 border border-surface-200">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2 font-medium text-navy-900 border border-surface-200 bg-surface-50">{r.label}</td>
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5 border border-surface-200">
                  {canEdit ? (
                    <input value={data?.[r.key]?.[c.key] || ''} onChange={(e) => onChange(r.key, c.key, e.target.value)} className="w-full px-2 py-1.5 bg-white border border-surface-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  ) : (
                    <span className="text-xs text-navy-900">{data?.[r.key]?.[c.key] || '—'}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ number, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padding={false}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer">
        <CardTitle className="text-sm">{number}. {title}</CardTitle>
        <ChevronDown size={18} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-surface-100 pt-4">{children}</div>}
    </Card>
  );
}

export default function FasilitasPelabuhanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { role: userRole } = useAuth();
  const canEdit = userRole === ROLES.UPP || userRole === ROLES.ADMIN;

  const { data: pelabuhan, loading: loadingPelabuhan } = useSupabaseQuery(
    () => supabase.from('pelabuhan').select('*').eq('id', id).maybeSingle(),
    [id]
  );
  const { data: fasilitasRow, loading: loadingFasilitas } = useSupabaseQuery(
    () => supabase.from('fasilitas_pelabuhan').select('*').eq('pelabuhan_id', id).maybeSingle(),
    [id]
  );

  const [form, setForm] = useState(EMPTY_FORM);
  useEffect(() => { setForm(rowToForm(fasilitasRow)); }, [fasilitasRow]);

  const set = (path, value) => setForm((prev) => setIn(prev, path, value));

  const handleDownloadReport = async () => {
    try {
      const blob = await generateFasilitasDocx(pelabuhan, form);
      saveAs(blob, `Fasilitas Pelabuhan - ${pelabuhan.nama}.docx`);
    } catch (error) {
      toast(error.message || 'Gagal membuat laporan.', 'error');
    }
  };

  const handleSave = async () => {
    const { id: _id, created_at, updated_at, ...payload } = form;
    const { error } = await supabase
      .from('fasilitas_pelabuhan')
      .upsert({ ...payload, pelabuhan_id: Number(id) }, { onConflict: 'pelabuhan_id' });
    if (error) { toast(error.message, 'error'); return; }
    toast('Data fasilitas berhasil disimpan!', 'success');
  };

  if (loadingPelabuhan || loadingFasilitas) {
    return <p className="text-sm text-slate-400">Memuat data...</p>;
  }

  if (!pelabuhan) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Pelabuhan tidak ditemukan.</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/dashboard/fasilitas-pelabuhan')}>Kembali</Button>
      </div>
    );
  }

  const f = form;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/fasilitas-pelabuhan')} className="p-2 rounded-lg text-slate-400 hover:text-sea-600 hover:bg-sea-500/10 transition-colors cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">{pelabuhan.nama}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{pelabuhan.kabupaten} &middot; {pelabuhan.koordinat}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" icon={Download} onClick={handleDownloadReport}>Unduh Laporan (.docx)</Button>
          {canEdit && (
            <Button onClick={handleSave}>Simpan Perubahan</Button>
          )}
        </div>
      </div>

      <Section number={1} title="Data Umum & Lokasi" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Kode Pelabuhan" value={f.kode_pelabuhan} onChange={(v) => set('kode_pelabuhan', v)} canEdit={canEdit} />
          <Field label="Nama Pelabuhan" value={pelabuhan.nama} canEdit={false} />
          <Field label="Kabupaten/Kota" value={f.kabupaten_kota} onChange={(v) => set('kabupaten_kota', v)} canEdit={canEdit} />
          <Field label="Alamat" value={f.alamat} onChange={(v) => set('alamat', v)} canEdit={canEdit} className="sm:col-span-2" />
          <Field label="Kode Pos" value={f.kode_pos} onChange={(v) => set('kode_pos', v)} canEdit={canEdit} />
          <Field label="Provinsi" value={f.provinsi} onChange={(v) => set('provinsi', v)} canEdit={canEdit} />
          <Field label="Telepon" value={f.telepon} onChange={(v) => set('telepon', v)} canEdit={canEdit} />
          <Field label="Fax" value={f.fax} onChange={(v) => set('fax', v)} canEdit={canEdit} />
          <Field label="Telex" value={f.telex} onChange={(v) => set('telex', v)} canEdit={canEdit} />
          <Field label="Pengelola Pelabuhan" value={f.pengelola} onChange={(v) => set('pengelola', v)} canEdit={canEdit} className="sm:col-span-2" />
          <Field label="Alamat Pengelola" value={f.alamat_pengelola} onChange={(v) => set('alamat_pengelola', v)} canEdit={canEdit} />
          <Field label="Koordinat LU/LS" value={f.koordinat?.lu} onChange={(v) => set('koordinat.lu', v)} canEdit={canEdit} />
          <Field label="Koordinat BT" value={f.koordinat?.bt} onChange={(v) => set('koordinat.bt', v)} canEdit={canEdit} />
        </div>
      </Section>

      <Section number={2} title="Klasifikasi & Status">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status Pelabuhan</label>
          <RadioGroup name="statusPelabuhan" options={STATUS_PELABUHAN_OPTIONS} value={f.status_pelabuhan} onChange={(v) => set('status_pelabuhan', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status Terbuka</label>
          <RadioGroup name="statusTerbuka" options={STATUS_TERBUKA_OPTIONS} value={f.status_terbuka} onChange={(v) => set('status_terbuka', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Kelas Pelabuhan</label>
          <RadioGroup name="kelasPelabuhan" options={KELAS_PELABUHAN_OPTIONS} value={f.kelas_pelabuhan} onChange={(v) => set('kelas_pelabuhan', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Fungsi Pelabuhan</label>
          <RadioGroup name="fungsiPelabuhan" options={FUNGSI_PELABUHAN_OPTIONS} value={f.fungsi_pelabuhan} onChange={(v) => set('fungsi_pelabuhan', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Peran Pelabuhan <span className="text-slate-300">(UU 17 Tahun 2009)</span></label>
          <RadioGroup name="peranPelabuhan" options={PERAN_PELABUHAN_OPTIONS} value={f.peran_pelabuhan} onChange={(v) => set('peran_pelabuhan', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status Pelabuhan (Operasional)</label>
          <RadioGroup name="statusOperasional" options={STATUS_OPERASIONAL_OPTIONS} value={f.status_operasional} onChange={(v) => set('status_operasional', v)} canEdit={canEdit} />
        </div>
      </Section>

      <Section number={3} title="Riwayat & Kondisi">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Tahun Dibangun" value={f.tahun_dibangun} onChange={(v) => set('tahun_dibangun', v)} canEdit={canEdit} />
          <Field label="Tahun Selesai Dibangun" value={f.tahun_selesai_dibangun} onChange={(v) => set('tahun_selesai_dibangun', v)} canEdit={canEdit} />
          <Field label="Tahun Operasi Ditutup" value={f.tahun_operasi_ditutup} onChange={(v) => set('tahun_operasi_ditutup', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Kondisi Pelabuhan</label>
          <RadioGroup name="kondisiPelabuhan" options={KONDISI_PELABUHAN_OPTIONS} value={f.kondisi_pelabuhan} onChange={(v) => set('kondisi_pelabuhan', v)} canEdit={canEdit} />
        </div>
        <div>
          <CardTitle className="text-sm mb-2">Alur Masuk Pelabuhan</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Panjang" value={f.alur_masuk?.panjang} onChange={(v) => set('alur_masuk.panjang', v)} canEdit={canEdit} />
            <Field label="Lebar" value={f.alur_masuk?.lebar} onChange={(v) => set('alur_masuk.lebar', v)} canEdit={canEdit} />
            <Field label="Kedalaman" value={f.alur_masuk?.kedalaman} onChange={(v) => set('alur_masuk.kedalaman', v)} canEdit={canEdit} />
          </div>
        </div>
      </Section>

      <Section number={4} title="Kolam Pelabuhan & Pemanduan">
        <div>
          <CardTitle className="text-sm mb-2">Kolam Pelabuhan</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Luas" value={f.kolam_pelabuhan?.luas} onChange={(v) => set('kolam_pelabuhan.luas', v)} canEdit={canEdit} />
            <Field label="Kedalaman Min" value={f.kolam_pelabuhan?.kedalamanMin} onChange={(v) => set('kolam_pelabuhan.kedalamanMin', v)} canEdit={canEdit} />
            <Field label="Kedalaman Maks" value={f.kolam_pelabuhan?.kedalamanMaks} onChange={(v) => set('kolam_pelabuhan.kedalamanMaks', v)} canEdit={canEdit} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status Pemanduan</label>
          <RadioGroup name="statusPemanduan" options={STATUS_PEMANDUAN_OPTIONS} value={f.status_pemanduan} onChange={(v) => set('status_pemanduan', v)} canEdit={canEdit} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Stasiun Radio Pantai" value={f.stasiun_radio_pantai} onChange={(v) => set('stasiun_radio_pantai', v)} canEdit={canEdit} />
          <Field label="Koordinat Area Lego Jangkar" value={f.koordinat_lego_jangkar} onChange={(v) => set('koordinat_lego_jangkar', v)} canEdit={canEdit} />
          <Field label="Jumlah Petugas Port State Control" value={f.jumlah_petugas_psc} onChange={(v) => set('jumlah_petugas_psc', v)} suffix="Orang" canEdit={canEdit} />
        </div>
      </Section>

      <Section number={5} title="Jam Operasional">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Hari Kerja Pelabuhan" value={f.jam_kerja_pelabuhan?.hari} onChange={(v) => set('jam_kerja_pelabuhan.hari', v)} suffix="Hari Kerja" canEdit={canEdit} />
          <Field label="Jam Kerja Pelabuhan" value={f.jam_kerja_pelabuhan?.jam} onChange={(v) => set('jam_kerja_pelabuhan.jam', v)} suffix="Jam Kerja" canEdit={canEdit} />
          <Field label="Hari Kerja Kantor" value={f.jam_kerja_kantor?.hari} onChange={(v) => set('jam_kerja_kantor.hari', v)} suffix="Hari Kerja" canEdit={canEdit} />
          <Field label="Jam Kerja Kantor" value={f.jam_kerja_kantor?.jam} onChange={(v) => set('jam_kerja_kantor.jam', v)} suffix="Jam Kerja" canEdit={canEdit} />
        </div>
      </Section>

      <Section number={6} title="Fasilitas Pelabuhan">
        <div>
          <CardTitle className="text-sm mb-2">Dermaga</CardTitle>
          <FacilityTable rows={DERMAGA_ROWS} columns={DERMAGA_COLS} data={f.dermaga} canEdit={canEdit} onChange={(row, col, v) => set(`dermaga.${row}.${col}`, v)} />
        </div>
        <div>
          <CardTitle className="text-sm mb-2">Gudang</CardTitle>
          <FacilityTable rows={GUDANG_ROWS} columns={GUDANG_COLS} data={f.gudang} canEdit={canEdit} onChange={(row, col, v) => set(`gudang.${row}.${col}`, v)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lapangan Penumpukan — Luas" value={f.lapangan_penumpukan?.luas} onChange={(v) => set('lapangan_penumpukan.luas', v)} canEdit={canEdit} />
          <Field label="Lapangan Penumpukan — Kapasitas" value={f.lapangan_penumpukan?.kapasitas} onChange={(v) => set('lapangan_penumpukan.kapasitas', v)} canEdit={canEdit} />
          <Field label="Terminal Penumpang — Luas" value={f.terminal_penumpang?.luas} onChange={(v) => set('terminal_penumpang.luas', v)} canEdit={canEdit} />
          <Field label="Terminal Penumpang — Kapasitas" value={f.terminal_penumpang?.kapasitas} onChange={(v) => set('terminal_penumpang.kapasitas', v)} canEdit={canEdit} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Container Yard</label>
          <CheckboxGroup gridClass="grid-cols-2" flags={[{ key: 'container_yard', label: 'Ada', active: !!f.container_yard }]} canEdit={canEdit} onChange={(_, checked) => set('container_yard', checked)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kapasitas Shore Crane" value={f.peralatan_bongkar_muat?.shoreCrane} onChange={(v) => set('peralatan_bongkar_muat.shoreCrane', v)} canEdit={canEdit} />
          <Field label="Kapasitas Forklift" value={f.peralatan_bongkar_muat?.forklift} onChange={(v) => set('peralatan_bongkar_muat.forklift', v)} canEdit={canEdit} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Jumlah TKBM" value={f.tenaga_kerja_bongkar_muat?.tkbm} onChange={(v) => set('tenaga_kerja_bongkar_muat.tkbm', v)} suffix="Orang" canEdit={canEdit} />
          <Field label="Jumlah Gang" value={f.tenaga_kerja_bongkar_muat?.gang} onChange={(v) => set('tenaga_kerja_bongkar_muat.gang', v)} suffix="Gang" canEdit={canEdit} />
          <Field label="Kemampuan Bongkar Muat" value={f.tenaga_kerja_bongkar_muat?.kemampuan} onChange={(v) => set('tenaga_kerja_bongkar_muat.kemampuan', v)} suffix="T/G/H" canEdit={canEdit} />
        </div>
        <div>
          <CardTitle className="text-sm mb-2">Fasilitas Pemanduan</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Pandu" value={f.fasilitas_pemanduan?.pandu} onChange={(v) => set('fasilitas_pemanduan.pandu', v)} suffix="Orang" canEdit={canEdit} />
            <Field label="Kapal Pandu Tunda" value={f.fasilitas_pemanduan?.kapalPanduTunda} onChange={(v) => set('fasilitas_pemanduan.kapalPanduTunda', v)} suffix="Unit" canEdit={canEdit} />
            <Field label="Kapal Kepil" value={f.fasilitas_pemanduan?.kapalKepil} onChange={(v) => set('fasilitas_pemanduan.kapalKepil', v)} suffix="Unit" canEdit={canEdit} />
            <Field label="Stasiun Pandu" value={f.fasilitas_pemanduan?.stasiunPandu} onChange={(v) => set('fasilitas_pemanduan.stasiunPandu', v)} suffix="Unit" canEdit={canEdit} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Fasilitas Penampungan Limbah</label>
          <CheckboxGroup gridClass="grid-cols-2" flags={[{ key: 'penampungan_limbah', label: 'Ada', active: !!f.penampungan_limbah }]} canEdit={canEdit} onChange={(_, checked) => set('penampungan_limbah', checked)} />
        </div>
        <div>
          <CardTitle className="text-sm mb-2">Tarif Pelayanan Jasa Kapal & Air Kapal</CardTitle>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Jasa Labuh</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Kapal Niaga (Rp)" value={f.tarif?.jasaLabuh?.kapalNiagaRp} onChange={(v) => set('tarif.jasaLabuh.kapalNiagaRp', v)} canEdit={canEdit} />
                <Field label="Kapal Niaga (US$)" value={f.tarif?.jasaLabuh?.kapalNiagaUsd} onChange={(v) => set('tarif.jasaLabuh.kapalNiagaUsd', v)} canEdit={canEdit} />
                <Field label="Kapal Bukan Niaga (Rp)" value={f.tarif?.jasaLabuh?.kapalBukanNiagaRp} onChange={(v) => set('tarif.jasaLabuh.kapalBukanNiagaRp', v)} canEdit={canEdit} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Jasa Tambat</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Dermaga (Rp)" value={f.tarif?.jasaTambat?.dermagaRp} onChange={(v) => set('tarif.jasaTambat.dermagaRp', v)} canEdit={canEdit} />
                <Field label="Dermaga (US$)" value={f.tarif?.jasaTambat?.dermagaUsd} onChange={(v) => set('tarif.jasaTambat.dermagaUsd', v)} canEdit={canEdit} />
                <div />
                <Field label="Breasting Dolphin & Pnp (Rp)" value={f.tarif?.jasaTambat?.breastingRp} onChange={(v) => set('tarif.jasaTambat.breastingRp', v)} canEdit={canEdit} />
                <Field label="Breasting Dolphin & Pnp (US$)" value={f.tarif?.jasaTambat?.breastingUsd} onChange={(v) => set('tarif.jasaTambat.breastingUsd', v)} canEdit={canEdit} />
                <div />
                <Field label="Pinggiran (Rp)" value={f.tarif?.jasaTambat?.pinggiranRp} onChange={(v) => set('tarif.jasaTambat.pinggiranRp', v)} canEdit={canEdit} />
                <Field label="Pinggiran (US$)" value={f.tarif?.jasaTambat?.pinggiranUsd} onChange={(v) => set('tarif.jasaTambat.pinggiranUsd', v)} canEdit={canEdit} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Jasa Pemanduan</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Tarif Tetap (Rp)" value={f.tarif?.jasaPemanduan?.tarifTetapRp} onChange={(v) => set('tarif.jasaPemanduan.tarifTetapRp', v)} canEdit={canEdit} />
                <Field label="Tarif Tetap (US$)" value={f.tarif?.jasaPemanduan?.tarifTetapUsd} onChange={(v) => set('tarif.jasaPemanduan.tarifTetapUsd', v)} canEdit={canEdit} />
                <div />
                <Field label="Tarif Variabel (Rp)" value={f.tarif?.jasaPemanduan?.tarifVariabelRp} onChange={(v) => set('tarif.jasaPemanduan.tarifVariabelRp', v)} canEdit={canEdit} />
                <Field label="Tarif Variabel (US$)" value={f.tarif?.jasaPemanduan?.tarifVariabelUsd} onChange={(v) => set('tarif.jasaPemanduan.tarifVariabelUsd', v)} canEdit={canEdit} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Jasa Air Kapal</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Dalam Negeri (Rp)" value={f.tarif?.jasaAirKapal?.dalamNegeriRp} onChange={(v) => set('tarif.jasaAirKapal.dalamNegeriRp', v)} canEdit={canEdit} />
                <Field label="Luar Negeri (US$)" value={f.tarif?.jasaAirKapal?.luarNegeriUsd} onChange={(v) => set('tarif.jasaAirKapal.luarNegeriUsd', v)} canEdit={canEdit} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section number={7} title="Fasilitas Lainnya, Status Data & Keterangan">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Fasilitas Lainnya</label>
          <CheckboxGroup
            gridClass="grid-cols-1 sm:grid-cols-3"
            flags={FASILITAS_LAINNYA_OPTIONS.map((o) => ({ ...o, active: !!f.fasilitas_lainnya?.[o.key] }))}
            canEdit={canEdit}
            onChange={(key, checked) => set(`fasilitas_lainnya.${key}`, checked)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Status Data</label>
          <RadioGroup name="statusData" options={STATUS_DATA_OPTIONS} value={f.status_data} onChange={(v) => set('status_data', v)} canEdit={canEdit} />
        </div>
        <Field label="Keterangan Data/Lainnya" value={f.keterangan} onChange={(v) => set('keterangan', v)} canEdit={canEdit} />
      </Section>

      <Section number={8} title="Dokumentasi Pelabuhan">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Foto Pelabuhan</p>
            <DocumentList
              paths={f.foto || []}
              icon={Image}
              emptyText="Belum ada foto pelabuhan."
              onRemove={canEdit ? (path) => { removeLampiran(path); set('foto', (f.foto || []).filter((p) => p !== path)); } : undefined}
            />
            {canEdit && (
              <div className="mt-2">
                <UploadButton folder={`fasilitas-pelabuhan/${id}`} accept="image/*" label="Unggah Foto" icon={Image}
                  onUploaded={(path) => set('foto', [...(f.foto || []), path])} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dokumen Pelabuhan</p>
            <DocumentList
              paths={f.dokumen || []}
              icon={FileText}
              emptyText="Belum ada dokumen pelabuhan."
              onRemove={canEdit ? (path) => { removeLampiran(path); set('dokumen', (f.dokumen || []).filter((p) => p !== path)); } : undefined}
            />
            {canEdit && (
              <div className="mt-2">
                <UploadButton folder={`fasilitas-pelabuhan/${id}`} accept=".pdf,.doc,.docx" label="Unggah Dokumen" icon={FileText}
                  onUploaded={(path) => set('dokumen', [...(f.dokumen || []), path])} />
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
