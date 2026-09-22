// Thay thế URL bằng Link Web App từ Google Apps Script của bạn
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbx75eRKYuOKV5ET8grQoQCcEFj9Rowg6GsyN85z7ITR0iyPMtjfhTGr-4-jgM24T_XN/exec";

// Import các module Capacitor Native Plugins
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { LocalNotifications } from '@capacitor/local-notifications';

document.addEventListener('DOMContentLoaded', () => {
  const surveyForm = document.getElementById('survey-form');
  const surveyList = document.getElementById('survey-list');
  const networkStatus = document.getElementById('network-status');
  const surveyDateInput = document.getElementById('survey-date');
  const syncBtn = document.getElementById('sync-btn');
  const pendingCount = document.getElementById('pending-count');

  let nativePhotoBase64 = null;

  // 1. Khởi tạo thời gian mặc định
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  if (surveyDateInput) surveyDateInput.value = now.toISOString().slice(0, 16);

  // 2. Theo dõi kết nối Mạng Native
  async function initNetworkMonitoring() {
    try {
      const status = await Network.getStatus();
      updateOnlineUI(status.connected);

      Network.addListener('networkStatusChange', (status) => {
        updateOnlineUI(status.connected);
        if (status.connected) {
          console.log("Đã phát hiện có mạng trở lại! Tiến hành Auto-Sync...");
          syncToGoogleSheets(true);
        }
      });
    } catch (err) {
      console.warn("Lỗi kiểm tra Network Native, dùng window events fallback:", err);
      updateOnlineUI(navigator.onLine);
      window.addEventListener('online', () => { updateOnlineUI(true); syncToGoogleSheets(true); });
      window.addEventListener('offline', () => updateOnlineUI(false));
    }
  }

  function updateOnlineUI(isOnline) {
    if (!networkStatus) return;
    if (isOnline) {
      networkStatus.textContent = 'Online';
      networkStatus.className = 'px-2.5 py-1 text-[11px] rounded-full bg-green-500 font-semibold text-white shadow';
    } else {
      networkStatus.textContent = 'Offline';
      networkStatus.className = 'px-2.5 py-1 text-[11px] rounded-full bg-red-500 font-semibold text-white shadow';
    }
  }

  // 3. Lấy vị trí GPS Native
  async function getCurrentLocationNative() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (error) {
      console.warn("Không lấy được vị trí GPS Native, dùng tọa độ rỗng:", error);
      return { lat: null, lng: null };
    }
  }

  // 4. Chụp ảnh & Tự động lưu vào Gallery
  const nativeCameraBtn = document.getElementById('native-camera-btn');
  if (nativeCameraBtn) {
    nativeCameraBtn.addEventListener('click', async () => {
      try {
        const permStatus = await Camera.requestPermissions();
        if (permStatus.camera === 'denied' || permStatus.photos === 'denied') {
          alert("Vui lòng cho phép quyền Camera và Bộ nhớ để chụp và lưu ảnh!");
          return;
        }

        const image = await Camera.getPhoto({
          quality: 50, // Giảm bớt dung lượng ảnh xuống 50% để tránh nghẽn luồng WebView khi upload
          width: 800,  // Scale chiều rộng tối đa 800px để tối ưu gửi qua mạng
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          saveToGallery: true
        });

        nativePhotoBase64 = `data:image/jpeg;base64,${image.base64String}`;
        
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview) {
          photoPreview.src = nativePhotoBase64;
          photoPreview.classList.remove('hidden');
        }
        alert("Đã chụp và lưu ảnh thành công vào Bộ sưu tập thiết bị!");
      } catch (error) {
        console.log("Hủy chụp hoặc lỗi Camera:", error);
      }
    });
  }

  // 5. Gửi thông báo Push Notification
  async function sendSyncNotification(count) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "VKU Field Survey Native",
              body: `Đã tự động đồng bộ thành công ${count} báo cáo lên Google Sheets!`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 500) }
            }
          ]
        });
      }
    } catch (err) {
      console.error("Lỗi gửi Local Notification:", err);
    }
  }

  // 6. ĐÃ ĐƯỢC TỐI ƯU: Hàm đồng bộ dữ liệu lên Google Sheets (Thêm Timeout & Tối ưu Payload)
  async function syncToGoogleSheets(isAuto = false) {
    let isOnline = true;
    try {
      const status = await Network.getStatus();
      isOnline = status.connected;
    } catch (e) {
      isOnline = navigator.onLine;
    }

    if (!isOnline) {
      if (!isAuto) alert("Không có mạng! Vui lòng kết nối Internet để đồng bộ.");
      return;
    }

    const unsyncedList = await getUnsyncedSurveys();
    if (!unsyncedList || unsyncedList.length === 0) {
      if (!isAuto) alert("Tất cả báo cáo đã được đồng bộ lên Google Sheets.");
      return;
    }

    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i><span>Đang đồng bộ...</span>`;
    }

    let successCount = 0;

    for (const item of unsyncedList) {
      try {
        // Tọa AbortController để tự động hủy Request sau 12 giây tránh treo ứng dụng
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        // Gửi bằng Content-Type text/plain (được Google Apps Script hỗ trợ chuẩn nhất mà không bị CORS/CORS Preflight chặn)
        await fetch(GOOGLE_SHEET_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(item),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Đánh dấu bản ghi đã đồng bộ trong IndexedDB/Storage
        await markAsSynced(item.id);
        successCount++;
      } catch (err) {
        console.error("Lỗi/Timeout khi đồng bộ bản ghi ID:", item.id, err);
      }
    }

    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `<i class="fa-solid fa-rotate me-1"></i><span>Đồng Bộ Ngay</span>`;
    }

    renderSurveyList();

    if (successCount > 0) {
      sendSyncNotification(successCount);
      if (!isAuto) alert(`Đã đồng bộ thành công ${successCount}/${unsyncedList.length} báo cáo lên Google Sheets!`);
    } else if (!isAuto) {
      alert("Đồng bộ thất bại hoặc hết thời gian phản hồi từ Google Sheets!");
    }
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', () => syncToGoogleSheets(false));
  }

  // 7. Render danh sách bản ghi khảo sát
  async function renderSurveyList() {
    const surveys = await getAllSurveys();
    const unsynced = surveys ? surveys.filter(s => s.synced === 0) : [];
    if (pendingCount) pendingCount.textContent = `${unsynced.length} báo cáo chờ đồng bộ`;

    if (!surveys || surveys.length === 0) {
      if (surveyList) surveyList.innerHTML = '<p class="text-center italic text-xs text-gray-400 py-3">Chưa có dữ liệu khảo sát.</p>';
      return;
    }

    if (surveyList) {
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
            ${item.latitude ? `<p><i class="fa-solid fa-location-dot text-red-500 me-1"></i><b>GPS:</b> ${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}</p>` : ''}
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
  }

  window.handleDelete = async (id) => {
    if (confirm('Xóa báo cáo này khỏi bộ nhớ máy?')) {
      await deleteSurvey(id);
      renderSurveyList();
    }
  };

  // 8. Submit Form Khảo Sát
  if (surveyForm) {
    surveyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const coords = await getCurrentLocationNative();

      let finalPhotoBase64 = nativePhotoBase64;
      const photoFileInput = document.getElementById('photo');
      if (!finalPhotoBase64 && photoFileInput && photoFileInput.files[0]) {
        if (typeof compressImage === 'function') {
          finalPhotoBase64 = await compressImage(photoFileInput.files[0]);
        }
      }

      const surveyData = {
        surveyDate: surveyDateInput ? surveyDateInput.value : new Date().toISOString(),
        building: document.getElementById('building')?.value || '',
        location: document.getElementById('location')?.value || '',
        classroomEq: document.querySelector('input[name="classroom-eq"]:checked')?.value || 'Bình thường',
        internetStatus: document.querySelector('input[name="internet-status"]:checked')?.value || 'Bình thường',
        toiletStatus: document.querySelector('input[name="toilet-status"]:checked')?.value || 'Bình thường',
        hygieneStatus: document.querySelector('input[name="hygiene-status"]:checked')?.value || 'Bình thường',
        status: document.querySelector('input[name="status"]:checked')?.value || 'Đạt chuẩn',
        notes: document.getElementById('notes')?.value || '',
        photo: finalPhotoBase64 || '',
        latitude: coords.lat,
        longitude: coords.lng
      };

      await saveSurvey(surveyData);
      
      surveyForm.reset();
      nativePhotoBase64 = null;
      const photoPreview = document.getElementById('photo-preview');
      if (photoPreview) photoPreview.classList.add('hidden');

      const resetDate = new Date();
      resetDate.setMinutes(resetDate.getMinutes() - resetDate.getTimezoneOffset());
      if (surveyDateInput) surveyDateInput.value = resetDate.toISOString().slice(0, 16);

      renderSurveyList();

      // AUTO-SYNC bất đồng bộ
      syncToGoogleSheets(true);
    });
  }

  // Khởi chạy hệ thống
  initNetworkMonitoring();
  renderSurveyList();
});