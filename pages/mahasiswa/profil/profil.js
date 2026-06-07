// Redirect permanen ke route baru /mahasiswa/profil
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/mahasiswa/profil',
      permanent: true,
    },
  };
}

export default function OldProfilRedirect() {
  return null;
}
