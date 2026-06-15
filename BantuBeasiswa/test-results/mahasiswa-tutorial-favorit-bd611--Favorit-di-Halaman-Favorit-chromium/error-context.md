# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mahasiswa-tutorial-favorit.spec.js >> PBI-30 & PBI-31: Mahasiswa Tutorial & Favorit E2E Tests >> TC-05: Hapus dari Daftar Favorit di Halaman Favorit
- Location: e2e\mahasiswa-tutorial-favorit.spec.js:199:3

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button[title="Hapus dari Favorit"]').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: BB
          - generic [ref=e8]: BantuBeasiswa
        - generic [ref=e9]:
          - generic [ref=e10]: MT
          - generic [ref=e11]:
            - paragraph [ref=e12]: MAHASISWA Test
            - paragraph [ref=e13]: Mahasiswa
      - navigation [ref=e14]:
        - link "Dashboard" [ref=e15] [cursor=pointer]:
          - /url: /mahasiswa/dashboard
          - generic [ref=e16]: Dashboard
        - link "Profil Saya" [ref=e17] [cursor=pointer]:
          - /url: /mahasiswa/profil
          - generic [ref=e18]: Profil Saya
        - link "Cari Beasiswa" [ref=e19] [cursor=pointer]:
          - /url: /mahasiswa/cari
          - generic [ref=e20]: Cari Beasiswa
        - link "Status Pendaftaran" [ref=e21] [cursor=pointer]:
          - /url: /mahasiswa/pendaftaran
          - generic [ref=e22]: Status Pendaftaran
        - link "Tutorial Administrasi" [ref=e23] [cursor=pointer]:
          - /url: /tutorial-administrasi
          - generic [ref=e24]: Tutorial Administrasi
        - link "Beasiswa Favorit" [active] [ref=e25] [cursor=pointer]:
          - /url: /mahasiswa/favorit
          - generic [ref=e26]: Beasiswa Favorit
      - generic [ref=e27]:
        - button "Keluar" [ref=e28] [cursor=pointer]:
          - img [ref=e29]
          - text: Keluar
        - paragraph [ref=e31]: v1.0.0 · BantuBeasiswa
    - generic [ref=e32]:
      - banner [ref=e33]:
        - generic [ref=e35]:
          - img [ref=e36]
          - textbox "Cari kata kunci beasiswa..." [ref=e38]
        - generic [ref=e39]:
          - button "Toggle kontras" [ref=e40]:
            - generic [ref=e41]: ◑
            - generic [ref=e42]: Kontras
          - generic [ref=e43]:
            - button "Perkecil ukuran font" [ref=e44]: −
            - button "Perbesar ukuran font" [ref=e46]: +
          - button "Notifikasi" [ref=e48]:
            - img [ref=e49]
          - generic [ref=e51]:
            - generic [ref=e52]: MT
            - generic [ref=e53]:
              - paragraph [ref=e54]: MAHASISWA Test
              - paragraph [ref=e55]: Mahasiswa
      - main [ref=e56]:
        - generic [ref=e57]:
          - heading "Cari Beasiswa" [level=1] [ref=e60]
          - paragraph [ref=e61]: Temukan beasiswa yang sesuai dengan profil dan domisili Anda
        - generic [ref=e62]:
          - generic [ref=e63]:
            - img [ref=e64]
            - textbox "Cari nama beasiswa..." [ref=e66]
          - combobox [ref=e67]:
            - option "Semua Provinsi" [selected]
            - option "DKI Jakarta"
          - combobox [disabled] [ref=e68]:
            - option "— Pilih Provinsi dahulu —" [selected]
        - paragraph [ref=e69]: Menampilkan 1 peluang
        - generic [ref=e73]:
          - generic [ref=e74]:
            - heading "Beasiswa Indonesia Pintar" [level=2] [ref=e75]
            - generic [ref=e77]: 205 hari lagi
          - paragraph [ref=e79]: Lembaga Pendidikan Nasional
          - paragraph [ref=e80]: Program bantuan biaya pendidikan penuh bagi putra-putri terbaik bangsa.
          - generic [ref=e81]:
            - generic [ref=e82]:
              - paragraph [ref=e83]: Jalur
              - paragraph [ref=e84]: Reguler
            - generic [ref=e85]:
              - paragraph [ref=e86]: Deadline
              - paragraph [ref=e87]: 1 Januari 2027
          - link "Lihat Detail →" [ref=e89] [cursor=pointer]:
            - /url: /beasiswa/101
  - button "Open Next.js Dev Tools" [ref=e95] [cursor=pointer]:
    - img [ref=e96]
  - alert [ref=e99]
