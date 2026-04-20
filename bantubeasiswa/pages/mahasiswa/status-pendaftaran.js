import React, { useState } from 'react';
import Head from 'next/head';

const steps = [
  { id: 1, title: 'Registered', date: '12 Okt 2023' },
  { id: 2, title: 'Document Verification', date: '15 Okt 2023' },
  { id: 3, title: 'Interview Phase', date: '20 Okt 2023' },
  { id: 4, title: 'Final Decision', date: '25 Okt 2023' }
];

const phaseDetails = {
  1: {
    title: 'Tahap 1: Pendaftaran Terkirim',
    description: 'Aplikasi pendaftaran beasiswa Anda berhasil kami terima dan masuk ke dalam sistem. Saat ini kami sedang menunggu antrean untuk proses verifikasi. Pastikan Anda rajin mengecek status secara berkala.',
  },
  2: {
    title: 'Tahap 2: Verifikasi Dokumen',
    description: 'Tim reviewer kami sedang melakukan pengecekan terhadap keabsahan dokumen persyaratan yang Anda unggah (KTP, KTM, Transkrip Nilai, dan Surat Rekomendasi). Proses ini memakan waktu maksimal 5-7 hari kerja.',
  },
  3: {
    title: 'Tahap 3: Seleksi Wawancara',
    description: 'Selamat! Dokumen Anda dinyatakan valid. Silakan bersiap untuk tahap wawancara. Cek email Anda secara berkala untuk menerima undangan berisi jadwal dan tautan Zoom meeting dari panitia seleksi.',
  },
  4: {
    title: 'Tahap 4: Keputusan Akhir',
    description: 'Semua rangkaian seleksi telah Anda selesaikan. Saat ini panitia sedang melakukan rapat pleno untuk menentukan finalis penerima Beasiswa. Pengumuman resmi akan dipublikasikan selambat-lambatnya akhir pekan ini.',
  }
};

const recentActivities = [
  { id: 1, message: 'Memasuki tahap verifikasi berkas administrasi', time: '14 Okt, 14:30 WIB' },
  { id: 2, message: 'Pendaftaran aplikasi berhasil disubmit', time: '12 Okt, 10:05 WIB' },
  { id: 3, message: 'Dokumen KTM dan Transkrip berhasil diunggah', time: '12 Okt, 10:00 WIB' },
];

export default function StatusPendaftaran() {
  // Anda bisa mengganti currentStep (1-4) untuk melihat perubahan UI
  const [currentStep, setCurrentStep] = useState(2);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <Head>
        <title>Status Pendaftaran - BantuBeasiswa</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Beasiswa Mahasiswa Berprestasi 2023</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                {/* File Icon SVG */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ID Aplikasi: <span className="font-semibold text-gray-700">APP-2023901</span>
              </span>
              <span className="hidden hidden md:inline-block w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
              <span className="text-gray-500">Semester Ganjil 2023/2024</span>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
              In Progress
            </span>
          </div>
        </div>

        {/* Stepper Section */}
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px]">
            {steps.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;
              const isNotYet = step.id > currentStep;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="relative flex flex-col items-center flex-1">
                  
                  {/* Connector Line (drawn starting from previous step to current string) */}
                  {!isLast && (
                    <div 
                      className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors duration-300 ${
                        isCompleted ? 'bg-blue-600' : 'bg-gray-200 border-t-2 border-dashed border-gray-300'
                      }`} 
                      style={{ 
                        // Trick for dashed line handling
                        backgroundColor: isNotYet && step.id !== currentStep - 1 ? 'transparent' : undefined,
                        borderStyle: isCompleted || isActive ? 'solid' : 'dashed'
                      }}
                    />
                  )}

                  {/* Step Circle */}
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white mb-3">
                    {isCompleted && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {isActive && (
                      <div className="relative flex items-center justify-center w-8 h-8">
                        {/* Pulse Ring */}
                        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                        {/* Solid Inner Circle */}
                        <div className="relative z-10 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                    )}

                    {isNotYet && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white"></div>
                    )}
                  </div>

                  {/* Step Labels */}
                  <div className="text-center group">
                    <h3 className={`text-sm ${
                      isActive ? 'font-bold text-blue-700' : 
                      isCompleted ? 'font-medium text-gray-800' : 
                      'font-medium text-gray-400'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`mt-1 text-xs ${
                      isActive || isCompleted ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {step.date}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Current Phase Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Instruksi Saat Ini: {phaseDetails[currentStep].title}
            </h2>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mt-2 text-gray-700 leading-relaxed text-sm md:text-base">
              {phaseDetails[currentStep].description}
            </div>
            
            {/* Interactive button (dummy) depending on phase */}
            <div className="mt-6">
              {currentStep === 1 && (
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Lihat Berkas Saya</button>
              )}
              {currentStep === 2 && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">Hubungi Helpdesk</button>
              )}
              {currentStep === 3 && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Buka Tautan Wawancara
                </button>
              )}
               {currentStep === 4 && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">Lihat Pengumuman Lengkap</button>
              )}
            </div>
          </div>

          {/* Recent Activity Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Riwayat Aktivitas</h2>
            <div className="space-y-6">
              {recentActivities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Timeline connecting line */}
                  {index !== recentActivities.length - 1 && (
                    <div className="absolute top-6 left-[11px] bottom-[-24px] w-[2px] bg-gray-100"></div>
                  )}
                  {/* Timeline dot */}
                  <div className="relative mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                  {/* Timeline content */}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Floating Steps Switcher (Untuk Demo/Dummy Purpose) */}
        <div className="fixed bottom-6 right-6 bg-white p-3 rounded-xl shadow-lg border border-gray-200 flex flex-col gap-2 z-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Demo Controls</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(step => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
