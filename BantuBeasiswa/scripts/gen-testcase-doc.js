/* eslint-disable */
// Generator dokumentasi test case (E2E) untuk PB bagian Farras (PB-11, 17, 18, 19, 23)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber,
  Header, Footer, TableOfContents, PageBreak,
} = require('docx');

// ─── Konstanta layout ────────────────────────────────────────────────────────
const CONTENT_W = 9360; // US Letter, margin 1 inci
const C_BLUE = '0056B3';
const C_HEAD = 'D5E8F0';
const C_LABEL = 'EEF3F8';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargin = { top: 60, bottom: 60, left: 120, right: 120 };

function txt(text, opts = {}) { return new TextRun({ text, ...opts }); }
function para(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [txt(text, opts.run || {})];
  return new Paragraph({ children: runs, spacing: { after: 80 }, ...opts.para });
}

// Paragraf multi-baris (memecah \n menjadi beberapa Paragraph dalam satu cell)
function multiPara(text, opts = {}) {
  const lines = String(text).split('\n');
  return lines.map((ln, i) =>
    new Paragraph({
      children: [txt(ln, opts.run || {})],
      spacing: { after: i === lines.length - 1 ? 0 : 40 },
      ...(opts.para || {}),
    })
  );
}

// Baris label | nilai untuk tabel test case
function tcRow(label, valueLines, { numbered = false } = {}) {
  let valueChildren;
  if (numbered && Array.isArray(valueLines)) {
    valueChildren = valueLines.map((ln, i) =>
      new Paragraph({ children: [txt(`${i + 1}. ${ln}`)], spacing: { after: 40 } })
    );
  } else {
    valueChildren = multiPara(Array.isArray(valueLines) ? valueLines.join('\n') : valueLines);
  }
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 2160, type: WidthType.DXA }, margins: cellMargin,
        shading: { fill: C_LABEL, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [txt(label, { bold: true })] })],
      }),
      new TableCell({
        borders, width: { size: 7200, type: WidthType.DXA }, margins: cellMargin,
        children: valueChildren,
      }),
    ],
  });
}

// Satu test case = judul + tabel detail
function testCase(tc) {
  const titleP = new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [txt(`${tc.id} — ${tc.judul}`, { bold: true, color: C_BLUE })],
  });
  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2160, 7200],
    rows: [
      tcRow('Skenario', tc.skenario),
      tcRow('Prasyarat (Precondition)', tc.precondition),
      tcRow('Langkah Pengujian', tc.steps, { numbered: true }),
      tcRow('Input / Data Uji', tc.input),
      tcRow('Hasil yang Diharapkan', tc.expected),
      tcRow('Hasil Eksekusi', tc.hasil || '✅ PASS'),
    ],
  });
  return [titleP, table];
}

// Heading + info box sebuah PB
function pbSection(pb) {
  const out = [];
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt(`${pb.kode} — ${pb.nama}`)] }));
  const infoRows = [
    ['User Story', pb.userStory],
    ['Functional Requirement', pb.fr],
    ['PBI Terkait', pb.pbi],
    ['Halaman / Modul Diuji', pb.halaman],
    ['File Automated Test', pb.file],
  ].map(([k, v]) => new TableRow({
    children: [
      new TableCell({ borders, width: { size: 2700, type: WidthType.DXA }, margins: cellMargin,
        shading: { fill: C_LABEL, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [txt(k, { bold: true })] })] }),
      new TableCell({ borders, width: { size: 6660, type: WidthType.DXA }, margins: cellMargin,
        children: multiPara(v) }),
    ],
  }));
  out.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [2700, 6660], rows: infoRows }));
  out.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [txt('Daftar Test Case:', { bold: true })] }));
  pb.cases.forEach((tc) => testCase(tc).forEach((el) => out.push(el)));
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

