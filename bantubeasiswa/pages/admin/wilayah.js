import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';

const PAGE_SIZE = 10;
const BRAND_BLUE = '#0056b3';

/** Pisahkan "Kab. X, Sumatera Utara" → kabupaten + provinsi (koma terakhir). */
function splitWilayahNama(nama) {
  if (!nama || typeof nama !== 'string') return { namaKab: '', provinsi: '' };
  const i = nama.lastIndexOf(',');
  if (i === -1) return { namaKab: nama.trim(), provinsi: '' };
  return { namaKab: nama.slice(0, i).trim(), provinsi: nama.slice(i + 1).trim() };
}

function mergeWilayahNama(namaKab, provinsi) {
  const k = (namaKab || '').trim();
  const p = (provinsi || '').trim();
  if (!p) return k;
  return `${k}, ${p}`;
}

function rowKode(row) {
  if (!row) return '';
  return row.kode ?? row.mode ?? '';
}

function districtInitial(namaKab) {
  const s = (namaKab || '').replace(/^Kab\.?\s*/i, '').trim();
  return (s[0] || '?').toUpperCase();
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day    : 'numeric',
      month  : 'short',
      year   : 'numeric',
    });
  } catch {
    return '—';
  }
}

const TIPE_OPTIONS = ['Terdepan', 'Terluar', 'Tertinggal'];

const TIPE_BADGE = {
  Terdepan   : 'bg-sky-50 text-sky-800 ring-sky-200',
  Terluar    : 'bg-amber-50 text-amber-900 ring-amber-200',
  Tertinggal : 'bg-rose-50 text-rose-900 ring-rose-200',
};

function TipeBadge({ tipe }) {
  const cls = TIPE_BADGE[tipe] || 'bg-gray-100 text-gray-700 ring-gray-200';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {tipe || '—'}
    </span>
  );
}

function StatusPill({ verified }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Terverifikasi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Tinjauan
    </span>
  );
}

