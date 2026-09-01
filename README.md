<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Remix 3D Model Painting Studio (v14)

Client-side 3D drawing, procedural modeling, UV projection texturing, and universal asset conversion workstation.

---

## 🚀 Quick Start

### 1. Standard Local Dev Server
```bash
npm install
npm run dev
```

### 2. Mobile Device Local Testing (with QR Code)
To test directly on your iPhone, iPad, or Android phone connected to the same Wi-Fi network:

```bash
npm run dev:mobile
```
*or double-click **`start-mobile-server.bat`** on Windows.*

Scan the generated **QR Code** in your terminal using your phone camera to launch immediately.

### 3. Mobile Testing with HTTPS (SSL)
For features requiring a Secure Context (Device Orientation, Gyroscope sensors, WebGPU):
```bash
npm run dev:https
```

---

## 📱 Mobile Interaction Guide
- **1-Finger Touch / Stylus**: Draw 3D strokes, paint meshes, sculpt deformers.
- **2-Finger Touch**: Orbit (rotate), two-finger drag (pan), pinch (zoom).
- **In-App Mobile Connect**: Click the **Mobile** icon or More menu in the studio header to display the live QR Code and connection diagnostics at any time.
- **Full-Screen (PWA)**: In iOS Safari or Android Chrome, select *"Add to Home Screen"* for a distraction-free, native full-screen experience.
