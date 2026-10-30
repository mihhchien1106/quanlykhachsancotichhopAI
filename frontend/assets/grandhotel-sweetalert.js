/* SweetAlert2 integration — safe asynchronous confirmations, no changes to data flow. */
(function () {
  'use strict';
  const originalAlert = window.alert.bind(window);
  const originalConfirm = window.confirm.bind(window);
  const notify = (message) => {
    if (!window.Swal) return originalAlert(String(message ?? ''));
    const text = String(message ?? '');
    const error = /lỗi|không thể|thất bại|không hợp lệ|chưa|vui lòng|đã tồn tại/i.test(text);
    return window.Swal.fire({
      title: error ? 'Thông báo' : 'Grand Hotel', text,
      icon: error ? 'warning' : 'success',
      confirmButtonText: 'Đã hiểu',
      confirmButtonColor: '#1b3554',
      customClass: {popup: 'gh-swal-popup'}, heightAuto: false
    });
  };
  window.ghSweetConfirm = async function (message) {
    if (!window.Swal) return originalConfirm(String(message ?? ''));
    const result = await window.Swal.fire({
      title: 'Xác nhận thao tác', text: String(message ?? ''), icon: 'question',
      showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy',
      confirmButtonColor: '#1b3554', cancelButtonColor: '#8e9aab',
      reverseButtons: true, focusCancel: true, heightAuto: false,
      customClass: {popup: 'gh-swal-popup'}
    });
    return !!result.isConfirmed;
  };
  window.ghSweetNotify = notify;
  window.alert = notify;
})();
