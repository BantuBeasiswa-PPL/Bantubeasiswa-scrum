'use client';

import { useState, useEffect } from 'react';
import { supabase } from './db';

/**
 * Custom hook untuk toggle high contrast mode.
 * - Manages state dari localStorage
 * - Apply/remove class 'high-contrast' ke document.documentElement
 * - Inject dynamic CSS ke injectkan overrides untuk inline styles
 * - Sync ke Supabase jika user login
 */
export function useContrastMode(userId = null) {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic CSS untuk high contrast mode
  const highContrastCSS = `
    html.high-contrast,
    html.high-contrast body,
    html.high-contrast main {
      background: #0a0e27 !important;
      color: #ffffff !important;
    }

    html.high-contrast * {
      color: #ffffff !important;
    }

    html.high-contrast header {
      background: linear-gradient(90deg, #0f1b2e 0%, #1a0f3a 100%) !important;
      border-bottom: 2px solid #00d9ff !important;
    }

    html.high-contrast aside {
      background: linear-gradient(180deg, #0a0e27 0%, #1a0f3a 100%) !important;
      border-right: 3px solid #00d9ff !important;
    }

    html.high-contrast aside * {
      color: #ffffff !important;
    }

    html.high-contrast a {
      color: #00d9ff !important;
      text-decoration: underline;
    }

    html.high-contrast button,
    html.high-contrast input[type="button"],
    html.high-contrast input[type="submit"] {
      background-color: #00d9ff !important;
      color: #0a0e27 !important;
      border: 2px solid #00d9ff !important;
      font-weight: 600 !important;
    }

    html.high-contrast button:hover,
    html.high-contrast input[type="button"]:hover,
    html.high-contrast input[type="submit"]:hover {
      background-color: #ff00ff !important;
      border-color: #ff00ff !important;
      color: #ffffff !important;
    }

    html.high-contrast input,
    html.high-contrast textarea,
    html.high-contrast select {
      background-color: rgba(15, 27, 46, 0.8) !important;
      color: #ffffff !important;
      border: 2px solid #00d9ff !important;
    }

    html.high-contrast input::placeholder,
    html.high-contrast textarea::placeholder {
      color: #88ccff !important;
    }

    html.high-contrast [style*="background"],
    html.high-contrast [style*="backgroundColor"],
    html.high-contrast [class*="bg-white"],
    html.high-contrast .card {
      background: #1a0f3a !important;
      color: #ffffff !important;
      border-color: #00d9ff !important;
    }

    html.high-contrast svg {
      stroke: #00d9ff !important;
      fill: #00d9ff !important;
    }

    html.high-contrast svg path,
    html.high-contrast svg line,
    html.high-contrast svg circle,
    html.high-contrast svg rect {
      stroke: #00d9ff !important;
      fill: #00d9ff !important;
    }
  `;

  // Helper function to inject/remove CSS
  const updateDynamicStyles = (shouldInject) => {
    const styleId = 'high-contrast-dynamic-styles';
    let styleElement = document.getElementById(styleId);

    if (shouldInject) {
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = highContrastCSS;
        document.head.appendChild(styleElement);
      }
    } else {
      if (styleElement) {
        styleElement.remove();
      }
    }
  };

  // Load dari localStorage saat mount
  useEffect(() => {
    const stored = localStorage.getItem('contrastMode');
    const initialState = stored === 'true';
    setIsHighContrast(initialState);

    // Apply class ke DOM
    if (initialState) {
      document.documentElement.classList.add('high-contrast');
      updateDynamicStyles(true);
    } else {
      document.documentElement.classList.remove('high-contrast');
      updateDynamicStyles(false);
    }

    setIsLoading(false);
  }, []);

  // Toggle handler
  const toggle = async () => {
    const newState = !isHighContrast;
    setIsHighContrast(newState);

    // Update localStorage
    localStorage.setItem('contrastMode', String(newState));

    // Apply/remove class dari DOM
    if (newState) {
      document.documentElement.classList.add('high-contrast');
      updateDynamicStyles(true);
    } else {
      document.documentElement.classList.remove('high-contrast');
      updateDynamicStyles(false);
    }

    // Sync ke Supabase jika user login
    if (userId) {
      try {
        await supabase
          .from('user')
          .update({ mode_kontras: newState ? 1 : 0 })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to sync contrast mode to Supabase:', error);
      }
    }
  };

  return {
    isHighContrast,
    toggle,
    isLoading,
  };
}