// ─── DATA TEST CASE ──────────────────────────────────────────────────────────
const PBS = [
  {
    kode: 'PB-11', nama: 'Pusat Bantuan / Helpdesk Admin',
    userStory: 'Sebagai admin, saya ingin menyediakan pusat bantuan (helpdesk) sehingga kendala teknis pengguna dapat tertangani.',
    fr: 'FR-05 — Manajemen Laporan Kendala',
    pbi: 'PBI-17 (Pembuatan UI Helpdesk), PBI-18 (Setup Panel Admin)',
    halaman: '/admin/laporan (komponen TiketDetailPanel)',
    file: 'e2e/pb11-helpdesk.spec.js',
    cases: [
      {
        id: 'TC-PB11-01', judul: 'Render stat cards dan daftar tiket',
        skenario: 'Admin membuka halaman helpdesk dan sistem menampilkan kartu statistik serta daftar tiket laporan kendala dari API.',
        precondition: ['Pengguna login sebagai admin (cookie JWT role=admin valid).', 'API GET /api/admin/laporan-kendala dimock mengembalikan 2 tiket + statistik.'],
        steps: ['Set cookie autentikasi admin.', 'Buka halaman /admin/laporan.', 'Amati judul halaman, kartu statistik, dan baris tabel tiket.'],
        input: 'Tiket: #1 (Andi Pratama, status pending), #2 (Siti Aminah, status selesai). Stats: totalAktif=1, avgJam=12, totalUrgent=0.',
        expected: ['Judul "Laporan Kendala" tampil.', 'Kartu "Total Tiket Aktif" tampil.', 'Baris "Andi Pratama", "Beasiswa Garuda Nusantara", dan "Siti Aminah" tampil pada tabel.'],
      },
      {
        id: 'TC-PB11-02', judul: 'Filter tiket berdasarkan status',
        skenario: 'Admin menyaring tiket melalui pill filter status (Pending / Selesai).',
        precondition: ['Login admin.', 'Daftar tiket sudah termuat (lihat TC-PB11-01).'],
        steps: ['Buka /admin/laporan.', 'Klik pill "Pending".', 'Verifikasi hanya tiket pending tampil.', 'Klik pill "Selesai".', 'Verifikasi hanya tiket selesai tampil.'],
        input: 'Pilihan filter: "Pending", lalu "Selesai".',
        expected: ['Saat filter Pending: "Andi Pratama" tampil, "Siti Aminah" tidak tampil.', 'Saat filter Selesai: "Siti Aminah" tampil, "Andi Pratama" tidak tampil.'],
      },
      {
        id: 'TC-PB11-03', judul: 'Pencarian tiket berdasarkan nama pelapor',
        skenario: 'Admin mencari tiket dengan mengetik kata kunci nama pelapor pada kotak pencarian.',
        precondition: ['Login admin.', 'Daftar tiket termuat.'],
        steps: ['Buka /admin/laporan.', 'Ketik "Siti" pada input pencarian.', 'Amati hasil tabel yang difilter.'],
        input: 'Kata kunci pencarian: "Siti".',
        expected: ['Baris "Siti Aminah" tampil.', 'Baris "Andi Pratama" tidak tampil.'],
      },
      {
        id: 'TC-PB11-04', judul: 'Membuka panel detail tiket',
        skenario: 'Admin mengklik sebuah baris tiket untuk membuka panel detail berisi profil pelapor dan isi laporan.',
        precondition: ['Login admin.', 'Daftar tiket termuat.'],
        steps: ['Buka /admin/laporan.', 'Klik baris tiket #1 (id=tiket-row-1).', 'Amati panel detail yang muncul.'],
        input: 'Klik baris tiket dengan laporanId=1.',
        expected: ['Panel "Detail Laporan" tampil.', 'Label "Profil Pelapor" dan "Message History" tampil.', 'Informasi "ID Akun: 10" tampil pada panel.'],
      },
      {
        id: 'TC-PB11-05', judul: 'Memperbarui status tiket (respon admin)',
        skenario: 'Admin mengubah status tiket dari Pending menjadi Diproses dan menyimpannya; sistem mengirim permintaan PATCH ke server.',
        precondition: ['Login admin.', 'Panel detail tiket #1 terbuka.', 'API PATCH /api/admin/laporan-kendala dimock sukses.'],
        steps: ['Buka /admin/laporan dan klik baris tiket #1.', 'Pilih status "Diproses" pada dropdown #panel-status.', 'Klik tombol "Update Status" (#btn-send-reply).', 'Amati penutupan panel dan payload PATCH yang terkirim.'],
        input: 'Status baru = "diproses" untuk tiket id=1.',
        expected: ['Permintaan PATCH terkirim dengan payload { id: 1, status: "diproses" }.', 'Panel detail tertutup (konten "Detail Laporan" hilang).'],
      },
      {
        id: 'TC-PB11-06', judul: 'Validasi update tanpa perubahan status',
        skenario: 'Admin menekan tombol simpan tanpa mengubah status; sistem menampilkan pesan validasi.',
        precondition: ['Login admin.', 'Panel detail tiket #1 (status pending) terbuka.'],
        steps: ['Buka /admin/laporan dan klik baris tiket #1.', 'Tanpa mengubah dropdown, klik "Update Status".', 'Amati pesan validasi.'],
        input: 'Status tidak diubah (tetap "pending").',
        expected: ['Pesan "Pilih status baru terlebih dahulu" tampil.', 'Panel tetap terbuka.'],
      },
    ],
  },
  {
    kode: 'PB-17', nama: 'Tutorial Administrasi & Bookmark Beasiswa Favorit',
    userStory: 'Sebagai mahasiswa, saya ingin mengakses tutorial administrasi dan fitur bookmark sehingga penggunaan sistem lebih mudah.',
    fr: 'FR-11 (Portal Tutorial Administrasi), FR-12 (Bookmark Beasiswa Favorit)',
    pbi: 'PBI-30, PBI-31',
    halaman: '/tutorial-administrasi, /mahasiswa/cari, /mahasiswa/favorit (komponen BookmarkButton)',
    file: 'e2e/mahasiswa-tutorial-favorit.spec.js (diperkuat: assertion jumlah panggilan API memakai expect.poll agar bebas race-condition)',
    cases: [
      {
        id: 'TC-01', judul: 'Navigasi Administrative Journey (stepper 4 langkah)',
        skenario: 'Mahasiswa menelusuri 4 tahap tutorial administrasi dan konten berubah sesuai langkah yang dipilih.',
        precondition: ['Login sebagai mahasiswa.', 'Mock REST Supabase untuk beasiswa/provinsi/wilayah.'],
        steps: ['Buka /tutorial-administrasi.', 'Pastikan komponen "Administrative Journey" dan 4 langkah tampil.', 'Klik berturut-turut langkah Application, Verification, Disbursement, Preparation.', 'Verifikasi konten tiap langkah berubah.'],
        input: 'Klik tab langkah: Application → Verification → Disbursement → Preparation.',
        expected: ['Keempat langkah (Preparation, Application, Verification, Disbursement) tampil.', 'Konten deskripsi sesuai langkah yang aktif setiap kali diklik.'],
      },
      {
        id: 'TC-02', judul: 'Unduh template dokumen & filter kategori',
        skenario: 'Mahasiswa memfilter library template dan memverifikasi tautan unduh PDF/DOCX mengarah ke storage publik.',
        precondition: ['Login sebagai mahasiswa.'],
        steps: ['Buka /tutorial-administrasi.', 'Pada "Library Template Dokumen" klik tab Personal, Beasiswa, lalu Semua.', 'Verifikasi item template yang tampil sesuai kategori.', 'Periksa atribut href tautan PDF dan DOCX.'],
        input: 'Filter kategori: Personal, Beasiswa, Semua.',
        expected: ['Filter Personal menampilkan template CV; filter Beasiswa menampilkan template SKTM.', 'Tautan PDF & DOCX mengarah ke URL Supabase storage yang sesuai.'],
      },
      {
        id: 'TC-03', judul: 'Bookmark tanpa login → redirect ke halaman login',
        skenario: 'Pengunjung tanpa sesi menekan tombol bookmark dan diarahkan ke halaman login.',
        precondition: ['Tidak ada cookie sesi (status guest).', 'Mock REST favorit.'],
        steps: ['Buka landing page (/).', 'Klik ikon bookmark "Simpan Ke Favorit" pada kartu beasiswa.', 'Amati pengalihan halaman.'],
        input: 'Klik tombol bookmark sebagai guest.',
        expected: ['Pengguna dialihkan ke halaman /login.'],
      },
      {
        id: 'TC-04', judul: 'Optimistic toggle bookmark',
        skenario: 'Mahasiswa menambah lalu menghapus bookmark; UI berubah optimistik dan API POST/DELETE terpanggil tepat satu kali.',
        precondition: ['Login sebagai mahasiswa.', 'Mock REST favorit (GET/POST/DELETE).'],
        steps: ['Buka /mahasiswa/cari.', 'Klik tombol "Simpan Ke Favorit".', 'Verifikasi tombol berubah jadi "Hapus dari Favorit" dan POST terpanggil 1x.', 'Klik lagi untuk menghapus; verifikasi tombol kembali dan DELETE terpanggil 1x.'],
        input: 'Dua kali klik tombol bookmark (tambah lalu hapus).',
        expected: ['Visual tombol berubah secara optimistik.', 'API POST terpanggil tepat 1x; API DELETE terpanggil tepat 1x.'],
      },
      {
        id: 'TC-05', judul: 'Hapus dari daftar favorit',
        skenario: 'Mahasiswa menghapus beasiswa dari halaman Favorit dengan konfirmasi SweetAlert (termasuk alur batal).',
        precondition: ['Login sebagai mahasiswa.', 'Mock _next/data halaman favorit + REST DELETE favorit.'],
        steps: ['Buka /mahasiswa/cari lalu transisi ke menu "Beasiswa Favorit".', 'Klik "Hapus dari Favorit", lalu klik "Batal" pada popup.', 'Klik hapus lagi lalu konfirmasi "Ya, Hapus".', 'Klik OK pada popup berhasil.'],
        input: 'Aksi hapus favorit dengan konfirmasi.',
        expected: ['Saat Batal: kartu tetap ada.', 'Saat dikonfirmasi: kartu beasiswa hilang dari daftar favorit.'],
      },
      {
        id: 'TC-06', judul: 'Validasi unique bookmark (constraint 23505)',
        skenario: 'Saat API mengembalikan error unique constraint, UI mengembalikan (revert) status tombol ke semula.',
        precondition: ['Login sebagai mahasiswa.', 'Mock REST favorit POST mengembalikan 409 (kode 23505).'],
        steps: ['Buka /mahasiswa/cari.', 'Klik tombol "Simpan Ke Favorit".', 'Amati UI setelah API menolak.'],
        input: 'POST favorit menghasilkan 409 unique_violation.',
        expected: ['Tombol kembali ke status "Simpan Ke Favorit" (revert).', 'POST tercatat terkirim 1x.'],
      },
    ],
  },
  {
    kode: 'PB-18', nama: 'Transparansi Penyaluran Dana oleh Pendonor',
    userStory: 'Sebagai pendonor, saya ingin mengunggah bukti transfer dan mencetak laporan sehingga penyaluran transparan.',
    fr: 'FR-21 (Konfirmasi Penyaluran Dana), FR-22 (Generate Laporan Penyaluran)',
    pbi: 'PBI-32 (unggah bukti transfer), PBI-33 (PDF rekapitulasi)',
    halaman: '/pendonor/dashboard-laporan (FR-22), /pendonor/dashboard-pembayaran (FR-21)',
    file: 'e2e/pb18-penyaluran.spec.js',
    cases: [
      {
        id: 'TC-PB18-01', judul: 'Render ringkasan & tabel rekap penyaluran',
        skenario: 'Pendonor membuka dashboard laporan dan melihat ringkasan total penerima/dana serta tabel rekap per program.',
        precondition: ['Login sebagai pendonor.', 'Mock GET /api/pendonor/laporan mengembalikan 2 program.'],
        steps: ['Buka /pendonor/dashboard-laporan.', 'Amati judul, kartu ringkasan, dan baris tabel program.'],
        input: 'Program: Garuda Nusantara (3 lulus, tersalurkan Rp15jt), Ekonomi Harapan (2 lulus, pending).',
        expected: ['Judul "Rekapitulasi Program Beasiswa" tampil.', 'Total penerima "5 Mahasiswa" dan total dana "Rp 15.000.000" tampil.', 'Kedua program tampil pada sel tabel.'],
      },
      {
        id: 'TC-PB18-02', judul: 'Filter rekap berdasarkan status penyaluran',
        skenario: 'Pendonor menyaring rekap berdasarkan status penyaluran (mis. tersalurkan).',
        precondition: ['Login pendonor.', 'Data rekap termuat.'],
        steps: ['Buka /pendonor/dashboard-laporan.', 'Pilih "Tersalurkan" pada dropdown #filter-status.', 'Amati baris yang tersisa.'],
        input: 'Filter status = "tersalurkan".',
        expected: ['Sel "Beasiswa Garuda Nusantara" tampil.', 'Sel "Beasiswa Ekonomi Harapan" tidak tampil.'],
      },
      {
        id: 'TC-PB18-03', judul: 'Pencarian rekap berdasarkan nama program',
        skenario: 'Pendonor mencari program tertentu pada rekap penyaluran.',
        precondition: ['Login pendonor.', 'Data rekap termuat.'],
        steps: ['Buka /pendonor/dashboard-laporan.', 'Ketik "Ekonomi" pada kotak pencarian.', 'Amati hasil tabel.'],
        input: 'Kata kunci = "Ekonomi".',
        expected: ['Sel "Beasiswa Ekonomi Harapan" tampil.', 'Sel "Beasiswa Garuda Nusantara" tidak tampil.'],
      },
      {
        id: 'TC-PB18-04', judul: 'Unduh laporan rekap (PDF)',
        skenario: 'Pendonor menekan "Download PDF" dan sistem memicu unduhan berkas laporan rekap.',
        precondition: ['Login pendonor.', 'Data rekap termuat (minimal 1 baris).'],
        steps: ['Buka /pendonor/dashboard-laporan.', 'Pasang listener event unduhan.', 'Klik tombol "Download PDF".', 'Verifikasi nama berkas yang diunduh.'],
        input: 'Klik tombol Download PDF.',
        expected: ['Event unduhan terjadi.', 'Nama berkas sesuai pola laporan-rekap-program-YYYY-MM-DD.pdf.'],
      },
      {
        id: 'TC-PB18-05', judul: 'Empty state & tombol unduh nonaktif',
        skenario: 'Tanpa data rekap, sistem menampilkan empty state dan menonaktifkan tombol unduh.',
        precondition: ['Login pendonor.', 'Mock GET /api/pendonor/laporan mengembalikan data kosong.'],
        steps: ['Buka /pendonor/dashboard-laporan.', 'Amati pesan empty state dan kondisi tombol unduh.'],
        input: 'Respons API: data = [].',
        expected: ['Teks "Tidak Ada Data Program" tampil.', 'Tombol "Download PDF" dalam keadaan disabled.'],
      },
      {
        id: 'TC-PB18-06', judul: 'Konfirmasi batch penyaluran (unggah bukti transfer)',
        skenario: 'Pendonor mengunggah satu bukti transfer untuk batch penerima pending; sistem mengunggah berkas dan memanggil API konfirmasi batch.',
        precondition: ['Login sebagai pendonor.', 'Antrean penerima LULUS (dengan rekening, penyaluran status pending) diinjeksi via mock _next/data.', 'Mock Supabase Storage upload + API /api/pendonor/pembayaran/confirm-batch.'],
        steps: ['Buka /pendonor/dashboard-laporan lalu transisi client-side ke "Pembayaran Beasiswa".', 'Verifikasi halaman "Instruksi Pembayaran" dan penerima "Andi Pratama" tampil.', 'Unggah berkas bukti transfer (PNG) ke input file.', 'Amati popup sukses dan payload API confirm-batch.'],
        input: 'Berkas bukti-transfer.png; penyaluranId pending = [100].',
        expected: ['Popup SweetAlert "Berhasil!" tampil.', 'API confirm-batch terpanggil dengan penyaluranIds = [100] dan buktiTransferUrl bertipe string.'],
      },
    ],
  },
  {
    kode: 'PB-19', nama: 'Registrasi Akun Mandiri Sesuai Peran',
    userStory: 'Sebagai calon pengguna BantuBeasiswa, saya ingin membuat akun sendiri melalui halaman registrasi sehingga dapat langsung menggunakan fitur platform sesuai peran saya tanpa bantuan admin.',
    fr: '(Pendaftaran akun mahasiswa & pendonor)',
    pbi: 'PBI-34 (UI Registrasi), PBI-35 (API Registrasi)',
    halaman: '/register/mahasiswa, /register/pendonor',
    file: 'e2e/pb19-registrasi.spec.js',
    cases: [
      {
        id: 'TC-PB19-01', judul: 'Registrasi mahasiswa valid → redirect ke login',
        skenario: 'Calon mahasiswa mengisi form registrasi dengan data valid; sistem mengirim payload benar dan mengarahkan ke halaman login.',
        precondition: ['Halaman publik (tanpa login).', 'Mock POST /api/auth/register-mahasiswa mengembalikan 201.'],
        steps: ['Buka /register/mahasiswa.', 'Isi nama, email, password, dan konfirmasi password (cocok).', 'Klik "Daftar Sekarang".', 'Amati URL tujuan dan payload POST.'],
        input: 'nama=Budi Santoso, email=budi@univ.ac.id, password=rahasia123 (konfirmasi sama).',
        expected: ['Redirect ke /login?registered=true.', 'Payload POST = { nama, email, password } sesuai input.'],
      },
      {
        id: 'TC-PB19-02', judul: 'Password ≠ konfirmasi (mahasiswa) → validasi klien',
        skenario: 'Validasi sisi klien mencegah submit ketika password dan konfirmasi berbeda.',
        precondition: ['Halaman publik.'],
        steps: ['Buka /register/mahasiswa.', 'Isi password dan konfirmasi yang berbeda.', 'Klik "Daftar Sekarang".', 'Amati pesan error dan pemanggilan API.'],
        input: 'password=rahasia123, konfirmasi=tidaksama456.',
        expected: ['Pesan "Password dan Konfirmasi Password tidak cocok" tampil.', 'API registrasi TIDAK dipanggil.', 'Tetap di halaman /register/mahasiswa.'],
      },
      {
        id: 'TC-PB19-03', judul: 'Email sudah terdaftar (mahasiswa) → error server',
        skenario: 'Saat server menolak karena email duplikat, pesan error dari server ditampilkan.',
        precondition: ['Halaman publik.', 'Mock POST register-mahasiswa mengembalikan 409.'],
        steps: ['Buka /register/mahasiswa.', 'Isi data valid dengan email yang sudah ada.', 'Klik "Daftar Sekarang".', 'Amati pesan error.'],
        input: 'email=budi@univ.ac.id (server membalas "Email sudah terdaftar.").',
        expected: ['Pesan "Email sudah terdaftar." tampil.', 'Tetap di halaman /register/mahasiswa.'],
      },
      {
        id: 'TC-PB19-04', judul: 'Registrasi pendonor valid → redirect ke login',
        skenario: 'Calon pendonor mengisi form organisasi dengan data valid; sistem mengirim payload benar dan mengarahkan ke login.',
        precondition: ['Halaman publik.', 'Mock POST /api/auth/register-pendonor mengembalikan 201.'],
        steps: ['Buka /register/pendonor.', 'Isi nama organisasi, email, kontak, alamat, password (≥8) & konfirmasi.', 'Klik "Daftar Sekarang".', 'Amati URL tujuan dan payload POST.'],
        input: 'namaOrganisasi=Yayasan Bakti Pertiwi, email=kontak@bakti.org, kontak=08123456789, alamat=Jl. Merdeka No. 1, password=passw0rd8.',
        expected: ['Redirect ke /login?registered=true.', 'Payload POST berisi seluruh field organisasi sesuai input.'],
      },
      {
        id: 'TC-PB19-05', judul: 'Password < 8 karakter (pendonor) → validasi klien',
        skenario: 'Validasi klien menolak password pendonor yang kurang dari 8 karakter.',
        precondition: ['Halaman publik.'],
        steps: ['Buka /register/pendonor.', 'Isi seluruh field dengan password "short" (5 karakter).', 'Klik "Daftar Sekarang".', 'Amati pesan error dan pemanggilan API.'],
        input: 'password=short (konfirmasi sama).',
        expected: ['Pesan "Password harus minimal 8 karakter" tampil.', 'API registrasi TIDAK dipanggil.'],
      },
      {
        id: 'TC-PB19-06', judul: 'Konfirmasi password berbeda (pendonor) → validasi klien',
        skenario: 'Validasi klien menolak ketika konfirmasi password pendonor tidak sama.',
        precondition: ['Halaman publik.'],
        steps: ['Buka /register/pendonor.', 'Isi password=passw0rd8 dan konfirmasi=passw0rd9.', 'Klik "Daftar Sekarang".', 'Amati pesan error.'],
        input: 'password=passw0rd8, konfirmasi=passw0rd9.',
        expected: ['Pesan "Password dan konfirmasi password tidak cocok" tampil.'],
      },
    ],
  },
  {
    kode: 'PB-23', nama: 'Kelola Program Beasiswa oleh Admin',
    userStory: 'Sebagai admin, saya ingin mengelola (meninjau, menyetujui, menolak, dan menghapus) program beasiswa yang diajukan pendonor.',
    fr: 'Manajemen Program Beasiswa (sisi Admin)',
    pbi: 'PBI-40 (UI Kelola Beasiswa Admin), PBI-41 (Aksi Admin)',
    halaman: '/admin/beasiswa',
    file: 'e2e/admin-beasiswa.spec.js',
    cases: [
      {
        id: 'TC-UI-01 & 02', judul: 'Render daftar beasiswa & stat cards',
        skenario: 'Admin membuka halaman kelola beasiswa; stat cards dan daftar program ditampilkan akurat sesuai data.',
        precondition: ['Login sebagai admin.', 'Mock GET /api/admin/beasiswa mengembalikan 3 program (pending/aktif/draft).'],
        steps: ['Buka /admin/beasiswa.', 'Amati stat cards.', 'Verifikasi judul beasiswa & nama pendonor pada tabel.'],
        input: 'Program: Unggulan Prestasi (pending), Ekonomi Harapan (aktif), Teknologi Masa Depan (draft).',
        expected: ['Stat cards "Menunggu Persetujuan", "Beasiswa Aktif", "Total Program Beasiswa" tampil.', 'Judul program dan nama pendonor tampil sesuai mock.'],
      },
      {
        id: 'TC-UI-03 & 04', judul: 'Pencarian & filter status beasiswa',
        skenario: 'Admin mencari beasiswa berdasarkan kata kunci dan memfilter berdasarkan status.',
        precondition: ['Login admin.', 'Daftar beasiswa termuat.'],
        steps: ['Buka /admin/beasiswa.', 'Ketik "Unggulan" pada pencarian; verifikasi hasil.', 'Kosongkan pencarian, klik filter "Aktif"; verifikasi hasil.'],
        input: 'Pencarian "Unggulan"; filter status "Aktif".',
        expected: ['Pencarian menampilkan hanya "Beasiswa Unggulan Prestasi".', 'Filter Aktif menampilkan "Beasiswa Ekonomi Harapan" dan menyembunyikan yang lain.'],
      },
      {
        id: 'TC-UI-05 & API-04', judul: 'Menyetujui (approve) beasiswa pending',
        skenario: 'Admin menyetujui beasiswa berstatus pending melalui konfirmasi SweetAlert; sistem mengirim PATCH action=approve.',
        precondition: ['Login admin.', 'Mock PATCH /api/admin/beasiswa/201 sukses.'],
        steps: ['Buka /admin/beasiswa.', 'Pada baris pending, klik tombol "Setujui Program".', 'Konfirmasi popup "Setujui Beasiswa?" → "Ya, Setujui".', 'Klik OK pada popup berhasil.'],
        input: 'Approve beasiswaId=201.',
        expected: ['Popup konfirmasi lalu popup "Berhasil!" tampil.', 'PATCH terkirim dengan payload { action: "approve" }.'],
      },
      {
        id: 'TC-UI-06 & API-05', judul: 'Menolak (reject) beasiswa dengan alasan',
        skenario: 'Admin menolak beasiswa pending dengan menyertakan alasan penolakan; sistem mengirim PATCH action=reject + alasan.',
        precondition: ['Login admin.', 'Mock PATCH /api/admin/beasiswa/201 sukses.'],
        steps: ['Buka /admin/beasiswa.', 'Pada baris pending, klik tombol "Tolak Program".', 'Isi alasan penolakan pada modal.', 'Submit modal lalu klik OK pada popup berhasil.'],
        input: 'Alasan = "Syarat IPK minimal terlalu rendah, harap dinaikkan."',
        expected: ['Popup "Berhasil!" tampil dan modal tertutup.', 'PATCH terkirim dengan payload { action: "reject", alasan }.'],
      },
      {
        id: 'TC-UI-08 & API-08', judul: 'Menghapus beasiswa dengan alasan',
        skenario: 'Admin menghapus program beasiswa secara permanen dengan menyertakan alasan; sistem mengirim DELETE + alasan.',
        precondition: ['Login admin.', 'Mock DELETE /api/admin/beasiswa/202 sukses.'],
        steps: ['Buka /admin/beasiswa.', 'Pada baris target, klik tombol "Hapus Program".', 'Isi alasan pada modal hapus.', 'Submit modal lalu klik OK pada popup berhasil.'],
        input: 'Alasan = "Mitra pendonor meminta pembatalan program secara tertulis."',
        expected: ['Popup "Berhasil!" tampil dan modal tertutup.', 'DELETE terkirim dengan payload { alasan }.'],
      },
    ],
  },
];

