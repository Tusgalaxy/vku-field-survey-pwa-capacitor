if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker đã đăng ký thành công:', reg.scope))
      .catch(err => console.error('Lỗi đăng ký Service Worker:', err));
  });
}