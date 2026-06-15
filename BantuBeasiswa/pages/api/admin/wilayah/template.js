export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // CSV header
  const header = ['provinsi', 'nama', 'tipe', 'mode', 'isAfirmasi', 'is3T', 'jenis_3t'];

  // Data lengkap 62 wilayah 3T (dengan proper CSV encoding untuk nama yang punya koma)
  const data = [
    // ── SUMATERA UTARA
    ['Sumatera Utara', 'Kab. Nias Sumatera Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Sumatera Utara', 'Kab. Nias Selatan Sumatera Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Sumatera Utara', 'Kab. Nias Utara Sumatera Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Sumatera Utara', 'Kab. Nias Barat Sumatera Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],

    // ── SUMATERA BARAT
    ['Sumatera Barat', 'Kab. Kepulauan Mentawai Sumatera Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],

    // ── SUMATERA SELATAN
    ['Sumatera Selatan', 'Kab. Musi Rawas Utara Sumatera Selatan', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── LAMPUNG
    ['Lampung', 'Kab. Pesisir Barat Lampung', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── NUSA TENGGARA BARAT
    ['Nusa Tenggara Barat', 'Kab. Lombok Utara NTB', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── NUSA TENGGARA TIMUR
    ['Nusa Tenggara Timur', 'Kab. Sumba Barat NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Sumba Timur NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Kupang NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Timor Tengah Selatan NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Belu NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Nusa Tenggara Timur', 'Kab. Alor NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Nusa Tenggara Timur', 'Kab. Lembata NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Nusa Tenggara Timur', 'Kab. Rote Ndao NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Nusa Tenggara Timur', 'Kab. Sumba Tengah NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Sumba Barat Daya NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Manggarai Timur NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Nusa Tenggara Timur', 'Kab. Sabu Raijua NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Nusa Tenggara Timur', 'Kab. Malaka NTT', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],

    // ── SULAWESI TENGAH
    ['Sulawesi Tengah', 'Kab. Donggala Sulawesi Tengah', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Sulawesi Tengah', 'Kab. Tojo Una-Una Sulawesi Tengah', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Sulawesi Tengah', 'Kab. Sigi Sulawesi Tengah', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── MALUKU
    ['Maluku', 'Kab. Maluku Tenggara Barat Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Maluku', 'Kab. Kepulauan Aru Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Maluku', 'Kab. Seram Bagian Barat Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Maluku', 'Kab. Seram Bagian Timur Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Maluku', 'Kab. Maluku Barat Daya Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Maluku', 'Kab. Buru Selatan Maluku', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── MALUKU UTARA
    ['Maluku Utara', 'Kab. Kepulauan Sula Maluku Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Maluku Utara', 'Kab. Pulau Taliabu Maluku Utara', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── PAPUA BARAT
    ['Papua Barat', 'Kab. Teluk Wondama Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua Barat', 'Kab. Teluk Bintuni Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua Barat', 'Kab. Sorong Selatan Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua Barat', 'Kab. Sorong Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Papua Barat', 'Kab. Tambrauw Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Papua Barat', 'Kab. Maybrat Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua Barat', 'Kab. Manokwari Selatan Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua Barat', 'Kab. Pegunungan Arfak Papua Barat', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],

    // ── PAPUA
    ['Papua', 'Kab. Jayawijaya Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Nabire Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Paniai Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Puncak Jaya Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Boven Digoel Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Papua', 'Kab. Mappi Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Asmat Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Yahukimo Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Pegunungan Bintang Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Papua', 'Kab. Tolikara Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Keerom Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terdepan'],
    ['Papua', 'Kab. Waropen Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Supiori Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Terluar'],
    ['Papua', 'Kab. Mamberamo Raya Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Nduga Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Lanny Jaya Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Mamberamo Tengah Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Yalimo Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Puncak Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Dogiyai Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Intan Jaya Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
    ['Papua', 'Kab. Deiyai Papua', 'kabupaten', '3T', 'FALSE', 'TRUE', 'Tertinggal'],
  ];

  // Build CSV with proper escaping - quote fields that might contain commas
  const csvLines = [
    header.join(','),
    ...data.map(row =>
      row.map(field =>
        // Quote fields that contain commas, quotes, or newlines
        (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n')))
          ? `"${field.replace(/"/g, '""')}"`
          : field
      ).join(',')
    )
  ];
  const csv = csvLines.join('\n');

  // Set response headers for CSV download
  res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
  res.setHeader('Content-Disposition', 'attachment;filename=wilayah_3t_data.csv');

  return res.status(200).send(csv);
}
