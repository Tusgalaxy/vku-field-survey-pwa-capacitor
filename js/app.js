// Thay thế URL bằng Link Web App từ Google Apps Script của bạn
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyWHKkB-MvWQL1SswlYN7RF0oZYXixtb_BhUs-Udyol3uVf1R97iLq6Z5eWWkFnGLZU/exec";

document.addEventListener('DOMContentLoaded', () => {
  const surveyForm = document.getElementById('survey-form');
  const surveyList = document.getElementById('survey-list');
  const networkStatus = document.getElementById('network-status');
  const surveyDateInput = document.getElementById('survey-date');
  const syncBtn = document.getElementById('sync-btn');
  const pendingCount = document.getElementById('pending-count');

  // Khởi tạo thời gian mặc định
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  surveyDateInput.value = now.toISOString().slice(0, 16);

  // Cập nhật trạng thái mạng Online/Offline & Kích hoạt Auto-Sync
  function updateOnlineStatus() {
    if (navigator.onLine) {
      networkStatus.textContent = 'Online';
      networkStatus.className = 'px-2.5 py-1 text-[11px] rounded-full bg-green-500 font-semibold text-white shadow';
      
      // AUTO-SYNC: Tự động đồng bộ ngay khi phát hiện có mạng trở lại
      syncToGoogleSheets(true);
    } else {
      networkStatus.textContent = 'Offline';
      networkStatus.className = 'px-2.5 py-1 text-[11px] rounded-full bg-red-500 font-semibold text-white shadow';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Lấy vị trí GPS thực tế
  function getCurrentLocation() {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: null, lng: null }),
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        resolve({ lat: null, lng: null });
      }
    });
  }

  // Hàm đồng bộ dữ liệu (Hỗ trợ cả Thủ công và Auto-Sync)
  async function syncToGoogleSheets(isAuto = false) {
    if (!navigator.onLine) {
      if (!isAuto) alert("Không có mạng! Vui lòng kết nối Internet để đồng bộ.");
      return;
    }

    const unsyncedList = await getUnsyncedSurveys();
    if (unsyncedList.length === 0) {
      if (!isAuto) alert("Tất cả báo cáo đã được đồng bộ lên Google Sheets.");
      return;
    }

    syncBtn.disabled = true;
    syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i><span>Đang đồng bộ...</span>`;

    let successCount = 0;
    for (const item of unsyncedList) {
      try {
        await fetch(GOOGLE_SHEET_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        await markAsSynced(item.id);
        successCount++;
      } catch (err) {
        console.error("Lỗi khi đồng bộ tự động ID:", item.id, err);
      }
    }

    syncBtn.disabled = false;
    syncBtn.innerHTML = `<i class="fa-solid fa-rotate me-1"></i><span>Đồng Bộ Ngay</span>`;
    renderSurveyList();

    if (!isAuto) {
      alert(`Đã đồng bộ thành công ${successCount}/${unsyncedList.length} báo cáo lên Google Sheets!`);
    }
  }

  syncBtn.addEventListener('click', () => syncToGoogleSheets(false));

  // Render danh sách bản ghi
  async function renderSurveyList() {
    const surveys = await getAllSurveys();
    const unsynced = surveys.filter(s => s.synced === 0);
    pendingCount.textContent = `${unsynced.length} báo cáo chờ đồng bộ`;

    if (surveys.length === 0) {
      surveyList.innerHTML = '<p class="text-center italic text-xs text-gray-400 py-3">Chưa có dữ liệu khảo sát.</p>';
      return;
    }

    surveyList.innerHTML = surveys.map(item => `
      <div class="border rounded-xl p-3 bg-gray-50 space-y-2 text-xs shadow-sm">
        <div class="flex justify-between items-start border-b pb-1.5">
          <div>
            <span class="font-bold text-blue-900 block text-sm">${item.building}</span>
            <span class="text-gray-500 font-medium">${item.location}</span>
          </div>
          <span class="px-2 py-0.5 font-bold rounded-md ${
            item.status === 'Đạt chuẩn' ? 'bg-green-100 text-green-700' :
            item.status === 'Cần xử lý' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }">${item.status}</span>
        </div>

        ${item.photo ? `<img src="${item.photo}" class="w-full h-32 object-cover rounded-lg border" />` : ''}

        <div class="grid grid-cols-2 gap-1 text-[11px] bg-white p-2 rounded-lg border text-gray-600">
          <p><b>TB Phòng:</b> ${item.classroomEq}</p>
          <p><b>Wi-Fi:</b> ${item.internetStatus}</p>
          <p><b>Toilet:</b> ${item.toiletStatus}</p>
          <p><b>Vệ sinh:</b> ${item.hygieneStatus}</p>
        </div>

        <div class="text-gray-600 space-y-0.5">
          <p><i class="fa-regular fa-clock text-blue-500 me-1"></i><b>Ngày KS:</b> ${new Date(item.surveyDate).toLocaleString('vi-VN')}</p>
          <p><i class="fa-regular fa-comment text-blue-500 me-1"></i><b>Ghi chú:</b> ${item.notes || 'Không có'}</p>
        </div>

        <div class="flex justify-between items-center border-t pt-2 mt-1 text-[10px]">
          <span class="${item.synced ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}">
            ${item.synced ? '<i class="fa-solid fa-cloud-check me-1"></i>Đã đẩy Sheet' : '<i class="fa-solid fa-cloud-arrow-up me-1"></i>Chờ đồng bộ'}
          </span>
          <button onclick="handleDelete(${item.id})" class="text-red-500 font-semibold hover:underline">Xóa</button>
        </div>
      </div>
    `).join('');
  }

  window.handleDelete = async (id) => {
    if (confirm('Xóa báo cáo này khỏi bộ nhớ máy?')) {
      await deleteSurvey(id);
      renderSurveyList();
    }
  };

  // Submit Form Khảo Sát
  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const photoFile = document.getElementById('photo').files[0];
    const coords = await getCurrentLocation();

    let compressedBase64 = null;
    if (photoFile) {
      compressedBase64 = await compressImage(photoFile);
    }

    const surveyData = {
      surveyDate: surveyDateInput.value,
      building: document.getElementById('building').value,
      location: document.getElementById('location').value,
      classroomEq: document.querySelector('input[name="classroom-eq"]:checked').value,
      internetStatus: document.querySelector('input[name="internet-status"]:checked').value,
      toiletStatus: document.querySelector('input[name="toilet-status"]:checked').value,
      hygieneStatus: document.querySelector('input[name="hygiene-status"]:checked').value,
      status: document.querySelector('input[name="status"]:checked').value,
      notes: document.getElementById('notes').value,
      photo: compressedBase64,
      latitude: coords.lat,
      longitude: coords.lng
    };

    await saveSurvey(surveyData);
    surveyForm.reset();
    
    // Đặt lại thời gian
    const resetDate = new Date();
    resetDate.setMinutes(resetDate.getMinutes() - resetDate.getTimezoneOffset());
    surveyDateInput.value = resetDate.toISOString().slice(0, 16);

    renderSurveyList();

    // AUTO-SYNC: Nếu đang có mạng, tự gửi luôn bản ghi vừa tạo
    if (navigator.onLine) {
      syncToGoogleSheets(true);
    }
  });

  // Kiểm tra mạng ban đầu
  updateOnlineStatus();
  renderSurveyList();
});