function WilayahModal({ mode, initial, onClose, onSubmit, loading }) {
  const sp = initial ? splitWilayahNama(initial.nama) : { namaKab: '', provinsi: '' };
  const [form, setForm] = useState({
    namaKab    : sp.namaKab,
    provinsi   : sp.provinsi,
    tipe       : initial?.tipe || 'Terdepan',
    kode       : rowKode(initial) || '3T',
    isAfirmasi : initial?.isAfirmasi ?? false,
    is3T       : initial?.is3T ?? true,
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    const s = initial ? splitWilayahNama(initial.nama) : { namaKab: '', provinsi: '' };
    setForm({
      namaKab    : s.namaKab,
      provinsi   : s.provinsi,
      tipe       : initial?.tipe || 'Terdepan',
      kode       : rowKode(initial) || '3T',
      isAfirmasi : initial?.isAfirmasi ?? false,
      is3T       : initial?.is3T ?? true,
    });
    setErr('');
  }, [initial, mode]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.namaKab.trim()) {
      setErr('Nama kabupaten/kota wajib diisi.');
      return;
    }
    setErr('');
    onSubmit({
      nama       : mergeWilayahNama(form.namaKab, form.provinsi),
      tipe       : form.tipe,
      kode       : form.kode,
      isAfirmasi : form.isAfirmasi,
      is3T       : form.is3T,
    });
  }

  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0056b3] focus:ring-2 focus:ring-[#0056b3]/20';
  const labelCls = 'mb-1 block text-xs font-semibold text-gray-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="mb-5 text-lg font-bold text-gray-900">
          {mode === 'add' ? '➕ Tambah kabupaten 3T' : '✏️ Edit kabupaten'}
        </h2>
        {err && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelCls} htmlFor="wm-namaKab">
              Nama kabupaten/kota *
            </label>
            <input
              id="wm-namaKab"
              name="namaKab"
              value={form.namaKab}
              onChange={handleChange}
              placeholder="cth. Kab. Yahukimo"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="wm-prov">
              Provinsi
            </label>
            <input
              id="wm-prov"
              name="provinsi"
              value={form.provinsi}
              onChange={handleChange}
              placeholder="cth. Papua"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="wm-tipe">
              Kategori 3T *
            </label>
            <select id="wm-tipe" name="tipe" value={form.tipe} onChange={handleChange} className={inputCls}>
              {TIPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="wm-kode">
              Kode
            </label>
            <input
              id="wm-kode"
              name="kode"
              value={form.kode}
              onChange={handleChange}
              placeholder="3T"
              className={inputCls}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="is3T" checked={form.is3T} onChange={handleChange} />
              Wilayah 3T
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isAfirmasi" checked={form.isAfirmasi} onChange={handleChange} />
              Afirmasi
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0056b3] px-5 py-2 text-sm font-semibold text-white hover:bg-[#004494] disabled:opacity-60"
            >
              {loading ? 'Menyimpan…' : mode === 'add' ? 'Tambah' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function exportCSV(rows) {
  const header = ['wilayahId', 'Nama Kabupaten/Kota', 'Provinsi', 'Kategori 3T', 'Kode', 'is3T', 'isAfirmasi'];
  const lines = rows.map((r) => {
    const { namaKab, provinsi } = splitWilayahNama(r.nama);
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    return [
      r.wilayahId,
      esc(namaKab),
      esc(provinsi || '—'),
      esc(r.tipe),
      esc(rowKode(r) || '—'),
      r.is3T,
      r.isAfirmasi,
    ].join(',');
  });
  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `wilayah-3t-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Status visual: afirmasi atau entri lama dianggap “terverifikasi” untuk UI. */
function isRowVerified(row) {
  if (row?.isAfirmasi) return true;
  const u = row?.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  const c = row?.createdAt ? new Date(row.createdAt).getTime() : 0;
  return u > c + 60_000;
}

export default function WilayahPage({ user }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filterTipe, setFilterTipe] = useState('');
  const [filterProvinsi, setFilterProvinsi] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wilayah', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal memuat data.');
        return;
      }
      setList(data);
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [filterTipe, filterProvinsi, searchText, list.length]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  async function handleAdd(payload) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/wilayah', {
        method      : 'POST',
        credentials : 'same-origin',
        headers     : { 'Content-Type': 'application/json' },
        body        : JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`❌ ${data.message}`);
        return;
      }
      setList((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setModal(null);
      showToast('✅ Wilayah berhasil ditambahkan.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(payload) {
    const id = modal.row.wilayahId;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/wilayah/${id}`, {
        method      : 'PUT',
        credentials : 'same-origin',
        headers     : { 'Content-Type': 'application/json' },
        body        : JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`❌ ${data.message}`);
        return;
      }
      setList((prev) =>
        prev
          .map((r) => (r.wilayahId === id ? data : r))
          .sort((a, b) => a.nama.localeCompare(b.nama)),
      );
      setModal(null);
      showToast('✅ Wilayah berhasil diperbarui.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus wilayah ini? Tindakan tidak dapat dibatalkan.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/wilayah/${id}`, {
        method      : 'DELETE',
        credentials : 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`❌ ${data.message}`);
        return;
      }
      setList((prev) => prev.filter((r) => r.wilayahId !== id));
      showToast('🗑️ Wilayah berhasil dihapus.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setDeleting(null);
    }
  }

  const stats = useMemo(
    () => ({
      Terdepan   : list.filter((r) => r.tipe === 'Terdepan').length,
      Terluar    : list.filter((r) => r.tipe === 'Terluar').length,
      Tertinggal : list.filter((r) => r.tipe === 'Tertinggal').length,
    }),
    [list],
  );

  const terdepanTerluar = stats.Terdepan + stats.Terluar;

  const provinceOptions = useMemo(() => {
    const set = new Set();
    list.forEach((r) => {
      const { provinsi } = splitWilayahNama(r.nama);
      if (provinsi) set.add(provinsi.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [list]);

  const filteredList = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return list.filter((r) => {
      if (filterTipe && r.tipe !== filterTipe) return false;
      const { namaKab, provinsi } = splitWilayahNama(r.nama);
      if (filterProvinsi && provinsi.trim() !== filterProvinsi) return false;
      if (q) {
        const blob = `${namaKab} ${provinsi}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [list, filterTipe, filterProvinsi, searchText]);

  const totalFiltered = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, safePage]);

  const showFrom = totalFiltered === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(safePage * PAGE_SIZE, totalFiltered);

  return (
    <>
      <Head>
        <title>Regional Database · Kabupaten 3T · Admin</title>
        <meta
          name="description"
          content="Manajemen data kabupaten 3T — Terdepan, Terluar, Tertinggal."
        />
      </Head>

      <AdminLayout user={user}>
        {toast && (
          <div className="fixed bottom-6 right-6 z-[100] rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {toast}
          </div>
        )}

        <div className="mx-auto max-w-7xl space-y-6">
          {/* Breadcrumb */}
          <nav className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span className="text-gray-500">Main portal</span>
            <span className="mx-2">/</span>
            <span className="text-gray-500">Regional</span>
            <span className="mx-2">/</span>
            <span style={{ color: BRAND_BLUE }}>Kabupaten 3T</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                Regional Database Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                Kelola master kabupaten/kota kategori 3T untuk eligibilitas dan filter beasiswa di
                seluruh Indonesia.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => exportCSV(filteredList)}
                disabled={filteredList.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setModal({ mode: 'add' })}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <span className="text-lg leading-none">+</span>
                Add New District
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total wilayah
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums" style={{ color: BRAND_BLUE }}>
                {list.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Entitas kab/kota 3T aktif</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-amber-100">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tertinggal
                </p>
                <span className="text-xl" aria-hidden>
                  ⚠️
                </span>
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums text-amber-800">
                {stats.Tertinggal}
              </p>
              <p className="mt-1 text-xs text-gray-500">Lokasi kategori tertinggal</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-sky-100">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Terdepan &amp; Terluar
                </p>
                <span className="text-xl" aria-hidden>
                  🧭
                </span>
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums text-sky-900">{terdepanTerluar}</p>
              <p className="mt-1 text-xs text-gray-500">Perbatasan &amp; kepulauan terluar</p>
            </div>
            <div
              className="rounded-xl p-5 text-white shadow-lg"
              style={{
                background : `linear-gradient(135deg, ${BRAND_BLUE} 0%, #003d82 100%)`,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Dataset
              </p>
              <p className="mt-2 text-2xl font-black">{list.filter((r) => r.isAfirmasi).length}</p>
              <p className="mt-1 text-sm text-white/90">
                Baris 3T yang juga ditandai <strong>afirmasi</strong>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <span className="pb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                Filters
              </span>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Kategori</label>
                <select
                  value={filterTipe}
                  onChange={(e) => setFilterTipe(e.target.value)}
                  className="min-w-[160px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#0056b3]"
                >
                  <option value="">Semua kategori</option>
                  {TIPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Provinsi</label>
                <select
                  value={filterProvinsi}
                  onChange={(e) => setFilterProvinsi(e.target.value)}
                  className="min-w-[180px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#0056b3]"
                >
                  <option value="">Semua provinsi</option>
                  {provinceOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 lg:max-w-md lg:pl-4">
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                Cari nama / provinsi
              </label>
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filter cepat…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#0056b3]"
              />
            </div>
          </div>

          {/* Table card */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Memuat data wilayah…</div>
            ) : list.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <p className="text-lg font-semibold text-gray-700">Belum ada wilayah 3T</p>
                <p className="mt-2 text-sm">
                  Jalankan seed SQL atau gunakan <strong>Add New District</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        {[
                          'District',
                          'Province',
                          '3T Category',
                          'Status',
                          'Afirmasi',
                          'Last update',
                          '',
                        ].map((h) => (
                          <th
                            key={h || 'actions'}
                            className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageSlice.map((row, idx) => {
                        const { namaKab, provinsi } = splitWilayahNama(row.nama);
                        const ini = districtInitial(namaKab);
                        const verified = isRowVerified(row);
                        return (
                          <tr
                            key={row.wilayahId}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                                  style={{ backgroundColor: BRAND_BLUE }}
                                >
                                  {ini}
                                </div>
                                <span className="font-semibold text-gray-900">{namaKab}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{provinsi || '—'}</td>
                            <td className="px-4 py-3">
                              <TipeBadge tipe={row.tipe} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill verified={verified} />
                            </td>
                            <td className="px-4 py-3">
                              {row.isAfirmasi ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200">
                                  Ya
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                              {formatDateShort(row.updatedAt)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setModal({ mode: 'edit', row })}
                                className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#0056b3] hover:bg-blue-50"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row.wilayahId)}
                                disabled={deleting === row.wilayahId}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Hapus"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
                  <p className="text-xs text-gray-500">
                    Showing <strong className="text-gray-800">{showFrom}</strong> to{' '}
                    <strong className="text-gray-800">{showTo}</strong> of{' '}
                    <strong className="text-gray-800">{totalFiltered}</strong> entries
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - safePage) <= 1) return true;
                        return false;
                      })
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === '…' ? (
                          <span key={`e-${i}`} className="px-2 text-gray-400">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPage(item)}
                            className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-sm font-semibold ${
                              item === safePage
                                ? 'bg-[#0056b3] text-white'
                                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </AdminLayout>

      {modal && (
        <WilayahModal
          mode={modal.mode}
          initial={modal.row}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === 'add' ? handleAdd : handleEdit}
          loading={saving}
        />
      )}
    </>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
