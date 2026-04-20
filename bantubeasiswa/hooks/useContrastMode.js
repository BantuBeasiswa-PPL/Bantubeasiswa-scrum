import { useState, useEffect } from 'react';
import { supabase } from '../lib/db';

export function useContrastMode(userId) {
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Load dari localStorage saat komponen dimount
  useEffect(() => {
    // Cek window untuk menghindari error SSR
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('contrastMode') === 'true';
      setIsHighContrast(savedMode);
      if (savedMode) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    }
  }, []);

  const toggleContrast = async () => {
    const newMode = !isHighContrast;
    setIsHighContrast(newMode);
    
    // Terapkan class ke documentElement dan simpan ke localStorage
    if (typeof window !== 'undefined') {
      if (newMode) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      localStorage.setItem('contrastMode', newMode.toString());
    }

    // Sync ke Supabase jika user sedang login
    if (userId) {
      try {
        await supabase
          .from('user')
          .update({ mode_kontras: newMode })
          .eq('id', userId);
      } catch (error) {
        console.error('Gagal sync mode kontras ke Supabase:', error);
      }
    }
  };

  return { isHighContrast, toggleContrast };
}
