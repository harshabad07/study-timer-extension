# Study Timer - Chrome Extension (Pomodoro Focus Assistant)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)

A clean, modern, and lightweight Pomodoro focus timer Chrome Extension built with Manifest V3. Designed specifically for students to manage study and break sessions effectively right from the browser toolbar.

---

## 🌟 Key Features

- ⏱️ **Digital Timer Display:** Real-time countdown clock in `MM:SS` format.
- 🔄 **Automatic Session Switching:** Automatically switches from **Study Session** to **Break Session** when time reaches 00:00.
- 🎛️ **Full Session Controls:** Start, Pause, and Reset buttons with dynamic state controls.
- ⚙️ **Custom Durations:** Easily customize study duration (1-120 mins) and break duration (1-60 mins).
- 💾 **State Persistence:** Uses `chrome.storage.local` to retain timer state, user settings, and running progress even if the popup or browser is closed.
- 🔔 **Desktop & Sound Alerts:** Programmatic audio chime synthesis (via Web Audio API) and Chrome desktop notifications upon session completion.
- 🌐 **100% Offline Compatible:** Built with pure HTML5, CSS3, and modern JavaScript without external dependencies.

---

## 📂 File Structure

```text
study-timer-extension/
├── manifest.json         # Extension manifest configuration (Manifest V3)
├── popup.html            # Extension popup layout
├── style.css             # Extension visual design & styles
├── popup.js              # Timer engine, storage logic & audio synthesis
├── README.md             # Project documentation
└── icons/                # Extension icon assets
    ├── icon16.png        # 16x16 icon
    ├── icon48.png        # 48x48 icon
    └── icon128.png       # 128x128 icon
```

---

## 🚀 Installation Guide (Developer Mode)

1. **Clone or Download Repository:**
   ```bash
   git clone https://github.com/harshabad07/study-timer-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left menu.
5. Select the `study-timer-extension` directory.
6. Pin the extension from the Chrome Extensions toolbar menu and start studying!

---

## 🛠️ Tech Stack

- **HTML5 & CSS3** (Flexbox & Grid responsive layout)
- **JavaScript ES6+**
- **Chrome Extension API** (`chrome.storage.local`, `chrome.notifications`)
- **Web Audio API** (`AudioContext` synthesizer)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
