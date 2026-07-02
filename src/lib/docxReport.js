import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { getLampiranUrl } from './storage';

const TEMPLATE_URL = '/templates/fasilitas-pelabuhan-template.docx';

const EMU_PER_PX = 9525;
const MAX_IMAGE_WIDTH_PX = 560;
const MAX_IMAGE_HEIGHT_PX = 320;

// Word only reliably renders PNG/JPEG/GIF/BMP blips, so every upload (webp, avif, ...) is
// normalized to PNG via canvas rather than trusting the original mime type.
function loadAsPng(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 400;
      canvas.height = img.naturalHeight || 300;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) { reject(new Error('Gagal mengonversi foto pelabuhan.')); return; }
        pngBlob.arrayBuffer().then((arrayBuffer) => resolve({ arrayBuffer, width: canvas.width, height: canvas.height }));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal memuat foto pelabuhan.')); };
    img.src = url;
  });
}

async function buildFotoDrawingXml(paths, zip) {
  if (!paths?.length) return '';
  const rels = zip.files['word/_rels/document.xml.rels'].asText();
  const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  let nextRid = Math.max(0, ...usedIds) + 1;
  let relsXml = rels;
  const paragraphs = [];

  for (const path of paths) {
    const { url, error } = await getLampiranUrl(path);
    if (error || !url) continue;
    const res = await fetch(url);
    if (!res.ok) continue;
    const blob = await res.blob();
    const { arrayBuffer, width, height } = await loadAsPng(blob);
    const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / width, MAX_IMAGE_HEIGHT_PX / height);
    const cx = Math.round(width * scale * EMU_PER_PX);
    const cy = Math.round(height * scale * EMU_PER_PX);

    const rId = `rId${nextRid++}`;
    const mediaName = `foto-pelabuhan-${paragraphs.length}.png`;
    zip.file(`word/media/${mediaName}`, arrayBuffer);
    relsXml = relsXml.replace('</Relationships>',
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/></Relationships>`);

    const docPrId = 900000 + paragraphs.length;
    const label = `Foto ${paragraphs.length + 1}`;
    paragraphs.push(`<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${label}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${label}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
  }

  zip.file('word/_rels/document.xml.rels', relsXml);
  return paragraphs.join('');
}

