import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withPendonorAuth } from '../../lib/auth';

const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  white: '#ffffff',
  gray : '#6b7280',
  green: '#059669',
  red  : '#dc2626',
  light: '#f8f9fa',
};

const DOKUMEN_CONFIG = [
  {
    jenis: 'akta_pendirian',
    label: 'Akta Pendirian Organisasi',
    desc: 'Dokumen legal pendirian yayasan/perusahaan (PDF, maks. 5MB)',
    icon: '📄',
    wajib: true,
  },
  {
    jenis: 'npwp',
    label: 'NPWP Organisasi',
    desc: 'Nomor Pokok Wajib Pajak organisasi pendonor',
    icon: '🏛️',
    wajib: true,
  },
  {
    jenis: 'ktp_penanggung_jawab',
    label: 'KTP Penanggung Jawab',
    desc: 'KTP direktur/ketua yang mewakili organisasi',
    icon: '🪪',
    wajib: true,
  },
  {
    jenis: 'surat_izin',
    label: 'Surat Izin / NIB',
    desc: 'Surat izin operasional atau NIB (opsional, disarankan)',
    icon: '📋',
    wajib: false,
  },
];

const STATUS_STYLE = {
  MENUNGGU : { bg: '#fffbeb', color: '#b45309', label: 'Menunggu Review' },
  DISETUJUI: { bg: '#d1fae5', color: '#065f46', label: 'Disetujui' },
  DITOLAK  : { bg: '#fee2e2', color: '#991b1b', label: 'Ditolak' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.MENUNGGU;
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DokumenVerifikasiPage({ user, isPending }) {
  const [dokumenMap, setDokumenMap] = useState({});
  const [uploadedWajib, setUploadedWajib] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchDokumen = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pendonor/dokumen-verifikasi');
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Gagal memuat dokumen');

      const map = {};
      (data.dokumen || []).forEach((d) => { if (d?.jenis) map[d.jenis] = d; });
      setDokumenMap(map);
      setUploadedWajib(data.uploadedWajib ?? 0);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDokumen(); }, []);

  const handleUpload = async (jenis, file) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setAlert({ type: 'error', message: 'Ukuran file maksimal 5MB.' });
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setAlert({ type: 'error', message: 'Format file harus PDF, JPG, atau PNG.' });
      return;
    }

    setUploading(jenis);
    setAlert({ type: '', message: '' });

    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch('/api/pendonor/dokumen-verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis,
          fileBase64,
          mimeType: file.type,
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Gagal mengunggah');

      setAlert({ type: 'success', message: `Dokumen "${data.dokumen?.label}" berhasil diunggah.` });
      if (typeof data.uploadedWajib === 'number') setUploadedWajib(data.uploadedWajib);
      await fetchDokumen();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setUploading(null);
    }
  };

  const totalWajib = DOKUMEN_CONFIG.filter((d) => d.wajib).length;

  return (
    <>
      <Head>
        <title>Dokumen Verifikasi · BantuBeasiswa</title>
        <meta name="description" content="Unggah dokumen pendukung verifikasi akun pendonor" />
      </Head>

      <PendonorLayout user={user} isPending={isPending}>
        {/* Page Header — konsisten dengan dashboard/profil */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Dokumen Verifikasi
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Unggah dokumen pendukung agar akun organisasi Anda dapat diverifikasi admin
          </p>
        </div>

        {/* Progress summary */}
        <div
          className="rounded-xl border p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>
              Dokumen Wajib Terunggah
            </p>
            <p className="text-2xl font-extrabold" style={{ color: C.blue }}>
              {uploadedWajib} / {totalWajib}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.gray }}>
              Status Akun
            </p>
            <p className="text-sm font-bold" style={{ color: isPending ? '#b45309' : C.green }}>
              {isPending ? 'Menunggu Verifikasi Admin' : 'Terverifikasi'}
            </p>
          </div>
          <div className="flex items-end">
            <Link
              href="/pendonor/profil"
              className="text-sm font-semibold hover:underline"
              style={{ color: C.blue }}
            >
              → Lengkapi Profil Pendonor
            </Link>
          </div>
        </div>

        {alert.message && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm font-medium mb-5"
            style={{
              backgroundColor: alert.type === 'success' ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${alert.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
              color: alert.type === 'success' ? '#065f46' : '#991b1b',
            }}
          >
            <span>{alert.message}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {DOKUMEN_CONFIG.map((cfg) => {
              const existing = dokumenMap[cfg.jenis];
              const isUploading = uploading === cfg.jenis;

              return (
                <div
                  key={cfg.jenis}
                  className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
                >
                  <div
                    className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                    style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: C.dark }}>
                          {cfg.label}
                          {cfg.wajib && <span style={{ color: C.red }}> *</span>}
                        </p>
                        <p className="text-xs" style={{ color: C.gray }}>{cfg.desc}</p>
                      </div>
                    </div>
                    {existing && <StatusBadge status={existing.statusDokumen} />}
                  </div>

                  <div className="px-5 py-4">
                    {existing?.rejectionReason && existing.statusDokumen === 'DITOLAK' && (
                      <div
                        className="mb-3 px-3 py-2 rounded-lg text-xs"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', color: C.red }}
                      >
                        <strong>Catatan admin:</strong> {existing.rejectionReason}
                      </div>
                    )}

                    {existing?.downloadUrl && (
                      <p className="text-xs mb-3" style={{ color: C.gray }}>
                        File terakhir{existing.fileName ? `: ${existing.fileName}` : ''}{' '}
                        <a
                          href={existing.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:underline"
                          style={{ color: C.blue }}
                        >
                          Lihat dokumen
                        </a>
                        {existing.updatedAt && (
                          <span> · Diunggah {new Date(existing.updatedAt).toLocaleDateString('id-ID')}</span>
                        )}
                      </p>
                    )}

                    <label
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-opacity"
                      style={{
                        backgroundColor: isUploading ? '#9ca3af' : C.blue,
                        color: C.white,
                        opacity: isUploading ? 0.8 : 1,
                        pointerEvents: isUploading ? 'none' : 'auto',
                      }}
                    >
                      {isUploading ? 'Mengunggah...' : existing ? '↻ Unggah Ulang' : '⬆ Pilih File'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(cfg.jenis, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center mt-6" style={{ color: C.gray }}>
          Setelah semua dokumen wajib diunggah, tim admin akan meninjau akun Anda dalam 1–2 hari kerja.
        </p>
      </PendonorLayout>
    </>
  );
}

export async function getServerSideProps(context) {
  return withPendonorAuth(context, { allowPending: true });
}
