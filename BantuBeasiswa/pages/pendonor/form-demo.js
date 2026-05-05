import { useState } from 'react';
import BeasiswaForm from '@/components/BeasiswaForm';

export default function BeasiswaFormDemo() {
  const [showForm, setShowForm] = useState(true);
  const [mode, setMode] = useState('create'); // 'create' or 'edit'
  const [submittedData, setSubmittedData] = useState(null);

  // Sample data for edit mode
  const sampleData = {
    judul: 'Beasiswa Prestasi Akademik Tahun 2026',
    deskripsi: 'Program beasiswa ini dirancang untuk mahasiswa berprestasi yang memiliki IPK minimal 3.5 dan aktif dalam kegiatan akademik maupun non-akademik. Kami memberikan dukungan penuh kepada mahasiswa terbaik untuk melanjutkan pendidikan mereka.',
    syarat: 'IPK minimal 3.5\nAktif dalam organisasi kampus\nBelum menerima beasiswa lain\nSurat rekomendasi dari dosen pembimbing\nEssay tentang rencana akademik',
    nominal: 5000000,
    kuota: 50,
    deadline: '2026-12-31T23:59',
    status: 'publish',
  };

  const handleSubmit = async (formData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Form submitted:', formData);
    setSubmittedData(formData);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSubmittedData(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Mode Selector */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => { setMode('create'); setShowForm(true); setSubmittedData(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: mode === 'create' ? '#0056b3' : '#e5e7eb',
              color: mode === 'create' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📝 Mode Create (Kosong)
          </button>
          <button
            onClick={() => { setMode('edit'); setShowForm(true); setSubmittedData(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: mode === 'edit' ? '#0056b3' : '#e5e7eb',
              color: mode === 'edit' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            ✏️ Mode Edit (Pre-filled)
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <BeasiswaForm
              initialData={mode === 'edit' ? sampleData : null}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Submitted Data Display */}
        {submittedData && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '0.75rem',
            padding: '2rem',
            marginTop: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Form Berhasil Disimpan!</h3>
            </div>
            <pre style={{
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              color: '#333',
            }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0056b3',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Buat Form Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
