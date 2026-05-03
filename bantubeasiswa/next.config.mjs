import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Folder proyek ini (tempat next.config.mjs & node_modules berada). */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Path absolut — wajib agar Turbopack tidak salah inferensi dari lockfile parent (`Tubes PPL`). */
const appRoot = path.resolve(__dirname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Hindari inferensi root dari lockfile di atas (`Tubes PPL/package-lock.json`)
   * yang membuat resolve `@import "tailwindcss"` mencari di folder tanpa node_modules app.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
   */
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
