'use client';

import { useState, useEffect } from 'react';
import { supabase } from './db';

/**
 * Custom hook untuk toggle ukuran font.
 * - Manages state dari localStorage
 * - Apply font size ke document.documentElement.style.fontSize
 * - Sync ke Supabase jika user login
 */
export function useFontSize(userId = null) {
  const [level, setLevel] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  // Mapping level → font size percentage
  const fontSizeMap = {
    1: '80%',
    2: '90%',
    3: '100%',
    4: '130%',
    5: '160%',
  };

  // Helper function to apply font size
  const applyFontSize = (newLevel) => {
    const fontSize = fontSizeMap[newLevel];
    if (fontSize) {
      document.documentElement.style.fontSize = fontSize;
    }
  };

  // Load dari localStorage saat mount
  useEffect(() => {
    const stored = localStorage.getItem('fontSizeLevel');
    const initialLevel = stored ? parseInt(stored, 10) : 3;
    
    // Validate level is 1-5
    const validLevel = Math.max(1, Math.min(5, initialLevel));
    setLevel(validLevel);
    applyFontSize(validLevel);
    
    setIsLoading(false);
  }, []);

  // Decrease font size
  const decrease = async () => {
    if (level <= 1) return;
    
    const newLevel = level - 1;
    setLevel(newLevel);
    applyFontSize(newLevel);
    
    // Update localStorage
    localStorage.setItem('fontSizeLevel', String(newLevel));

    // Sync ke Supabase jika user login
    if (userId) {
      try {
        await supabase
          .from('user')
          .update({ ukuran_font: newLevel })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to sync font size to Supabase:', error);
      }
    }
  };

  // Increase font size
  const increase = async () => {
    if (level >= 5) return;
    
    const newLevel = level + 1;
    setLevel(newLevel);
    applyFontSize(newLevel);
    
    // Update localStorage
    localStorage.setItem('fontSizeLevel', String(newLevel));

    // Sync ke Supabase jika user login
    if (userId) {
      try {
        await supabase
          .from('user')
          .update({ ukuran_font: newLevel })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to sync font size to Supabase:', error);
      }
    }
  };

  return {
    level,
    decrease,
    increase,
    isLoading,
    canDecrease: level > 1,
    canIncrease: level < 5,
  };
}
