# Mini Game Console 3D (Next.JS Server + Three.js WebGL2 + ESP32 DualShock 3 Bridge)

A complete 1–4 player local-multiplayer 3D browser game console powered by **Next.JS (v14)**, featuring a PlayStation / Google Playground-inspired 3D carousel home menu, 5 full 3D games, integrated WebSocket server on `ws://<server-ip>:8080/ws`, and a 60 Hz hardware controller bridge for Sony PS3 DualShock 3 / Sixaxis gamepads powered by an **ESP32 (Classic Bluetooth ESP-IDF v5.5.1)**.

---

## ⚡ Next.JS Server Quickstart

Make sure Node.js is available on your PATH:
```bash
export PATH="/Users/tinshunijtanakun/.local/node-v22.11.0-darwin-arm64/bin:$PATH"
```

### Development Mode:
```bash
npm run dev
```

### Production Build & Run:
```bash
npm run build
npm start
```
- **Web App**: `http://localhost:8080` (or `http://<your-lan-ip>:8080`)
- **ESP32 WebSocket Endpoint**: `ws://<your-lan-ip>:8080/ws`
- **Server Info API**: `http://localhost:8080/api/server-info`

---

## 1. Hardware Architecture & Wiring

### Why Classic ESP32 vs. ESP32-S3?
- **ESP32-WROOM-32 / ESP32-DevKitC**: Features **Bluetooth Classic (BR/EDR)**, which is required by Sony DualShock 3 / Sixaxis controllers (they use Bluetooth HID over L2CAP + magic enable report). A single classic ESP32 running **Bluepad32** accepts up to **4 simultaneous PS3 pads** over Bluetooth while hosting the `MiniConsole` WiFi Access Point (`192.168.4.1`) and streaming compact JSON over WebSocket port `81` at 60 Hz (`16 ms`).
- **ESP32-S3**: Supports **Bluetooth Low Energy (BLE 5.0) only** — it has **no Bluetooth Classic radio** and cannot pair with PS3 pads wirelessly. To use an ESP32-S3, flash `esp32s3_usb_host/esp32s3_usb_host.ino` and connect a DualShock 3 via a Mini-USB cable to the S3's native USB-OTG port (`GPIO 19 = D-`, `GPIO 20 = D+`, `5V VBUS` enabled).

### Wiring Table
| Module | Connection | Pins / Details |
| :--- | :--- | :--- |
| **ESP32-WROOM-32 (Wireless Bridge)** | Micro-USB Power (5V, >=1A) | No external wiring needed; onboard PCB antenna handles BT Classic + WiFi SoftAP coexistence. |
| **ESP32-S3-DevKitC-1 (Optional Wired USB Host)** | USB-OTG Port to PS3 Mini-USB | `GPIO 19` (USB D-), `GPIO 20` (USB D+), `5V` (VBUS jumper shorted on DevKitC-1), `GND`. |

---

## 2. Flashing the ESP32 Firmware