// ─── Ringkasan eksekusi ──────────────────────────────────────────────────────
function ringkasanTable() {
  const head = new TableRow({
    tableHeader: true,
    children: ['PB', 'Modul', 'File Test', 'Jumlah TC', 'Status'].map((h, i) =>
      new TableCell({
        borders, margins: cellMargin, shading: { fill: C_HEAD, type: ShadingType.CLEAR },
        width: { size: [1100, 2600, 3360, 1100, 1200][i], type: WidthType.DXA },
        children: [new Paragraph({ children: [txt(h, { bold: true })] })],
      })
    ),
  });
  const rows = PBS.map((pb) => new TableRow({
    children: [
      pb.kode, pb.nama, pb.file.split(' ')[0], String(pb.cases.length), '✅ Lulus',
    ].map((v, i) => new TableCell({
      borders, margins: cellMargin,
      width: { size: [1100, 2600, 3360, 1100, 1200][i], type: WidthType.DXA },
      children: [new Paragraph({ children: [txt(String(v))] })],
    })),
  }));
  const total = PBS.reduce((s, pb) => s + pb.cases.length, 0);
  const totalRow = new TableRow({
    children: [
      new TableCell({ borders, margins: cellMargin, shading: { fill: C_LABEL, type: ShadingType.CLEAR },
        width: { size: 7060, type: WidthType.DXA }, columnSpan: 3,
        children: [new Paragraph({ children: [txt('TOTAL', { bold: true })] })] }),
      new TableCell({ borders, margins: cellMargin, shading: { fill: C_LABEL, type: ShadingType.CLEAR },
        width: { size: 1100, type: WidthType.DXA },
        children: [new Paragraph({ children: [txt(String(total), { bold: true })] })] }),
      new TableCell({ borders, margins: cellMargin, shading: { fill: C_LABEL, type: ShadingType.CLEAR },
        width: { size: 1200, type: WidthType.DXA },
        children: [new Paragraph({ children: [txt('✅', { bold: true })] })] }),
    ],
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [1100, 2600, 3360, 1100, 1200], rows: [head, ...rows, totalRow] });
}

