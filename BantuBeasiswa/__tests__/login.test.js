import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../pages/login';

// Mock next/router push specifically for these tests
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: mockPush,
  }),
}));

global.fetch = jest.fn();

describe('LoginPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render login page UI components', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /Masuk ke Akun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mahasiswa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pendonor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  test('should switch register link role when selecting a different role', () => {
    render(<LoginPage />);
    
    // Initially, selected role is 'mahasiswa' -> shows "Daftar sebagai Mahasiswa"
    expect(screen.getByText(/Daftar sebagai Mahasiswa/i)).toBeInTheDocument();

    const pendonorBtn = screen.getByRole('button', { name: 'Pendonor' });
    fireEvent.click(pendonorBtn);

    // After switching, shows "Daftar sebagai Pendonor"
    expect(screen.getByText(/Daftar sebagai Pendonor/i)).toBeInTheDocument();
  });

  test('should call loginAPI and redirect on successful login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ redirect: '/mahasiswa/dashboard' }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mhs@univ.ac.id' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass123' } });

    const submitBtn = screen.getByRole('button', { name: 'Masuk' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/loginAPI', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mhs@univ.ac.id', password: 'pass123', role: 'mahasiswa' }),
      }));
      expect(mockPush).toHaveBeenCalledWith('/mahasiswa/dashboard');
    });
  });

  test('should render error message on failed login response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Email atau password salah.' }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@univ.ac.id' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: 'Masuk' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Email atau password salah.')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