function buildData(pelabuhan, f) {
  const v = (val) => val ?? '';
  const dermagaFields = {};
  ['betonCurah', 'betonI', 'betonII', 'serbaguna'].forEach((key) => {
    ['konstruksi', 'kapasitas', 'panjang', 'kedalaman', 'peruntukan'].forEach((col) => {
      dermagaFields[`dermaga_${key}_${col}`] = v(f.dermaga?.[key]?.[col]);
    });
  });
  const gudangFields = {};
  ['tertutup', 'terbuka'].forEach((key) => {
    ['luas', 'kapasitas'].forEach((col) => {
      gudangFields[`gudang_${key}_${col}`] = v(f.gudang?.[key]?.[col]);
    });
  });

  return {
    kode_pelabuhan: v(f.kode_pelabuhan),
    nama_pelabuhan: v(pelabuhan?.nama),
    alamat: v(f.alamat),
    kode_pos: v(f.kode_pos),
    kabupaten_kota: v(f.kabupaten_kota),
    provinsi: v(f.provinsi),
    telepon: v(f.telepon),
    fax: v(f.fax),
    telex: v(f.telex),
    pengelola: v(f.pengelola),
    alamat_pengelola: v(f.alamat_pengelola),
    koordinat_lu: v(f.koordinat?.lu),
    koordinat_bt: v(f.koordinat?.bt),

    status_pelabuhan_umum_diusahakan: f.status_pelabuhan === 'umum_diusahakan',
    status_pelabuhan_umum_tidak_diusahakan: f.status_pelabuhan === 'umum_tidak_diusahakan',
    status_pelabuhan_khusus: f.status_pelabuhan === 'khusus',
    status_pelabuhan_dermaga_khusus: f.status_pelabuhan === 'dermaga_khusus',

    status_terbuka_terbuka: f.status_terbuka === 'terbuka',
    status_terbuka_tidak_terbuka: f.status_terbuka === 'tidak_terbuka',

    kelas_utama: f.kelas_pelabuhan === 'utama',
    kelas_kelas_i: f.kelas_pelabuhan === 'kelas_i',
    kelas_kelas_ii: f.kelas_pelabuhan === 'kelas_ii',
    kelas_kelas_iii: f.kelas_pelabuhan === 'kelas_iii',
    kelas_kelas_iv: f.kelas_pelabuhan === 'kelas_iv',
    kelas_kelas_v: f.kelas_pelabuhan === 'kelas_v',
    kelas_wilayah_kerja: f.kelas_pelabuhan === 'wilayah_kerja',

    fungsi_internasional: f.fungsi_pelabuhan === 'internasional',
    fungsi_internasional_hub: f.fungsi_pelabuhan === 'internasional_hub',
    fungsi_nasional: f.fungsi_pelabuhan === 'nasional',
    fungsi_regional: f.fungsi_pelabuhan === 'regional',
    fungsi_lokal: f.fungsi_pelabuhan === 'lokal',
    peran_utama: f.peran_pelabuhan === 'utama',
    peran_pengumpul: f.peran_pelabuhan === 'pengumpul',
    peran_pengumpan: f.peran_pelabuhan === 'pengumpan',

    operasional_rencana: f.status_operasional === 'rencana',
    operasional_sedang_dibangun: f.status_operasional === 'sedang_dibangun',
    operasional_beroperasi: f.status_operasional === 'beroperasi',
    operasional_beroperasi_dikembangkan: f.status_operasional === 'beroperasi_dikembangkan',
    operasional_tidak_operasi: f.status_operasional === 'tidak_operasi',

    tahun_dibangun: v(f.tahun_dibangun),
    tahun_selesai_dibangun: v(f.tahun_selesai_dibangun),
    tahun_operasi_ditutup: v(f.tahun_operasi_ditutup),

    kondisi_baik: f.kondisi_pelabuhan === 'baik',
    kondisi_cukup: f.kondisi_pelabuhan === 'cukup',
    kondisi_kurang: f.kondisi_pelabuhan === 'kurang',
    kondisi_tidak_ada_data: f.kondisi_pelabuhan === 'tidak_ada_data',

    alur_panjang: v(f.alur_masuk?.panjang),
    alur_lebar: v(f.alur_masuk?.lebar),
    alur_kedalaman: v(f.alur_masuk?.kedalaman),

    kolam_luas: v(f.kolam_pelabuhan?.luas),
    kolam_kedalaman_min: v(f.kolam_pelabuhan?.kedalamanMin),
    kolam_kedalaman_maks: v(f.kolam_pelabuhan?.kedalamanMaks),

    pemanduan_wajib_pandu: f.status_pemanduan === 'wajib_pandu',
    pemanduan_melayani: f.status_pemanduan === 'melayani',
    pemanduan_tidak_melayani: f.status_pemanduan === 'tidak_melayani',
    pemanduan_tidak_ada: f.status_pemanduan === 'tidak_ada',

    stasiun_radio_pantai: v(f.stasiun_radio_pantai),
    koordinat_lego_jangkar: v(f.koordinat_lego_jangkar),
    jumlah_petugas_psc: v(f.jumlah_petugas_psc),

    jam_pelabuhan_hari: v(f.jam_kerja_pelabuhan?.hari),
    jam_pelabuhan_jam: v(f.jam_kerja_pelabuhan?.jam),
    jam_kantor_hari: v(f.jam_kerja_kantor?.hari),
    jam_kantor_jam: v(f.jam_kerja_kantor?.jam),

    ...dermagaFields,
    ...gudangFields,

    lapangan_luas: v(f.lapangan_penumpukan?.luas),
    lapangan_kapasitas: v(f.lapangan_penumpukan?.kapasitas),
    terminal_luas: v(f.terminal_penumpang?.luas),
    terminal_kapasitas: v(f.terminal_penumpang?.kapasitas),

    container_yard_ada: !!f.container_yard,
    container_yard_tidak_ada: !f.container_yard,

    shore_crane: v(f.peralatan_bongkar_muat?.shoreCrane),
    forklift: v(f.peralatan_bongkar_muat?.forklift),

    tkbm: v(f.tenaga_kerja_bongkar_muat?.tkbm),
    gang: v(f.tenaga_kerja_bongkar_muat?.gang),
    kemampuan: v(f.tenaga_kerja_bongkar_muat?.kemampuan),

    pandu: v(f.fasilitas_pemanduan?.pandu),
    kapal_pandu_tunda: v(f.fasilitas_pemanduan?.kapalPanduTunda),
    kapal_kepil: v(f.fasilitas_pemanduan?.kapalKepil),
    stasiun_pandu: v(f.fasilitas_pemanduan?.stasiunPandu),

    limbah_ada: !!f.penampungan_limbah,
    limbah_tidak_ada: !f.penampungan_limbah,

    tarif_labuh_niaga_rp: v(f.tarif?.jasaLabuh?.kapalNiagaRp),
    tarif_labuh_niaga_usd: v(f.tarif?.jasaLabuh?.kapalNiagaUsd),
    tarif_labuh_bukan_niaga_rp: v(f.tarif?.jasaLabuh?.kapalBukanNiagaRp),
    tarif_tambat_dermaga_rp: v(f.tarif?.jasaTambat?.dermagaRp),
    tarif_tambat_dermaga_usd: v(f.tarif?.jasaTambat?.dermagaUsd),
    tarif_tambat_breasting_rp: v(f.tarif?.jasaTambat?.breastingRp),
    tarif_tambat_breasting_usd: v(f.tarif?.jasaTambat?.breastingUsd),
    tarif_tambat_pinggiran_rp: v(f.tarif?.jasaTambat?.pinggiranRp),
    tarif_tambat_pinggiran_usd: v(f.tarif?.jasaTambat?.pinggiranUsd),
    tarif_pemanduan_tetap_rp: v(f.tarif?.jasaPemanduan?.tarifTetapRp),
    tarif_pemanduan_tetap_usd: v(f.tarif?.jasaPemanduan?.tarifTetapUsd),
    tarif_pemanduan_variabel_rp: v(f.tarif?.jasaPemanduan?.tarifVariabelRp),
    tarif_pemanduan_variabel_usd: v(f.tarif?.jasaPemanduan?.tarifVariabelUsd),
    tarif_air_dalam_negeri_rp: v(f.tarif?.jasaAirKapal?.dalamNegeriRp),
    tarif_air_luar_negeri_usd: v(f.tarif?.jasaAirKapal?.luarNegeriUsd),

    fas_telepon_umum: !!f.fasilitas_lainnya?.teleponUmum,
    fas_rumah_sakit: !!f.fasilitas_lainnya?.rumahSakit,
    fas_bank: !!f.fasilitas_lainnya?.bank,
    fas_pemadam: !!f.fasilitas_lainnya?.pemadamKebakaran,
    fas_pencemaran: !!f.fasilitas_lainnya?.penanggulanganPencemaran,

    status_data_telah_disurvey: f.status_data === 'telah_disurvey',
    status_data_belum_disurvey: f.status_data === 'belum_disurvey',
    status_data_baru: f.status_data === 'baru',

    keterangan: v(f.keterangan),
  };
}

export async function generateFasilitasDocx(pelabuhan, form) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Gagal memuat template laporan.');
  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const foto_drawing = await buildFotoDrawingXml(form.foto, zip);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render({ ...buildData(pelabuhan, form), foto_drawing });
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