// ─── Susun dokumen ───────────────────────────────────────────────────────────
const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
  children: [txt('DOKUMENTASI AUTOMATED TESTING (END-TO-END)', { bold: true, size: 32, color: C_BLUE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
  children: [txt('Proyek BantuBeasiswa — Kelompok C (PPL)', { bold: true, size: 26 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
  children: [txt('Cakupan: PB-11, PB-17, PB-18, PB-19, PB-23', { size: 22, italics: true })] }));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt('1. Pendahuluan')] }));
children.push(para([
  txt('Dokumen ini memuat dokumentasi pengujian otomatis berbasis '),
  txt('end-to-end (E2E)', { bold: true }),
  txt(' menggunakan '),
  txt('Playwright', { bold: true }),
  txt(' untuk Product Backlog (PB) yang menjadi tanggung jawab penulis pada proyek BantuBeasiswa. Setiap skenario dijalankan pada peramban Chromium terhadap server pengembangan Next.js, dengan autentikasi dan panggilan jaringan disimulasikan (mock) agar pengujian deterministik dan tidak bergantung pada basis data produksi.'),
]));
children.push(para([
  txt('Strategi pengujian: ', { bold: true }),
  txt('autentikasi dipalsukan melalui cookie JWT (helper loginAs), sedangkan respons API/REST disimulasikan via page.route. Pendekatan ini memungkinkan verifikasi alur antarmuka, validasi, serta kontrak payload yang dikirim ke server tanpa efek samping data nyata.'),
]));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt('2. Ringkasan Eksekusi')] }));
children.push(ringkasanTable());
children.push(para('', { para: { spacing: { after: 60 } } }));
children.push(para([
  txt('Catatan: ', { bold: true }),
  txt('seluruh test case di atas berstatus LULUS pada eksekusi terakhir. Format tiap test case mencakup Skenario, Prasyarat (precondition), Langkah Pengujian, Input/Data Uji, dan Hasil yang Diharapkan (expected result).'),
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt('3. Rincian Test Case per Product Backlog')] }));
PBS.forEach((pb) => pbSection(pb).forEach((el) => children.push(el)));

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C_BLUE },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [txt('BantuBeasiswa — Dokumentasi Test Case E2E', { size: 16, color: '888888' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [txt('Halaman ', { size: 16, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' })] })] }) },
    children,
  }],
});

const outPath = path.join('C:/Users/farra/Downloads', 'Dokumentasi-TestCase-E2E-BantuBeasiswa-KelompokC.docx');
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(outPath, buf); console.log('WROTE', outPath, buf.length, 'bytes'); });
