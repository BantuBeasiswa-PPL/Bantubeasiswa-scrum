import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withPendonorAuth } from '../../lib/auth';
import { supabase } from '../../lib/db';

const C = {
  blue: '#0056b3',
  gold: '#ffc107',
  dark: '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
};

export default function TungguVerifikasiPage({ user }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setStatusMessage('');

    try {
      const { data: pendonorData, error } = await supabase
        .from('pendonor')
        .select('statusVerifikasi')
        .eq('accountId', user.accountId)
        .single();

      if (error) {
        setStatusMessage('❌ Gagal mengambil status verifikasi');
        setIsRefreshing(false);
        return;
      }

      if (pendonorData.statusVerifikasi === 'verified') {
        setStatusMessage('✓ Akun Anda telah diverifikasi! Anda akan dialihkan ke dashboard...');
        setTimeout(() => {
          router.push('/pendonor/dashboard');
        }, 1500);
      } else if (pendonorData.statusVerifikasi === 'rejected') {
        setStatusMessage('✗ Akun Anda telah ditolak. Hubungi admin untuk informasi lebih lanjut.');
      } else {
        setStatusMessage('⏳ Status masih pending. Silakan coba lagi dalam beberapa saat.');
      }
    } catch (err) {
      setStatusMessage('❌ Terjadi kesalahan: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PendonorLayout user={user}>
      <Head>
        <title>Menunggu Verifikasi - BantuBeasiswa</title>
      </Head>

      <div style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '0 20px',
      }}>
        {/* Header Card */}
        <div style={{
          background: C.white,
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          <div style={{
            fontSize: '56px',
            marginBottom: '20px',
            display: 'inline-block',
            animation: 'spin 3s linear infinite',
          }}>
            ⏳
          </div>

          <h1 style={{
            color: C.dark,
            marginBottom: '12px',
            fontSize: '28px',
            fontWeight: '700',
          }}>
            Menunggu Verifikasi Admin
          </h1>

          <p style={{
            color: '#6b7280',
            marginBottom: '30px',
            fontSize: '16px',
            lineHeight: '1.6',
          }}>
            Akun organisasi Anda sedang ditinjau oleh tim admin. Proses verifikasi biasanya memakan waktu 1-2 hari kerja.
          </p>

          {/* Status Message */}
          {statusMessage && (
            <div style={{
              background: statusMessage.includes('✓') ? '#d1fae5' : statusMessage.includes('✗') ? '#fee2e2' : '#fef3c7',
              color: statusMessage.includes('✓') ? '#065f46' : statusMessage.includes('✗') ? '#991b1b' : '#92400e',
              padding: '14px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              border: `1px solid ${statusMessage.includes('✓') ? '#a7f3d0' : statusMessage.includes('✗') ? '#fecaca' : '#fde68a'}`,
              fontWeight: '500',
            }}>
              {statusMessage}
            </div>
          )}

          {/* Info Box */}
          <div style={{
            background: C.light,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '30px',
            textAlign: 'left',
          }}>
            <p style={{
              margin: '0 0 12px 0',
              color: C.dark,
              fontWeight: '600',
              fontSize: '14px',
            }}>
              📋 Informasi Penting:
            </p>
            <ul style={{
              margin: '0',
              paddingLeft: '20px',
              color: '#6b7280',
              fontSize: '14px',
              lineHeight: '1.8',
            }}>
              <li>Pastikan data organisasi Anda sudah lengkap dan akurat</li>
              <li>Anda akan menerima notifikasi saat akun diverifikasi</li>
              <li>Hubungi admin jika ada pertanyaan</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
          }}>
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              style={{
                padding: '12px 24px',
                background: C.blue,
                color: C.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => !isRefreshing && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !isRefreshing && (e.target.style.opacity = '1')}
            >
              {isRefreshing ? '⏳ Sedang memeriksa...' : '🔄 Refresh Status'}
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#6b7280',
                color: C.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => !isLoading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !isLoading && (e.target.style.opacity = '1')}
            >
              {isLoading ? '⏳ Sedang logout...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PendonorLayout>
  );
}

export async function getServerSideProps(context) {
  return withPendonorAuth(context);
}
