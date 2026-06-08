import React, { useState } from 'react';

export default function ResultBanner({ status, judulBeasiswa, namaMahasiswa, nominal, namaOrganisasi, penyaluranInfo }) {
  const [showFeedback, setShowFeedback] = useState(false);

  if (!status || (status !== 'LULUS' && status !== 'DITOLAK')) {
    return null;
  }

  const formatRupiah = (value) => {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleDownload = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [0, 86, 179]; // Dark Blue
      const darkColor = [33, 41, 59]; // Slate Dark
      const grayColor = [100, 116, 139]; // Slate Gray
      const greenColor = [5, 150, 105]; // Emerald Green

      // ─── Header ───
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('BantuBeasiswa', 20, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('Portal Penyaluran & Pendanaan Beasiswa Nusantara', 20, 31);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);

      // ─── Document Title ───
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('SURAT KEPUTUSAN KELULUSAN BEASISWA', 105, 50, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`Nomor Ref: SKK/${penyaluranInfo?.penyaluranId || 'SK'}/${Date.now().toString().slice(-6)}`, 105, 56, { align: 'center' });

      // ─── Body Text ───
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      
      const introText = 'Berdasarkan hasil rangkaian proses seleksi berkas, verifikasi administrasi, dan seleksi kelayakan akademik oleh pihak pendonor, dengan ini BantuBeasiswa menyatakan bahwa pendaftar di bawah ini:';
      const splitIntro = doc.splitTextToSize(introText, 170);
      doc.text(splitIntro, 20, 70);

      // ─── Table / Candidate Info ───
      const startY = 88;
      const lineHeight = 8;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Nama Penerima', 20, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${namaMahasiswa || '—'}`, 60, startY);

      doc.setFont('helvetica', 'bold');
      doc.text('Program Beasiswa', 20, startY + lineHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${judulBeasiswa || '—'}`, 60, startY + lineHeight);

      doc.setFont('helvetica', 'bold');
      doc.text('Pemberi Beasiswa', 20, startY + (lineHeight * 2));
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${namaOrganisasi || '—'}`, 60, startY + (lineHeight * 2));

      doc.setFont('helvetica', 'bold');
      doc.text('Nominal Beasiswa', 20, startY + (lineHeight * 3));
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${formatRupiah(nominal)}`, 60, startY + (lineHeight * 3));

      // Divider Line
      doc.line(20, startY + (lineHeight * 4) + 2, 190, startY + (lineHeight * 4) + 2);

      // ─── Payment Section ───
      const payY = startY + (lineHeight * 4) + 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('STATUS PENYALURAN DANA', 20, payY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

      const isPaid = penyaluranInfo && (penyaluranInfo.status === 'confirmed' || penyaluranInfo.status === 'tersalurkan');
      const payDesc = isPaid 
        ? 'Selamat! Dana beasiswa Anda telah dikonfirmasi dan ditransfer langsung oleh pendonor ke rekening pencairan Anda yang terdaftar di sistem BantuBeasiswa. Rincian transfer transaksi dapat dilihat di bawah ini:'
        : 'Dana beasiswa Anda saat ini sedang dalam antrean pengiriman oleh pihak pendonor dan akan segera disalurkan ke rekening pencairan Anda. Rincian rencana penyaluran dapat dilihat di bawah ini:';
      
      const splitPayDesc = doc.splitTextToSize(payDesc, 170);
      doc.text(splitPayDesc, 20, payY + 6);

      // Payment Details Box
      const boxY = payY + 20;
      doc.setFillColor(248, 250, 252);
      doc.rect(20, boxY, 170, 36, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(20, boxY, 170, 36, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Status Pembayaran', 25, boxY + 8);
      doc.setFont('helvetica', 'normal');
      if (isPaid) {
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(':  BERHASIL DITRANSFER (Dikonfirmasi)', 65, boxY + 8);
      } else {
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(':  DALAM PROSES (Pending)', 65, boxY + 8);
      }

      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('ID Transaksi', 25, boxY + 16);
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${penyaluranInfo?.idTransaksi || '—'}`, 65, boxY + 16);

      doc.setFont('helvetica', 'bold');
      doc.text('Tanggal Transfer', 25, boxY + 24);
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${penyaluranInfo?.tanggalPenyaluran ? new Date(penyaluranInfo.tanggalPenyaluran).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, 65, boxY + 24);

      doc.setFont('helvetica', 'bold');
      doc.text('Jumlah Dana', 25, boxY + 32);
      doc.setFont('helvetica', 'normal');
      doc.text(`:  ${formatRupiah(penyaluranInfo?.jumlahDana || nominal)}`, 65, boxY + 32);

      // ─── Footnote / Signature ───
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Dokumen ini diterbitkan secara sah oleh sistem BantuBeasiswa dan tidak memerlukan tanda tangan basah.', 105, boxY + 46, { align: 'center' });

      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Jakarta, ${dateStr}`, 145, boxY + 58);
      doc.setFont('helvetica', 'bold');
      doc.text('BantuBeasiswa Operations', 145, boxY + 76);

      doc.save(`surat-kelulusan-${namaMahasiswa.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal membuat file PDF kelulusan.');
    }
  };

  const handleNextStep = () => {
    window.location.assign('/mahasiswa/daftar-ulang-rekening');
  };

  const isPaid = penyaluranInfo && (penyaluranInfo.status === 'confirmed' || penyaluranInfo.status === 'tersalurkan');
  const isLulus = status === 'LULUS';

  return (
    <div className="w-full animate-fade-in-up">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {isLulus ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 shadow-xl text-white border border-blue-500/30">
          {/* Decorative glows */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              {/* Check Circle Icon */}
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/30 border-2 border-white/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500 text-white rounded-full border border-emerald-400/20 shadow-sm animate-pulse">
                    Candidate Verified
                  </span>
                  {nominal && (
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-white/10 text-white rounded-full border border-white/15">
                      {formatRupiah(nominal)}
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2">
                  Selamat, {namaMahasiswa || 'Pendaftar'}! Anda Dinyatakan Lulus.
                </h2>
                <p className="text-sm md:text-base text-blue-100/90 max-w-2xl leading-relaxed mb-6">
                  Selamat atas terpilihnya Anda sebagai salah satu penerima beasiswa pada program **{judulBeasiswa || 'Beasiswa'}**. Anda telah melewati serangkaian seleksi administrasi dan verifikasi berkas dengan hasil yang luar biasa.
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200/70">Program</div>
                    <div className="text-sm font-semibold truncate">{judulBeasiswa || 'Beasiswa'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200/70">Tipe Beasiswa</div>
                    <div className="text-sm font-semibold">Full Tuition</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200/70">Pemberi Beasiswa</div>
                    <div className="text-sm font-semibold truncate">{namaOrganisasi || 'Pendonor'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200/70">Batch</div>
                    <div className="text-sm font-semibold">2024–2025</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={!isPaid}
                    className={`px-5 py-2.5 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${
                      isPaid 
                        ? 'bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 cursor-pointer' 
                        : 'bg-white/5 text-white/40 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${isPaid ? 'text-blue-200' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {isPaid ? 'Unduh Surat Kelulusan' : 'Unduh Surat Kelulusan (Menunggu Transfer)'}
                  </button>

                  <button
                    type="button"
                    id="btn-langkah-selanjutnya-rekening"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                      Langkah Selanjutnya →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 p-6 md:p-8 shadow-xl text-white border border-red-500/20">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-400 rounded-full blur-3xl opacity-25 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-500 rounded-full blur-3xl opacity-25 pointer-events-none" />

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-start gap-4">
              {/* X Circle Icon */}
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-red-600 shrink-0 shadow-lg shadow-red-500/20 border border-red-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2">
                  Terima Kasih Atas Partisipasi Anda
                </h2>
                <p className="text-sm md:text-base text-red-50/90 max-w-2xl leading-relaxed mb-6">
                  Meskipun pendaftaran Anda saat ini belum terpilih untuk menerima **{judulBeasiswa || 'Beasiswa'}**, kami sangat mengapresiasi waktu, dedikasi, dan kelengkapan berkas yang telah Anda tunjukkan dalam proses seleksi. Setiap tahap adalah pembelajaran berharga menuju kesuksesan di masa depan. Tetap semangat dan pantang menyerah!
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowFeedback(!showFeedback)}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {showFeedback ? 'Sembunyikan Feedback' : 'Lihat Feedback Seleksi'}
                  </button>
                </div>

                {/* Slide down feedback section */}
                {showFeedback && (
                  <div className="mt-4 p-5 bg-white/5 border border-white/10 rounded-xl animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-red-200/80 mb-2">
                      Review & Masukan Tim Penyeleksi:
                    </h3>
                    <p className="text-sm text-red-50/95 leading-relaxed">
                      &quot;Dokumen pendaftaran Anda lengkap dan memenuhi kualifikasi. Namun, karena keterbatasan kuota alokasi program beasiswa ini, tim seleksi memprioritaskan kandidat dengan kesesuaian profil dan skor seleksi kumulatif yang paling tinggi. Kami menyarankan Anda untuk terus memantau beasiswa mendatang dan melamar kembali.&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
