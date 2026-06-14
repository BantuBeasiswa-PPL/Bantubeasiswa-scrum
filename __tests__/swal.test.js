import { showAlert, showSuccess, showError, showWarning, showConfirm } from '../lib/swal';
import Swal from 'sweetalert2';

jest.mock('sweetalert2', () => ({
  fire: jest.fn().mockResolvedValue({ isConfirmed: true }),
}));

describe('SweetAlert2 Helper Wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('showSuccess should trigger Swal.fire with success icon and arguments', async () => {
    await showSuccess('Sukses', 'Data berhasil disimpan');
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'success',
      title: 'Sukses',
      text: 'Data berhasil disimpan',
      buttonsStyling: false,
    }));
  });

  test('showError should trigger Swal.fire with error icon', async () => {
    await showError('Error', 'Gagal memproses data');
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'error',
      title: 'Error',
      text: 'Gagal memproses data',
    }));
  });

  test('showWarning should trigger Swal.fire with warning icon', async () => {
    await showWarning('Peringatan', 'Harap isi semua kolom');
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Peringatan',
      text: 'Harap isi semua kolom',
    }));
  });

  test('showConfirm should trigger Swal.fire with confirm options', async () => {
    const res = await showConfirm('Hapus data?', 'Tindakan ini tidak bisa dibatalkan', 'Ya, Hapus', 'Batal', true);
    expect(res.isConfirmed).toBe(true);
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Hapus data?',
      text: 'Tindakan ini tidak bisa dibatalkan',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }));
  });

  test('showConfirm danger mode should apply red button class', async () => {
    await showConfirm('Hapus', 'Hapus?', 'Hapus', 'Batal', true);
    const lastCall = Swal.fire.mock.calls[0][0];
    expect(lastCall.customClass.confirmButton).toContain('bg-red-650');
  });

  test('showConfirm normal mode should apply blue button class', async () => {
    await showConfirm('Konfirmasi', 'Lanjut?', 'Ya', 'Batal', false);
    const lastCall = Swal.fire.mock.calls[0][0];
    expect(lastCall.customClass.confirmButton).toContain('bg-blue-600');
  });
});
