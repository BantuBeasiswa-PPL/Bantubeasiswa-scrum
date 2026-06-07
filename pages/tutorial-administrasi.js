import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '../components/layouts/MahasiswaLayout';
import AdminLayout from '../components/layouts/AdminLayout';
import { withAuth } from '../lib/auth';
import { getServerSupabase } from '../lib/supabaseServer';

const C = {
  blue: '#0056b3',
  gold: '#ffc107',
  dark: '#333333',
  gray: '#6b7280',
  light: '#f8f9fa',
  white: '#ffffff',
  green: '#10b981',
  indigo: '#6366f1',
  rose: '#f43f5e',
};

// Helper: Menentukan Kategori secara dinamis berdasarkan kata kunci judul (karena tidak ada kolom kategori di DB)
function getKategoriFromJudul(judul = '') {
  const j = judul.toLowerCase();
  if (j.includes('sktm') || j.includes('kip-k') || j.includes('motivation') || j.includes('beasiswa') || j.includes('rekomendasi')) {
    return 'Beasiswa';
  }
  if (j.includes('domisili') || j.includes('cv') || j.includes('ktp') || j.includes('rekening') || j.includes('profil')) {
    return 'Personal';
  }
  return 'Umum';
}

// Helper: membersihkan tag HTML & membatasi karakter untuk preview kartu
function getCleanPreview(htmlContent, maxLength = 150) {
  if (!htmlContent) return '';
  const cleanText = htmlContent.replace(/<[^>]*>/g, ' '); // Hapus tag HTML
  const trimmed = cleanText.replace(/\s+/g, ' ').trim(); // Gabungkan spasi berlebih
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength) + '...';
}

