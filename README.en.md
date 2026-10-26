<div align="center">

# Mediaprompter

**A teleprompter and iPhone camera monitor in one window. Windows, AirPlay, no cables, no cloud.**

[Русская версия](README.md)

<img src="docs/screenshots/main.png" alt="Mediaprompter main window" width="900">

</div>

## What it does

You record video on your iPhone and want to read a script while looking close to the lens. Mediaprompter shows both on your PC screen: the live iPhone picture (via the built-in Screen Mirroring) and a smoothly scrolling prompter text. The recording itself stays on the iPhone at full quality; the PC is only a monitor and prompter.

Everything runs locally. No accounts, no analytics, no servers, and the script is never written to disk.

The interface is in Russian.

## Features

- Smooth scrolling with adjustable speed, space to pause.
- Font, size, weight, line height, colours, alignment, mirrored text, reading guide.
- Detachable always-on-top prompter window for a second monitor.
- Reading mode without panels, full screen (F11).
- AirPlay Screen Mirroring receiver with a 4-digit PIN, 1080p or 720p request profiles.
- Preview rotation (90/180/270°), flip, zoom up to 400%, live resolution and FPS readout.
- Free-form, resizable panels plus ready-made layouts.

## Install

Requirements: Windows 10/11 x64, an iPhone, both on the same local network.

1. Download `Mediaprompter-<version>-win-x64.zip` from the [latest release](https://github.com/axionode/mediaprompter/releases/latest).
2. Unzip anywhere (portable, no installer).
3. Run `Mediaprompter.exe`. The app is unsigned, so SmartScreen may ask: More info → Run anyway.
4. When Windows asks about network access, allow **private networks**.

## Connect the iPhone

1. Put the iPhone and the PC on the same Wi-Fi.
2. Click **«Подключить iPhone»** (Connect iPhone).
3. On the iPhone: Control Centre → Screen Mirroring → **Mediaprompter**.
4. Enter the PIN shown in the app.
5. Open Camera and start recording. The picture appears in the Monitor panel.

If the iPhone does not see the receiver: check that both devices are on the same network, VPN is off, the guest Wi-Fi does not isolate clients, and the app is allowed on private networks in Windows Firewall.

## Build from source

```powershell
git clone https://github.com/axionode/mediaprompter.git
cd mediaprompter
powershell -ExecutionPolicy Bypass -File tools\fetch-electron.ps1   # Electron 45.0.0, SHA256-verified
```

AirPlay receiver ([UxPlay](https://github.com/FDH2/UxPlay) with [one small patch](patches/uxplay-optional-libav.patch)), built in MSYS2 UCRT64:

```bash
pacman -S --needed mingw-w64-ucrt-x86_64-{gcc,cmake,ninja,pkgconf,openssl,libplist} \
  mingw-w64-ucrt-x86_64-gstreamer mingw-w64-ucrt-x86_64-gst-plugins-{base,good,bad} \
  mingw-w64-ucrt-x86_64-gst-libav mingw-w64-ucrt-x86_64-python
cmake -S native/uxplay -B work/native-build -G Ninja -DCMAKE_BUILD_TYPE=Release -DNO_MARCH_NATIVE=ON
cmake --build work/native-build
python tools/package_receiver.py "$(cygpath -w /ucrt64)"
```

Then `tools\build-launcher.cmd` and run `Mediaprompter.exe` (or `npm start`).

Tests: `npm test` (unit, any OS), `npm run test:integration` (Windows with the runtime in place).

## License

GPL-3.0-or-later. Third-party components keep their own licences, see [THIRD-PARTY.md](THIRD-PARTY.md) and [`licenses/`](licenses). Not affiliated with Apple. AirPlay and iPhone are trademarks of Apple Inc.
