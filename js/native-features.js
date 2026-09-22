import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { LocalNotifications } from '@capacitor/local-notifications';

// 1. Chụp ảnh & Tự động lưu vào Thư viện (Gallery)
export async function takeAndSavePhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      saveToGallery: true // Lưu trực tiếp vào bộ sưu tập ảnh
    });
    return `data:image/jpeg;base64,${image.base64String}`;
  } catch (error) {
    console.warn('Người dùng hủy chụp ảnh hoặc có lỗi:', error);
    return null;
  }
}

// 2. Lấy tọa độ GPS Native
export async function getNativeGPS() {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  } catch (error) {
    console.error('Lỗi lấy GPS Native:', error);
    return null;
  }
}

// 3. Lắng nghe Mạng để kích hoạt Auto-Sync
export function initNetworkListener(onOnlineCallback) {
  Network.addListener('networkStatusChange', status => {
    if (status.connected) {
      console.log('Đã kết nối lại Mạng!');
      if (typeof onOnlineCallback === 'function') onOnlineCallback();
    }
  });
}

// 4. Bắn Thông báo Local Notification khi Sync xong
export async function triggerSyncNotification(count) {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "VKU Survey - Đồng Bộ Hoàn Tất",
            body: `Đã tự động đẩy thành công ${count} bản ghi lên Google Sheets!`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 500) }
          }
        ]
      });
    }
  } catch (error) {
    console.error('Lỗi gửi Notification:', error);
  }
}