export default function TutorialAdministrasiPage({ user, initialTutorials, templates }) {
  // State untuk data tutorial (agar bisa langsung ditambahkan admin secara dinamis)
  const [tutorials, setTutorials] = useState(initialTutorials);

  // State untuk pencarian & kategori filter kartu tutorial
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');

  // State untuk tab filter template dokumen
  const [selectedTemplateTab, setSelectedTemplateTab] = useState('Semua');

  // State untuk modal "Baca Selengkapnya" tutorial
  const [activeModalTutorial, setActiveModalTutorial] = useState(null);

  // State untuk detail alur yang diklik di Administrative Journey
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);

  // State Form Tambah Tutorial (Khusus Admin)
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTutorialId, setEditingTutorialId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Daftar alur Administrative Journey beserta info tambahannya
  const JOURNEY_STEPS = [
    {
      title: 'Preparation',
      subtitle: 'Persiapan Dokumen',
      icon: '📝',
      color: C.blue,
      desc: 'Tahap awal mengumpulkan seluruh berkas prasyarat penting seperti SKTM, KK, KTP, dan surat rekomendasi untuk memastikan kelengkapan data awal.',
      checklist: [
        'Periksa masa aktif KTP & keabsahan KK',
        'Siapkan transkrip nilai akademik terbaru',
        'Buat SKTM di kelurahan bila mengajukan beasiswa ekonomi',
        'Scan semua berkas dalam format PDF maksimal 2MB'
      ]
    },
    {
      title: 'Application',
      subtitle: 'Pengisian & Upload',
      icon: '📤',
      color: C.indigo,
      desc: 'Proses memilih program beasiswa yang sesuai, melengkapi profil biodata di platform, serta mengunggah semua dokumen pendukung secara daring.',
      checklist: [
        'Pilih kategori beasiswa yang sesuai kualifikasi',
        'Isi biodata lengkap tanpa kesalahan ketik',
        'Upload dokumen persyaratan di slot yang disediakan',
        'Periksa kembali kelengkapan formulir sebelum submit'
      ]
    },
    {
      title: 'Verification',
      subtitle: 'Verifikasi & Ujian',
      icon: '🔍',
      color: C.gold,
      desc: 'Tahap pemeriksaan berkas administrasi oleh tim validator/admin dan pelaksanaan ujian kompetensi atau wawancara seleksi beasiswa.',
      checklist: [
        'Pantau status verifikasi berkas secara berkala',
        'Periksa kolom komentar jika ada berkas ditolak',
        'Persiapkan diri untuk ujian seleksi online (jika ada)',
        'Hadir tepat waktu saat jadwal wawancara'
      ]
    },
    {
      title: 'Disbursement',
      subtitle: 'Pencairan Dana',
      icon: '💰',
      color: C.green,
      desc: 'Penyelesaian administrasi akhir berupa verifikasi buku tabungan/rekening bank mahasiswa dan penyaluran beasiswa berkala oleh pihak pendonor.',
      checklist: [
        'Daftarkan nomor rekening aktif atas nama sendiri',
        'Unggah foto halaman pertama buku tabungan yang jelas',
        'Tunggu status verifikasi rekening menjadi aktif',
        'Pantau mutasi dan tanda terima penyaluran beasiswa'
      ]
    }
  ];

  // Helper untuk memasukkan kode HTML ke posisi kursor textarea admin
  const injectHTML = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('admin-content-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;

    const updatedText = text.substring(0, start) + replacement + text.substring(end);
    setNewContent(updatedText);

    // Fokuskan kembali & reset kursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 50);
  };

  // Submit Handler untuk Tambah/Edit Tutorial
  const handleAddTutorialSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newTitle.trim()) {
      setFormError('Judul wajib diisi.');
      return;
    }
    if (!newContent.trim()) {
      setFormError('Konten tutorial wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = editingTutorialId !== null;
      const url = '/api/admin/tutorial';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing 
        ? { tutorialId: editingTutorialId, judul: newTitle, konten: newContent }
        : { judul: newTitle, konten: newContent };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Gagal ${isEditing ? 'memperbarui' : 'menambahkan'} tutorial.`);
      }

      // Map dynamic category for client list
      const savedTutorial = {
        id: data.tutorialId,
        judul: data.judul,
        konten: data.konten,
        kategori: getKategoriFromJudul(data.judul),
      };

      if (isEditing) {
        setTutorials(tutorials.map(t => t.id === editingTutorialId ? savedTutorial : t));
        setFormSuccess('Tutorial berhasil diperbarui!');
      } else {
        setTutorials([savedTutorial, ...tutorials]); // Taruh di baris paling atas
        setFormSuccess('Tutorial berhasil ditambahkan!');
      }

      setNewTitle('');
      setNewContent('');
      setEditingTutorialId(null);
      setTimeout(() => setShowAddForm(false), 1500); // Tutup form setelah sukses
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Edit click
  const handleEditClick = (tutorial) => {
    setNewTitle(tutorial.judul);
    setNewContent(tutorial.konten);
    setEditingTutorialId(tutorial.id);
    setFormError('');
    setFormSuccess('');
    setShowAddForm(true);
    
    // Scroll mulus ke form panel
    const formElement = document.getElementById('admin-content-manager-panel');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handler Delete click
  const handleDeleteClick = async (tutorial) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus tutorial "${tutorial.judul}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tutorial?id=${tutorial.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus tutorial.');
      }

      // Hapus dari state
      setTutorials(tutorials.filter(t => t.id !== tutorial.id));
      alert('Tutorial berhasil dihapus.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Filter tutorial berdasarkan pencarian & kategori
  const filteredTutorials = tutorials.filter(t => {
    const matchesSearch = t.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.konten.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategori = selectedKategori === 'Semua' || t.kategori === selectedKategori;
    return matchesSearch && matchesKategori;
  });

  // Filter template berdasarkan kategori tab
  const filteredTemplates = templates.filter(t => {
    return selectedTemplateTab === 'Semua' || t.kategori === selectedTemplateTab;
  });

  // Pilih layout yang sesuai dengan role user aktif
  const Layout = user.role === 'admin' ? AdminLayout : MahasiswaLayout;

  return (
    <Layout user={user}>
      <Head>
        <title>Tutorial Administrasi · BantuBeasiswa</title>
        <meta name="description" content="Panduan langkah demi langkah pengurusan administrasi beasiswa, upload dokumen, serta template berkas penting." />
      </Head>

      {/* ─── Hero Section ─── */}
      <div 
        className="relative overflow-hidden rounded-2xl mb-8 p-8 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${C.blue} 0%, #0077cc 100%)` }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] right-[100px] w-32 h-32 rounded-full bg-white/5" />
        
        <p className="text-xs uppercase tracking-widest font-semibold text-yellow-300 mb-2">Panduan Lengkap</p>
        <h1 className="text-3xl font-extrabold mb-3">Tutorial & Template Administrasi</h1>
        <p className="text-sm md:text-base text-blue-100 max-w-2xl leading-relaxed">
          Temukan panduan lengkap menyusun dokumen beasiswa, kuasai langkah-langkah administrasi, 
          dan unduh berbagai format file template resmi siap pakai di bawah ini.
        </p>
      </div>

      {/* ─── Admin Content Manager Panel (Khusus Admin) ─── */}
      {user.role === 'admin' && (
        <div id="admin-content-manager-panel" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span className="text-xl">⚙️</span> {editingTutorialId ? '✏️ Edit Tutorial Administrasi' : 'Panel Kelola Konten (Khusus Admin)'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {editingTutorialId 
                  ? 'Ubah judul dan konten di bawah untuk memperbarui tutorial di database.' 
                  : 'Gunakan panel ini untuk menambah konten panduan administrasi beasiswa baru ke database secara langsung.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (showAddForm) {
                  // Reset form jika disembunyikan/dibatalkan
                  setNewTitle('');
                  setNewContent('');
                  setEditingTutorialId(null);
                }
                setShowAddForm(!showAddForm);
                setFormError('');
                setFormSuccess('');
              }}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
            >
              {showAddForm ? (editingTutorialId ? 'Batal Edit' : 'Sembunyikan Form') : 'Tambah Tutorial Baru +'}
            </button>
          </div>

          {/* Form Create Tutorial */}
          {showAddForm && (
            <form onSubmit={handleAddTutorialSubmit} className="mt-6 border-t border-slate-200 pt-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 animate-pulse">
                  ✅ {formSuccess}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Form Input fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Judul Panduan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Cara Membuat SKTM"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-black placeholder-gray-500 font-medium"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Konten (String HTML)</label>
                      
                      {/* HTML Formatting Helpers */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => injectHTML('<h2>', '</h2>')}
                          title="Inject Subjudul H2"
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-350 text-[10px] font-bold text-slate-700 rounded transition"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => injectHTML('<p>', '</p>')}
                          title="Inject Paragraph"
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-350 text-[10px] font-bold text-slate-700 rounded transition"
                        >
                          Paragraf
                        </button>
                        <button
                          type="button"
                          onClick={() => injectHTML('<ul><li>', '</li><li>Item 2</li></ul>')}
                          title="Inject Unordered List"
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-350 text-[10px] font-bold text-slate-700 rounded transition"
                        >
                          List Bullets
                        </button>
                        <button
                          type="button"
                          onClick={() => injectHTML('<strong>', '</strong>')}
                          title="Inject Bold Text"
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-350 text-[10px] font-bold text-slate-700 rounded transition"
                        >
                          Tebal
                        </button>
                      </div>
                    </div>
                    
                    <textarea
                      id="admin-content-textarea"
                      placeholder="Masukkan konten dengan HTML tag sederhana (h2, p, ul, li, strong)"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={7}
                      className="w-full px-4 py-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-black placeholder-gray-500 font-mono leading-relaxed"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      disabled={submitting}
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 Tip: Anda bisa klik tombol helper di kanan atas untuk menyisipkan kerangka tag HTML langsung ke posisi kursor pengetikan Anda.
                    </p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                    >
                      {submitting 
                        ? 'Menyimpan ke Database...' 
                        : (editingTutorialId ? 'Simpan Perubahan ✓' : 'Simpan Panduan Baru ✓')}
                    </button>
                    {editingTutorialId && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTitle('');
                          setNewContent('');
                          setEditingTutorialId(null);
                          setShowAddForm(false);
                          setFormError('');
                          setFormSuccess('');
                        }}
                        className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time HTML Preview block */}
                <div className="flex flex-col">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live Preview Hasil Tampilan</span>
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 overflow-y-auto max-h-[310px]">
                    {newTitle ? (
                      <h3 className="font-extrabold text-sm text-gray-900 pb-2 border-b border-gray-150 mb-3 leading-snug">
                        {newTitle}
                      </h3>
                    ) : (
                      <span className="text-xs text-slate-400 italic block mb-3">Ketik judul untuk melihat preview...</span>
                    )}

                    {newContent ? (
                      <div 
                        className="prose prose-sm max-w-none text-gray-700 space-y-3 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: newContent }}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">Ketik konten HTML untuk melihat hasil rendering di sini...</span>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ─── 1. Administrative Journey Steps ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm transition hover:shadow-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: C.gold }} />
          <h2 className="text-lg font-bold text-gray-900">Administrative Journey</h2>
        </div>

        {/* Desktop & Mobile Steps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {JOURNEY_STEPS.map((step, idx) => {
            const isActive = activeJourneyStep === idx;
            return (
              <button
                key={step.title}
                onClick={() => setActiveJourneyStep(idx)}
                className={`text-left p-4 rounded-xl border transition-all duration-300 relative group cursor-pointer ${
                  isActive 
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' 
                    : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Step Connector Line for Desktop */}
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-200 z-10 group-hover:bg-gray-300 transition-colors" />
                )}

                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: isActive ? '#ffffff' : '#eef2f6', border: `1px solid ${isActive ? '#dbeafe' : '#e2e8f0'}` }}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-400">Step 0{idx + 1}</span>
                </div>

                <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 truncate">{step.subtitle}</p>

                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl" style={{ backgroundColor: step.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Journey Step Detail Content */}
        <div className="mt-6 p-5 rounded-xl bg-gray-50 border border-gray-150 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: JOURNEY_STEPS[activeJourneyStep].color }} />
          
          <div className="grid md:grid-cols-[1fr_260px] gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{JOURNEY_STEPS[activeJourneyStep].icon}</span>
                <h4 className="text-base font-bold text-gray-900">
                  {JOURNEY_STEPS[activeJourneyStep].title} — <span className="text-gray-600 font-medium">{JOURNEY_STEPS[activeJourneyStep].subtitle}</span>
                </h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {JOURNEY_STEPS[activeJourneyStep].desc}
              </p>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Checklist Persyaratan:</h5>
              <ul className="space-y-2">
                {JOURNEY_STEPS[activeJourneyStep].checklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Tutorial Cards Grid Section ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: C.blue }} />
            <h2 className="text-lg font-bold text-gray-900">Grid Kartu Tutorial</h2>
          </div>

          {/* Search and Category Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Cari tutorial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-250 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
              {['Semua', 'Beasiswa', 'Personal', 'Umum'].map((kat) => (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                    selectedKategori === kat
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tutorials Grid */}
        {filteredTutorials.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <span className="text-4xl mb-3 block">📚</span>
            <p className="font-bold text-gray-800 text-sm mb-1">Tutorial tidak ditemukan</p>
            <p className="text-xs text-gray-500">Coba ganti kata kunci pencarian atau kategori filter Anda.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTutorials.map((tutorial) => {
              // Bagikan warna tag berdasarkan kategori
              const badgeStyle = {
                Beasiswa: { bg: 'bg-blue-50 text-blue-700 border-blue-100', color: C.blue },
                Personal: { bg: 'bg-purple-50 text-purple-700 border-purple-100', color: C.indigo },
                Umum: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', color: C.green },
              }[tutorial.kategori] || { bg: 'bg-gray-50 text-gray-700 border-gray-100', color: C.gray };

              return (
                <article
                  key={tutorial.id}
                  className="group relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Card: Icon + Category Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: '#f0f4f9', border: '1px solid #e2e8f0' }}
                      >
                        📄
                      </div>
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${badgeStyle.bg}`}>
                        {tutorial.kategori}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-sm text-gray-900 mb-2 leading-snug group-hover:text-blue-700 transition-colors">
                      {tutorial.judul}
                    </h3>

                    {/* Content Preview */}
                    <p className="text-xs text-gray-500 leading-relaxed mb-5">
                      {getCleanPreview(tutorial.konten, 150)}
                    </p>
                  </div>

                  {/* Action buttons (Read & Admin Actions) */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setActiveModalTutorial(tutorial)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold transition-all text-blue-600 hover:text-blue-800"
                    >
                      Baca Selengkapnya
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>

                    {user.role === 'admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(tutorial)}
                          title="Edit Panduan"
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(tutorial)}
                          title="Hapus Panduan"
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-md transition"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. Document Template Library Section ─── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: C.blue }} />
            <h2 className="text-lg font-bold text-gray-900">Library Template Dokumen</h2>
          </div>

          {/* Document Tab Filter */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 self-start md:self-auto">
            {['Semua', 'Beasiswa', 'Personal'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTemplateTab(tab)}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                  selectedTemplateTab === tab
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid Layout */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const badgeStyle = template.kategori === 'Beasiswa' 
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : 'bg-purple-50 text-purple-700 border-purple-100';

            return (
              <div
                key={template.id}
                className="bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-2xl transition-transform duration-300 group-hover:rotate-6">📁</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeStyle}`}>
                      {template.kategori}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 mb-2 leading-tight">
                    {template.judul}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-5">
                    {template.deskripsi}
                  </p>
                </div>

                {/* Download Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={template.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 rounded-lg text-xs font-bold text-red-600 bg-red-50/30 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                  >
                    <span>📄</span> PDF
                  </a>
                  <a
                    href={template.docxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-blue-200 rounded-lg text-xs font-bold text-blue-600 bg-blue-50/30 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span>📝</span> DOCX
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 4. Detailed Tutorial Modal ─── */}
      {activeModalTutorial && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity"
          onClick={() => setActiveModalTutorial(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-150 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#f8fafc' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-gray-900 leading-snug">
                    {activeModalTutorial.judul}
                  </h3>
                  <span className="mt-1 inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-700 border border-blue-100">
                    {activeModalTutorial.kategori}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveModalTutorial(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-lg font-bold"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: activeModalTutorial.konten }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={() => setActiveModalTutorial(null)}
                className="py-2 px-5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all duration-200 shadow-sm"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles custom untuk konten HTML tutorial agar rapi */}
      <style>{`
        .prose h2 {
          font-size: 1.125rem;
          font-weight: 800;
          color: #111827;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          border-bottom: 1.5px solid #e5e7eb;
          padding-bottom: 0.25rem;
        }
        .prose p {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.75rem;
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: #4b5563;
        }
        .prose li {
          margin-bottom: 0.35rem;
          line-height: 1.45;
        }
        .prose strong {
          color: #111827;
          font-weight: 700;
        }
      `}</style>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  // Verifikasi otentikasi mahasiswa atau admin
  const auth = withAuth(context, ['mahasiswa', 'admin']);
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const supabase = getServerSupabase();

  // Fetch tutorial data dari Supabase tabel 'tutorial' order by tutorialId desc (paling baru di atas)
  const { data: tutorialsResult, error: dbError } = await supabase
    .from('tutorial')
    .select('tutorialId, judul, konten')
    .order('tutorialId', { ascending: false });

  if (dbError) {
    console.error('Error fetching tutorials:', dbError);
  }

  // Map data tutorial & tentukan kategori secara dinamis di server-side
  const initialTutorials = (tutorialsResult || []).map(t => ({
    id: t.tutorialId,
    judul: t.judul,
    konten: t.konten,
    kategori: getKategoriFromJudul(t.judul),
  }));

  // Data master template dokumen beserta url public storage bucket 'templates'
  const templatesMaster = [
    {
      id: 'sktm',
      judul: 'Template SKTM (Surat Keterangan Tidak Mampu)',
      deskripsi: 'Format surat keterangan tidak mampu kelurahan sebagai syarat beasiswa kategori ekonomi.',
      kategori: 'Beasiswa',
      pdfFile: 'sktm-template.pdf',
      docxFile: 'sktm-template.docx',
    },
    {
      id: 'kipk',
      judul: 'Format Surat Pernyataan KIP Kuliah',
      deskripsi: 'Surat pernyataan kebenaran data ekonomi keluarga dan komitmen kepatuhan penerima KIP-K.',
      kategori: 'Beasiswa',
      pdfFile: 'pernyataan-kipk.pdf',
      docxFile: 'pernyataan-kipk.docx',
    },
    {
      id: 'penghasilan',
      judul: 'Template Surat Keterangan Penghasilan',
      deskripsi: 'Format surat pernyataan penghasilan resmi orang tua bagi pekerja informal/wiraswasta.',
      kategori: 'Beasiswa',
      pdfFile: 'penghasilan-orangtua.pdf',
      docxFile: 'penghasilan-orangtua.docx',
    },
    {
      id: 'domisili',
      judul: 'Format Surat Pernyataan Domisili',
      deskripsi: 'Format resmi pengantar RT/RW setempat untuk permohonan surat keterangan domisili sementara.',
      kategori: 'Personal',
      pdfFile: 'domisili-template.pdf',
      docxFile: 'domisili-template.docx',
    },
    {
      id: 'cv-ats',
      judul: 'Template CV Profesional ATS-Friendly',
      deskripsi: 'Panduan format riwayat hidup berstandar ATS untuk lolos filter pemberi beasiswa.',
      kategori: 'Personal',
      pdfFile: 'cv-ats-template.pdf',
      docxFile: 'cv-ats-template.docx',
    },
  ];

  // Dapatkan URL publik untuk masing-masing template dokumen dari storage bucket 'templates'
  const templates = templatesMaster.map(item => {
    const { data: pdfUrlData } = supabase.storage.from('templates').getPublicUrl(item.pdfFile);
    const { data: docxUrlData } = supabase.storage.from('templates').getPublicUrl(item.docxFile);

    return {
      id: item.id,
      judul: item.judul,
      deskripsi: item.deskripsi,
      kategori: item.kategori,
      pdfUrl: pdfUrlData?.publicUrl || '#',
      docxUrl: docxUrlData?.publicUrl || '#',
    };
  });

  return {
    props: {
      user,
      initialTutorials,
      templates,
    },
  };
}