### Option A: PlatformIO (Recommended)
1. Install [VS Code](https://code.visualstudio.com/) + the **PlatformIO IDE** extension.
2. Open `esp32_bridge/platformio.ini` and build/upload:
   ```bash
   cd esp32_bridge
   pio run --target upload
   pio device monitor -b 115200
   ```

### Option B: Arduino IDE (with Bluepad32 Board Manager)
1. Open **Arduino IDE 2.x** -> **Preferences** -> **Additional Boards Manager URLs**, and add:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   https://raw.githubusercontent.com/ricardoquesada/esp32-arduino-lib-builder/master/bluepad32_files/package_esp32_bluepad32_index.json
   ```
2. Open **Tools -> Board -> Boards Manager**, install **esp32_bluepad32**, and select **ESP32 Dev Module (Bluepad32)**.
3. Install libraries from Library Manager:
   - `WebSockets` by Markus Sattler (`links2004`)
   - `ArduinoJson` by Benoit Blanchon (`v7.x`)
4. Under **Tools -> Partition Scheme**, select **Huge APP (3MB No OTA/1MB SPIFFS)** (required because WiFi + BT stacks exceed the default 1.2MB partition).
5. Flash `esp32_bridge/esp32_bridge.ino` and open Serial Monitor at `115200` baud.

---

## 3. PS3 DualShock 3 / Sixaxis Pairing Guide

Sony PS3 controllers do not use standard Bluetooth discovery menus; instead, the Bluetooth Master MAC address must be written into the controller's NVRAM over USB.

1. **Read the ESP32 Bluetooth MAC Address**:
   Boot the flashed ESP32 and check the Serial Monitor at `115200` baud:
   ```text
   [BT] ESP32 Bluetooth Classic Master MAC: 24:6F:28:AA:BB:CC
   ```
2. **Write the ESP32 MAC into each PS3 Controller (up to 4 pads)**:
   - **Windows (`SixaxisPairTool`)**:
     1. Plug the PS3 DualShock 3 into your PC via Mini-USB.
     2. Run **SixaxisPairTool**, type `24:6F:28:AA:BB:CC`, and click **Update**.
   - **macOS / Linux (`sixpair`)**:
     ```bash
     # Install libusb and compile sixpair, or use sixpair CLI:
     sudo ./sixpair 24:6F:28:AA:BB:CC
     ```
3. **Connect Wirelessly**:
   Unplug the Mini-USB cable from the PS3 controller and press the **PS Button**. Within 1–2 seconds, the controller will pair with the ESP32, vibrate briefly, and illuminate its assigned Player LED (`P1` = LED 1, `P2` = LED 2, `P3` = LED 3, `P4` = LED 4).
4. **Allowlist & 4-Controller Limit**:
   The ESP32 Bluetooth Classic piconet + WiFi coexistence supports up to **4 simultaneous DualShock 3 pads** reliably. In `esp32_bridge.ino`, `myControllers[4]` enforces the 4-player cap and rejects a 5th pad. You can optionally set `ENFORCE_ALLOWLIST = true` to restrict pairing to specific controller MAC addresses.

---

## 4. WebSocket Protocol & Button Bitmask Table

- **Endpoint**: `ws://192.168.4.1:81`
- **ESP32 -> Browser (60 Hz / every 16 ms per connected pad)**:
  ```json
  {"t":"pad","p":0,"lx":-12,"ly":100,"rx":0,"ry":0,"l2":0,"r2":255,"b":1,"bat":4}
  ```
- **Browser -> ESP32 (Rumble & LED Feedback)**:
  ```json
  {"t":"rumble","p":1,"l":128,"r":128,"ms":200}
  {"t":"led","p":1,"mask":1,"r":0,"g":240,"b":255}
  ```

### Button Bitmask (`b` field)
| Bit | Value (Dec) | Value (Hex) | PS3 Button | Keyboard Fallback (P1) |Action Mapping |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `0` | `1` | `0x0001` | **Cross (✕)** | `Space` / `Enter` | Accelerate / Jump / Confirm |
| `1` | `2` | `0x0002` | **Circle (◯)** | `Backspace` / `C` | Brake / Back |
| `2` | `4` | `0x0004` | **Square (□)** | `F` / `X` | Shoot / Use Item / Ram |
| `3` | `8` | `0x0008` | **Triangle (△)** | `R` / `Z` | Special / Upgrade / Jump |
| `4` | `16` | `0x0010` | **L1** | `Q` | Drift / Dodge Left |
| `5` | `32` | `0x0020` | **R1** | `E` / `Left Shift` | Drift / Dash / Rocket Boost |
| `6` | `64` | `0x0040` | **L2 (Digital)** | `S` | Analog Brake Threshold |
| `7` | `128` | `0x0080` | **R2 (Digital)** | `W` | Analog Throttle Threshold |
| `8` | `256` | `0x0100` | **Select** | `Tab` | Scoreboard |
| `9` | `512` | `0x0200` | **Start** | `P` | Pause / Resume Game |
| `10` | `1024` | `0x0400` | **L3** | — | Left Stick Click |
| `11` | `2048` | `0x0800` | **R3** | — | Right Stick Click |
| `12` | `4096` | `0x1000` | **D-Pad Up** | `ArrowUp` | Menu / Move Up |
| `13` | `8192` | `0x2000` | **D-Pad Down** | `ArrowDown` | Menu / Move Down |
| `14` | `16384` | `0x4000` | **D-Pad Left** | `ArrowLeft` | Carousel Prev / Steer Left |
| `15` | `32768` | `0x8000` | **D-Pad Right** | `ArrowRight` | Carousel Next / Steer Right |
| `16` | `65536` | `0x10000` | **PS Button** | `Escape` / `Home` | Return to Console Home Menu |

---

## 5. Running the Console in Browser

Because ES Modules (`import ... from`) require HTTP/HTTPS rather than `file://`, serve the project root with any static HTTP server:
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in Google Chrome.
- **With ESP32 Hardware**: Connect your laptop/TV/phone WiFi to SSID `MiniConsole` (password `12345678`). The top-right status badge will turn green (`ESP32 WS: CONNECTED (60Hz)`).
- **Without Hardware (Instant Local Testing)**: Play immediately using Keyboard (`WASD` + `Arrows` + `Space`/`F`/`E`/`P`/`ESC`), any USB/Bluetooth gamepad via the HTML5 Gamepad API, or check **SimBots** in the top bar to populate simulated controller inputs.

---

## 6. Troubleshooting
- **PS3 Controller blinks all 4 LEDs and turns off**: Double-check that the MAC flashed via `SixaxisPairTool`/`sixpair` matches the `[BT] ESP32 Bluetooth Classic Master MAC` printed in the ESP32 Serial Monitor (note that the Bluetooth MAC is typically the base WiFi MAC `+ 2` on the last octet).
- **Compile error `Sketch too big` in Arduino IDE**: Change **Tools -> Partition Scheme** to **Huge APP (3MB No OTA/1MB SPIFFS)**.
- **Chrome blocks `ws://192.168.4.1:81` when hosted on HTTPS**: Serve `index.html` over local `http://` (e.g., `http://localhost:8080`) so Chrome allows unencrypted `ws://` connections to the LAN ESP32 AP.
