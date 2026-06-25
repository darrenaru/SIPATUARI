import { useState, useMemo } from 'react';
import { FileText, Download, Printer, Eye, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';

export default function Laporan() {
  const toast = useToast();
  const { role: userRole, user } = useAuth();
  const canExport = userRole === ROLES.ADMIN;
  const isOperator = userRole === ROLES.OPERATOR;
  const [tipe, setTipe] = useState('penumpang');
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [preview, setPreview] = useState(false);
  const [filterOperator, setFilterOperator] = useState('');
  const effectiveOperatorId = isOperator ? user?.id : (filterOperator || null);

  const { rows: allVoyageList } = useSupabaseTable('voyage', {
    select: '*, kapal:kapal_id(nama, operator_id), trayek:trayek_id(kode)',
    order: { column: 'tgl_berangkat', ascending: false },
  });
  const { rows: allPenumpangData } = useSupabaseTable('penumpang_data', { select: '*, pelabuhan:pelabuhan_id(nama), voyage:voyage_id(kapal:kapal_id(operator_id))' });
  const { rows: allBongkarMuatData } = useSupabaseTable('bongkar_muat_data', { select: '*, pelabuhan:pelabuhan_id(nama), voyage:voyage_id(kapal:kapal_id(operator_id))' });
  const { rows: operatorList } = useSupabaseTable('profiles', { select: 'id, nama, instansi', eq: { role: 'operator' } });
  const operatorOptions = operatorList.map((op) => ({ value: op.id, label: op.instansi || op.nama }));

  // Operator hanya boleh melihat laporan untuk kapal yang menjadi kewenangannya; admin/upp/pemkab bisa menyaring opsional
  const voyageList = effectiveOperatorId ? allVoyageList.filter((v) => v.kapal?.operator_id === effectiveOperatorId) : allVoyageList;
  const penumpangData = effectiveOperatorId ? allPenumpangData.filter((p) => p.voyage?.kapal?.operator_id === effectiveOperatorId) : allPenumpangData;
  const bongkarMuatData = effectiveOperatorId ? allBongkarMuatData.filter((b) => b.voyage?.kapal?.operator_id === effectiveOperatorId) : allBongkarMuatData;

  const penumpangSummary = useMemo(() => {
    const byPelabuhan = {};
    penumpangData.forEach(p => {
      const pel = p.pelabuhan?.nama || '—';
      if (!byPelabuhan[pel]) byPelabuhan[pel] = { naik: 0, turun: 0 };
      byPelabuhan[pel].naik += p.naik;
      byPelabuhan[pel].turun += p.turun;
    });
    return Object.entries(byPelabuhan).map(([pel, data]) => ({ pelabuhan: pel, ...data, saldo: data.naik - data.turun }));
  }, [penumpangData]);

  const barangSummary = useMemo(() => {
    const byPelabuhan = {};
    bongkarMuatData.forEach(b => {
      const pel = b.pelabuhan?.nama || '—';
      if (!byPelabuhan[pel]) byPelabuhan[pel] = { muat: 0, muat_m3: 0, bongkar: 0, bongkar_m3: 0 };
      byPelabuhan[pel].muat += b.muat;
      byPelabuhan[pel].muat_m3 += (b.muat_m3 || 0);
      byPelabuhan[pel].bongkar += b.bongkar;
      byPelabuhan[pel].bongkar_m3 += (b.bongkar_m3 || 0);
    });
    return Object.entries(byPelabuhan).map(([pel, data]) => ({ pelabuhan: pel, ...data, total: data.muat + data.bongkar, total_m3: data.muat_m3 + data.bongkar_m3 }));
  }, [bongkarMuatData]);

  const reportData = tipe === 'penumpang' ? penumpangSummary : tipe === 'barang' ? barangSummary : voyageList;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">Laporan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate dan export laporan operasional angkutan laut perintis.</p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button variant="outline" icon={Download} onClick={() => toast('Mengunduh laporan PDF...', 'info')}>PDF</Button>
            <Button variant="outline" icon={FileSpreadsheet} onClick={() => toast('Mengunduh laporan Excel...', 'info')}>Excel</Button>
            <Button variant="ghost" icon={Printer} onClick={() => toast('Menyiapkan cetak...', 'info')}>Cetak</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <Select
            label="Tipe Laporan"
            id="tipe-laporan"
            options={[
              { value: 'penumpang', label: 'Laporan Penumpang' },
              { value: 'barang', label: 'Laporan Bongkar Muat' },
              { value: 'voyage', label: 'Laporan Voyage' },
            ]}
            value={tipe}
            onChange={(e) => setTipe(e.target.value)}
            className="w-56"
          />
          {!isOperator && (
            <Select
              label="Operator"
              options={operatorOptions}
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              placeholder="Semua Operator"
              className="w-56"
            />
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3.5 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors" />
          </div>
          <Button icon={Eye} onClick={() => setPreview(true)}>Preview Laporan</Button>
        </div>
      </Card>

      {/* Preview */}
      {preview && (
        <Card className="animate-fade-in-up">
          <CardHeader
            action={<Badge variant="info">Preview</Badge>}
          >
            <CardTitle>
              {tipe === 'penumpang' ? 'Laporan Data Penumpang' : tipe === 'barang' ? 'Laporan Bongkar Muat Barang' : 'Laporan Realisasi Voyage'}
            </CardTitle>
          </CardHeader>

          {/* Report header */}
          <div className="mb-6 p-4 bg-surface-50 rounded-lg border border-surface-200">
            <div className="text-center mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Dinas Perhubungan Provinsi Sulawesi Utara</p>
              <h2 className="text-lg font-bold text-navy-900 font-[var(--font-heading)]">
                {tipe === 'penumpang' ? 'LAPORAN DATA PENUMPANG' : tipe === 'barang' ? 'LAPORAN BONGKAR MUAT BARANG' : 'LAPORAN REALISASI VOYAGE'}
              </h2>
              <p className="text-sm text-slate-500">Periode: {new Date(dateFrom).toLocaleDateString('id-ID')} — {new Date(dateTo).toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          {/* Report Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">No</th>
                  {tipe === 'penumpang' && <><th className="px-3 py-2.5 text-left text-xs font-semibold">Pelabuhan</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Naik</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Turun</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Saldo</th></>}
                  {tipe === 'barang' && <><th className="px-3 py-2.5 text-left text-xs font-semibold">Pelabuhan</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Muat (Ton)</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Muat (m³)</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Bongkar (Ton)</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Bongkar (m³)</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Total (Ton)</th><th className="px-3 py-2.5 text-right text-xs font-semibold">Total (m³)</th></>}
                  {tipe === 'voyage' && <><th className="px-3 py-2.5 text-left text-xs font-semibold">Kapal</th><th className="px-3 py-2.5 text-left text-xs font-semibold">Trayek</th><th className="px-3 py-2.5 text-left text-xs font-semibold">Berangkat</th><th className="px-3 py-2.5 text-left text-xs font-semibold">Status</th></>}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={i} className="border-b border-surface-200 hover:bg-surface-50">
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    {tipe === 'penumpang' && <><td className="px-3 py-2 font-medium">{row.pelabuhan}</td><td className="px-3 py-2 text-right font-mono text-success-500">+{row.naik}</td><td className="px-3 py-2 text-right font-mono text-danger-500">-{row.turun}</td><td className="px-3 py-2 text-right font-mono font-bold">{row.saldo}</td></>}
                    {tipe === 'barang' && <><td className="px-3 py-2 font-medium">{row.pelabuhan}</td><td className="px-3 py-2 text-right font-mono">{row.muat}</td><td className="px-3 py-2 text-right font-mono">{row.muat_m3}</td><td className="px-3 py-2 text-right font-mono">{row.bongkar}</td><td className="px-3 py-2 text-right font-mono">{row.bongkar_m3}</td><td className="px-3 py-2 text-right font-mono font-bold">{row.total}</td><td className="px-3 py-2 text-right font-mono font-bold">{row.total_m3}</td></>}
                    {tipe === 'voyage' && <><td className="px-3 py-2 font-medium">{row.kapal?.nama}</td><td className="px-3 py-2 font-mono text-sea-600">{row.trayek?.kode}</td><td className="px-3 py-2">{new Date(row.tgl_berangkat).toLocaleDateString('id-ID')}</td><td className="px-3 py-2"><Badge variant={row.status === 'Selesai' ? 'selesai' : 'berlayar'}>{row.status}</Badge></td></>}
                  </tr>
                ))}
              </tbody>
              {(tipe === 'penumpang' || tipe === 'barang') && (
                <tfoot>
                  <tr className="bg-surface-50 font-bold text-navy-900">
                    <td className="px-3 py-2.5" colSpan={2}>TOTAL</td>
                    {tipe === 'penumpang' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono">{penumpangSummary.reduce((s, r) => s + r.naik, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{penumpangSummary.reduce((s, r) => s + r.turun, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{penumpangSummary.reduce((s, r) => s + r.saldo, 0)}</td>
                      </>
                    )}
                    {tipe === 'barang' && (
                      <>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.muat, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.muat_m3, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.bongkar, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.bongkar_m3, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.total, 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{barangSummary.reduce((s, r) => s + r.total_m3, 0)}</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-200 text-center text-xs text-slate-400">
            Dicetak dari SIPATUARI — {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </Card>
      )}
    </div>
  );
}
