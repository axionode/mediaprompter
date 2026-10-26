# Third-party components

Mediaprompter source: GPL-3.0-or-later (see licenses/GPL-3.0.txt).

## UxPlay

Upstream: https://github.com/FDH2/UxPlay
Commit: 82ad05ce34ec862851fa6ab1240f50f58fb7fa5a
Licence: GPL-3.0-or-later; embedded dependencies retain their notices in native/uxplay.
Complete corresponding source is in native/uxplay. The exact change against upstream is in patches/uxplay-optional-libav.patch.
Modification: gstreamer_init receives a require_libav flag. Libav is optional when audio is disabled and an explicit non-libav decoder is selected. Version 0.1.1 uses FFmpeg avdec_h264 and a high-quality JPEG sink for local preview. OpenH264 remains available for synthetic regression streams.

## GStreamer and dependencies

Upstream: https://gstreamer.freedesktop.org/
Runtime packages: MSYS2 UCRT64 official repositories.
Selected plugins: libav, coreelements, autodetect, app, typefindfunctions, playback, videoconvertscale, videoparsersbad, openh264, jpeg, multipart, tcp, videotestsrc, audioparsers, audioconvert, audioresample, faad.
Licence texts and attributions are in licenses. All DLLs are dynamically linked and can be replaced with ABI-compatible versions.
OpenH264: https://github.com/cisco/openh264
OpenSSL: https://www.openssl.org/
libplist: https://github.com/libimobiledevice/libplist
GLib: https://gitlab.gnome.org/GNOME/glib

## Electron

Upstream: https://github.com/electron/electron
Version: 45.0.0, official win32-x64 distribution.
SHA256: AE53887A23BB640369C93DBD38C408A2AF5C0DEB86F2FA76C6C244CB444B7F47
The downloaded ZIP was checked (see tools/fetch-electron.ps1) against upstream SHASUMS256.txt.
MIT and Chromium/dependency notices (in the release archive): runtime/electron/LICENSE and runtime/electron/LICENSES.chromium.html.
No auto-updater, telemetry or cloud service is configured by this app.


## FFmpeg decoder update (0.1.1)

Official MSYS2 UCRT64 packages: gst-libav 1.28.8-1 and FFmpeg 9.0.2-1.
Package versions, SHA256 checksums and added DLL names are recorded in runtime/receiver/ffmpeg-packages.json (in the release archive).
Upstream: https://ffmpeg.org/ ; build recipes and source references: https://github.com/msys2/MINGW-packages/tree/master/mingw-w64-ffmpeg
All downloaded archives were verified against the official repository SHA256 metadata. Notices supplied by the dependency packages are in licenses.
