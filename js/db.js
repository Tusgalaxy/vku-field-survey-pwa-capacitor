const db = new Dexie("VKUSurveyDB_Capacitor");

db.version(2).stores({
  surveys: '++id, surveyDate, building, location, status, createdAt, synced'
});

// Hàm nén ảnh phía Client
function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Lưu bản ghi mới
async function saveSurvey(surveyData) {
  try {
    const id = await db.surveys.add({
      surveyDate: surveyData.surveyDate,
      building: surveyData.building,
      location: surveyData.location,
      classroomEq: surveyData.classroomEq,
      internetStatus: surveyData.internetStatus,
      toiletStatus: surveyData.toiletStatus,
      hygieneStatus: surveyData.hygieneStatus,
      status: surveyData.status,
      notes: surveyData.notes,
      photo: surveyData.photo,
      latitude: surveyData.latitude || null,
      longitude: surveyData.longitude || null,
      createdAt: new Date().toISOString(),
      synced: 0
    });
    return id;
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu IndexedDB:", error);
    throw error;
  }
}

async function getAllSurveys() {
  return await db.surveys.orderBy('createdAt').reverse().toArray();
}

async function getUnsyncedSurveys() {
  return await db.surveys.where('synced').equals(0).toArray();
}

async function markAsSynced(id) {
  await db.surveys.update(id, { synced: 1 });
}

async function deleteSurvey(id) {
  await db.surveys.delete(id);
}