import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultBanner from '../components/ResultBanner';

// Mock jspdf for pdf generation testing
const mockSave = jest.fn();
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      setFont: jest.fn(),
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      setDrawColor: jest.fn(),
      setLineWidth: jest.fn(),
      line: jest.fn(),
      splitTextToSize: jest.fn().mockReturnValue([]),
      setFillColor: jest.fn(),
      rect: jest.fn(),
      save: mockSave,
    })),
  };
});

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

    expect(screen.getByText(/Selamat,/i)).toBeInTheDocument();
    expect(screen.getByText(/Farhan/i)).toBeInTheDocument();
    expect(screen.getByText(/Anda Dinyatakan Lulus./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Beasiswa Unggulan/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Yayasan Beasiswa Bakti/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp 12.000.000/i)).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: /Unduh Surat Kelulusan/i })).toBeInTheDocument();
    expect(screen.getByText(/Langkah Selanjutnya/i)).toBeInTheDocument();
  });

  test('should trigger jsPDF save when clicking download button', async () => {
    render(
      <ResultBanner
        status="LULUS"
        judulBeasiswa="Beasiswa Unggulan"
        namaMahasiswa="Farhan"
        nominal={12000000}
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /Unduh Surat Kelulusan/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
    expect(mockSave).toHaveBeenCalledWith('surat-kelulusan-Farhan.pdf');
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
    expect(screen.queryByText(/Review Tim Panitia/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Lihat Feedback/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Review Tim Panitia/i)).toBeInTheDocument();
    expect(screen.getByText(/Tutup Feedback/i)).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/Review Tim Panitia/i)).not.toBeInTheDocument();
  });
});