```

# Test source

```ts
  161 |         await route.fulfill({
  162 |           status: 201,
  163 |           contentType: 'application/json',
  164 |           body: JSON.stringify([{ id: 1, user_id: 1, beasiswa_id: 101 }])
  165 |         });
  166 |       } else if (method === 'DELETE') {
  167 |         deleteCount++;
  168 |         isBookmarked = false;
  169 |         await route.fulfill({
  170 |           status: 200,
  171 |           contentType: 'application/json',
  172 |           body: JSON.stringify({})
  173 |         });
  174 |       }
  175 |     });
  176 | 
  177 |     // 2. Buka Halaman Cari Beasiswa Mahasiswa
  178 |     await page.goto('/mahasiswa/cari');
  179 | 
  180 |     // 3. Pastikan tombol tampil sebagai outline "Simpan Ke Favorit"
  181 |     const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
  182 |     await expect(bookmarkButton).toBeVisible();
  183 | 
  184 |     // 4. Klik bookmark. Optimistic update langsung merubah visual menjadi solid "Hapus dari Favorit"
  185 |     await bookmarkButton.click();
  186 |     await expect(page.locator('button[title="Hapus dari Favorit"]').first()).toBeVisible();
  187 | 
  188 |     // Pastikan API POST dipanggil sekali (poll: panggilan jaringan async setelah optimistic update)
  189 |     await expect.poll(() => postCount).toBe(1);
  190 | 
  191 |     // 5. Klik sekali lagi (untuk unbookmark)
  192 |     await page.locator('button[title="Hapus dari Favorit"]').first().click();
  193 |     await expect(page.locator('button[title="Simpan Ke Favorit"]').first()).toBeVisible();
  194 | 
  195 |     // Pastikan API DELETE dipanggil sekali (poll untuk menunggu request DELETE tiba)
  196 |     await expect.poll(() => deleteCount).toBe(1);
  197 |   });
  198 | 
  199 |   test('TC-05: Hapus dari Daftar Favorit di Halaman Favorit', async ({ page, context }) => {
  200 |     // 1. Login sebagai mahasiswa
  201 |     await loginAs(context, 'mahasiswa');
  202 | 
  203 |     // Mock Next.js data transfer untuk transisi client-side
  204 |     const pageDataPayload = {
  205 |       pageProps: {
  206 |         user: { userId: 1, role: 'mahasiswa', nama: 'MAHASISWA Test', accountId: 123 },
  207 |         initialBeasiswas: [
  208 |           {
  209 |             beasiswaId: 101,
  210 |             judul: 'Beasiswa Indonesia Pintar',
  211 |             deskripsi: 'Program bantuan biaya pendidikan penuh bagi putra-putri terbaik bangsa.',
  212 |             deadline: '2026-12-31T23:59:59Z',
  213 |             status: 'aktif',
  214 |             pendonor: { statusOrganisasi: 'Lembaga Pendidikan Nasional' },
  215 |             beasiswa_wilayah: []
  216 |           }
  217 |         ]
  218 |       },
  219 |       __N_SSP: true
  220 |     };
  221 | 
  222 |     await page.route('**/_next/data/**/mahasiswa/favorit.json*', async (route) => {
  223 |       await route.fulfill({
  224 |         status: 200,
  225 |         contentType: 'application/json',
  226 |         body: JSON.stringify(pageDataPayload)
  227 |       });
  228 |     });
  229 | 
  230 |     await page.route('**/_next/data/**/mahasiswa/beasiswa-favorit.json*', async (route) => {
  231 |       await route.fulfill({
  232 |         status: 200,
  233 |         contentType: 'application/json',
  234 |         body: JSON.stringify(pageDataPayload)
  235 |       });
  236 |     });
  237 | 
  238 |     // Mock DELETE REST call
  239 |     await page.route('**/rest/v1/favorit*', async (route) => {
  240 |       const method = route.request().method();
  241 |       if (method === 'DELETE') {
  242 |         await route.fulfill({
  243 |           status: 200,
  244 |           contentType: 'application/json',
  245 |           body: JSON.stringify({})
  246 |         });
  247 |       }
  248 |     });
  249 | 
  250 |     // 2. Masuk ke halaman Cari Beasiswa terlebih dahulu (agar bisa transisi client-side ke Favorit)
  251 |     await page.goto('/mahasiswa/cari');
  252 | 
  253 |     // 3. Klik menu Beasiswa Favorit di sidebar
  254 |     await page.click('a:has-text("Beasiswa Favorit")');
  255 | 
  256 |     // 4. Pastikan kartu beasiswa favorit ter-render
  257 |     await expect(page.locator('text=Beasiswa Indonesia Pintar')).toBeVisible();
  258 | 
  259 |     // 5. Klik tombol Hapus dari Favorit (Solid Icon)
  260 |     const removeButton = page.locator('button[title="Hapus dari Favorit"]').first();
> 261 |     await removeButton.click();
      |                        ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  262 | 
  263 |     // Konfirmasi SweetAlert2 popup
  264 |     let swalPopup = page.locator('.swal2-popup');
  265 |     await expect(swalPopup).toBeVisible();
  266 |     await expect(swalPopup.locator('.swal2-title')).toContainText('Hapus dari Favorit?');
  267 | 
  268 |     // Test Cancel Flow: klik Batal
  269 |     await swalPopup.locator('button:has-text("Batal")').click();
  270 |     await expect(swalPopup).not.toBeVisible();
  271 |     await expect(page.locator('text=Beasiswa Indonesia Pintar')).toBeVisible();
  272 | 
  273 |     // Klik tombol Hapus dari Favorit lagi untuk benar-benar menghapus
  274 |     await removeButton.click();
  275 |     swalPopup = page.locator('.swal2-popup');
  276 |     await expect(swalPopup).toBeVisible();
  277 | 
  278 |     // Click confirm button
  279 |     await swalPopup.locator('button:has-text("Ya, Hapus")').click();
  280 | 
  281 |     // Tunggu success SweetAlert2 popup dan klik OK
  282 |     const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
  283 |     await expect(successSwal).toBeVisible();
  284 |     await successSwal.locator('button:has-text("OK")').click();
  285 | 
  286 |     // 6. Kartu beasiswa hilang dari daftar favorit
  287 |     await expect(page.locator('text=Beasiswa Indonesia Pintar')).not.toBeVisible();
  288 |   });
  289 | 
  290 |   test('TC-06: Validasi Unique Bookmark (Constraint Handling)', async ({ page, context }) => {
  291 |     // 1. Login sebagai mahasiswa
  292 |     await loginAs(context, 'mahasiswa');
  293 | 
  294 |     let postAttempts = 0;
  295 | 
  296 |     // Mock REST API favorit: GET returns empty, POST returns 409 Conflict/Error (constraint violation)
  297 |     await page.route('**/rest/v1/favorit*', async (route) => {
  298 |       const method = route.request().method();
  299 |       if (method === 'GET') {
  300 |         await route.fulfill({
  301 |           status: 200,
  302 |           contentType: 'application/json',
  303 |           body: JSON.stringify([])
  304 |         });
  305 |       } else if (method === 'POST') {
  306 |         postAttempts++;
  307 |         // Mengembalikan error kode 23505 (unique_violation)
  308 |         await route.fulfill({
  309 |           status: 409,
  310 |           contentType: 'application/json',
  311 |           body: JSON.stringify({
  312 |             code: '23505',
  313 |             message: 'duplicate key value violates unique constraint "favorit_user_id_beasiswa_id_key"'
  314 |           })
  315 |         });
  316 |       }
  317 |     });
  318 | 
  319 |     // 2. Buka Halaman Cari Beasiswa Mahasiswa
  320 |     await page.goto('/mahasiswa/cari');
  321 | 
  322 |     // 3. Pastikan tombol tampil sebagai outline "Simpan Ke Favorit"
  323 |     const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
  324 |     await expect(bookmarkButton).toBeVisible();
  325 | 
  326 |     // 4. Klik bookmark. UI akan melakukan optimistic update ke status solid ("Hapus dari Favorit")
  327 |     await bookmarkButton.click();
  328 | 
  329 |     // 5. Karena API POST mengembalikan error status 409, UI harus menangkap error dan mengembalikan (revert) tombol ke status outline ("Simpan Ke Favorit")
  330 |     await expect(page.locator('button[title="Simpan Ke Favorit"]').first()).toBeVisible();
  331 | 
  332 |     // Pastikan request POST telah terkirim sekali
  333 |     expect(postAttempts).toBe(1);
  334 |   });
  335 | });
  336 | 
```