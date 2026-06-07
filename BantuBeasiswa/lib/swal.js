import Swal from 'sweetalert2';

const isClient = typeof window !== 'undefined';

/**
 * Helper to show custom styled SweetAlert2 popups
 */
export const showAlert = (options) => {
  if (!isClient) return Promise.resolve({});

  const isDanger = options.isDanger || false;

  const confirmBtnClass = isDanger
    ? 'px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all mx-1.5 cursor-pointer outline-none border-none'
    : 'px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all mx-1.5 cursor-pointer outline-none border-none';

  const cancelBtnClass = 'px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-xl text-sm font-bold transition-all mx-1.5 cursor-pointer outline-none border-none';

  return Swal.fire({
    customClass: {
      popup: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-xl font-sans',
      title: 'text-lg font-extrabold text-slate-800 mb-2',
      htmlContainer: 'text-sm text-slate-600 leading-relaxed mb-4',
      confirmButton: confirmBtnClass,
      cancelButton: cancelBtnClass,
      ...options.customClass
    },
    buttonsStyling: false,
    ...options
  });
};

export const showSuccess = (title, text) => {
  return showAlert({
    icon: 'success',
    title,
    text,
  });
};

export const showError = (title, text) => {
  return showAlert({
    icon: 'error',
    title,
    text,
  });
};

export const showWarning = (title, text) => {
  return showAlert({
    icon: 'warning',
    title,
    text,
  });
};

export const showConfirm = (title, text, confirmButtonText = 'Ya', cancelButtonText = 'Batal', isDanger = false) => {
  return showAlert({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    isDanger
  });
};
