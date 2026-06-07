/**
 * Halaman /mahasiswa/tutorial
 * Melakukan pengalihan (redirect) secara otomatis ke /tutorial-administrasi
 * untuk konsistensi alur navigasi aplikasi.
 */
export async function getServerSideProps(context) {
  return {
    redirect: {
      destination: '/tutorial-administrasi',
      permanent: false,
    },
  };
}

export default function MahasiswaTutorialRedirect() {
  return null;
}
