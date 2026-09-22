# MINI-PROJECT SHORT TECHNICAL REPORT
**Course:** Cross-Platform Mobile App Development (VKU)
**Mini-Project Title:** VKU Field Survey Mobile App (PWA + Capacitor)
**Team / Student Name:** [Nhóm 1 / Sinh viên thực hiện]
**Submission Date:** 22/09/2026

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS
* **Team Members:**
  1. [Lê Anh Tú] — Student ID: [23IT.B238] — Role: Full stack — Contribution: [100%]
* **🔗 Live Demo URL:** Local demo on Android emulator/device via Capacitor; project can be run with `npm run sync` followed by Android Studio or `npx cap open android`.
* **💻 GitHub Repository:** [https://github.com/your-username/vku-field-survey-capacitor]

---

## 2. FEATURE IMPLEMENTATION CHECKLIST
| # | Required Feature | Status | Implementation Details & Acceptance Level |
|:---:|---|:---:|---|
| 1 | Responsive Mobile Viewport | ✅ Complete | The app is built as a mobile-first PWA with a single-column responsive layout using Tailwind CSS. It is optimized for small screens and supports smooth interaction on Android devices and browser viewports. |
| 2 | Local Offline Persistence | ✅ Complete | Survey data is stored locally using IndexedDB with Dexie. Every inspection record is kept in the device database even without internet access, so users can continue collecting data offline and sync later. |
| 3 | Automatic Background Sync | ✅ Complete | The app monitors network status with Capacitor Network API. When connectivity returns, unsynced records are sent automatically to Google Sheets and marked as synced in the local database. |
| 4 | Native Camera + GPS + Notifications | ✅ Complete | The project integrates Capacitor Camera, Geolocation, and Local Notifications to capture proof images, collect coordinates, and notify users after successful synchronization. |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE
The application is a hybrid mobile solution combining a Progressive Web App (PWA) and Capacitor native wrappers. The frontend is implemented with plain JavaScript and Tailwind CSS, making it lightweight and easily portable across mobile browsers and Android builds.

Project structure:
- `index.html`: main survey form and mobile UI layout
- `css/styles.css`: base styling and custom UI rules
- `js/db.js`: local database layer using Dexie / IndexedDB
- `js/app.js`: form logic, GPS capture, offline handling, sync flow, render list, and submit actions
- `js/native-features.js`: Capacitor integration for camera, geolocation, and notifications
- `js/sw-register.js`: service worker registration for PWA support
- `manifest.json` and `sw.js`: application metadata and offline caching configuration
- `capacitor.config.json`: Capacitor project configuration for Android packaging

Data flow:
1. The user fills in the survey form and chooses status, location, and note details.
2. GPS coordinates and image data are captured through native device APIs when available.
3. The record is saved into IndexedDB using Dexie with a `synced` flag set to 0.
4. If the device is online, the app pushes the payload to Google Apps Script, which acts as the bridge to Google Sheets.
5. If the device is offline, the data remains queued locally until the next connection event or manual sync.

Exception handling strategy:
- `try/catch` blocks are used around GPS, camera, and notification permissions.
- Network status fallback is implemented for devices where native plugins are unavailable.
- Fetch requests use `AbortController` and a timeout to prevent the app from hanging when Google Sheets is slow or unreachable.
- User feedback is shown with modal alerts and inline UI status changes to guide the process.

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS
The system was validated through practical interaction on a mobile emulator/device, covering the following scenarios:
- Submit a new inspection record while offline
- Confirm that the record is stored locally in IndexedDB
- Reconnect to the internet and observe automatic sync to Google Sheets
- Verify that the list updates correctly and pending items are reduced after sync completion

Representative screenshots from the running app:

1. Main survey form with mobile-first interface
   - Screenshot: “VKU Field Survey form showing building, room, status choice, photo input, and note section”

2. Offline record list with pending synchronization status
   - Screenshot: “Local survey records stored in the device database with a waiting-sync badge”

3. Successful network recovery and automatic sync event
   - Screenshot: “Network status changes to Online and sync is triggered automatically”

4. Completed synced result displayed in the app and Google Sheets
   - Screenshot: “Data successfully submitted and reflected in the list as synced”

> Notes: These screenshots should be captured directly from Android emulator or a physical mobile device before final submission.

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS
### Challenge 1: Synchronization reliability under unstable network conditions
The initial issue was that submitted survey data could be lost or blocked when the user was offline. Some requests also timed out due to slow Google Apps Script responses.

Resolution:
- The app stores all survey records in IndexedDB first.
- Each record keeps a `synced` status of 0 until the upload succeeds.
- Network listener triggers automatic sync when the device reconnects.
- `AbortController` with a timeout was added to each fetch request so the app does not freeze while waiting for a response.

### Challenge 2: Camera and GPS permission handling on mobile devices
Camera capture and GPS location access require user permissions and may fail on some devices or when users deny access.

Resolution:
- Camera permission is requested explicitly before taking a photo.
- GPS access is wrapped in a safe fallback to return null coordinates if the device cannot locate a position.
- The app continues functioning even if photo or location data is unavailable, while still storing the report with partial fields.

---

### Summary
This project demonstrates a practical cross-platform mobile workflow for field inspection tasks in a university environment. By combining PWA features, Capacitor plugins, IndexedDB offline storage, and Google Sheets synchronization, the app offers a simple and effective method for collecting data in real-world conditions while maintaining usability on mobile devices.
