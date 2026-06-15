import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultBanner from '../components/ResultBanner';
import { showSuccess } from '../lib/swal';

// Mock the swal utility
jest.mock('../lib/swal', () => ({
  showSuccess: jest.fn(),
}));

describe('ResultBanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render nothing if status is invalid or missing', () => {
    const { container } = render(<ResultBanner status="WAITING" />);
    expect(container.firstChild).toBeNull();
  });

  test('should render success banner and scholarship details when status is LULUS', () => {
    render(
      <ResultBanner
        status="LULUS"
        judulBeasiswa="Beasiswa Unggulan"
        namaMahasiswa="Farhan"
        nominal={12000000}
        namaOrganisasi="Yayasan Beasiswa Bakti"
      />
    );

    expect(screen.getByText(/Selamat, Farhan! Anda Dinyatakan Lulus./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Beasiswa Unggulan/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Yayasan Beasiswa Bakti/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp 12.000.000/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh Surat Kelulusan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Langkah Selanjutnya →/i })).toBeInTheDocument();
  });

  test('should trigger showSuccess swal alert when clicking download button', () => {
    render(
      <ResultBanner
        status="LULUS"
        judulBeasiswa="Beasiswa Unggulan"
        namaMahasiswa="Farhan"
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /Unduh Surat Kelulusan/i });
    fireEvent.click(downloadBtn);

    expect(showSuccess).toHaveBeenCalledTimes(1);
    expect(showSuccess).toHaveBeenCalledWith(
      'Simulasi Unduhan',
      expect.stringContaining('Mengunduh Surat Keputusan Kelulusan Beasiswa... (Unduhan Simulasi PDF)')
    );
  });

  test('should render rejection banner and toggle feedback section when status is DITOLAK', () => {
    render(
      <ResultBanner
        status="DITOLAK"
        judulBeasiswa="Beasiswa Unggulan"
        namaMahasiswa="Farhan"
      />
    );

    expect(screen.getByText(/Terima Kasih Atas Partisipasi Anda/i)).toBeInTheDocument();
    expect(screen.queryByText(/Review & Masukan Tim Penyeleksi/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Lihat Feedback Seleksi/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Review & Masukan Tim Penyeleksi/i)).toBeInTheDocument();
    expect(screen.getByText(/Sembunyikan Feedback/i)).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/Review & Masukan Tim Penyeleksi/i)).not.toBeInTheDocument();
  });
});
