# ESP32 PS3 4-Controller Hub & WebSocket Firmware (ESP-IDF v5.5.1)

เฟิร์มแวร์สำหรับบอร์ด **ESP32** พัฒนาด้วย **ESP-IDF** เวอร์ชันล่าสุด (**`v5.5.1`**) และไลบรารี [`jvpernis/esp32-ps3`](https://github.com/jvpernis/esp32-ps3) ที่ปรับปรุงให้รองรับการเชื่อมต่อ **จอย PS3 (DualShock 3 / Sixaxis) พร้อมกันสูงสุด 4 เครื่อง (P1 – P4)** พร้อมหน้า **Web UI AP Portal** สำหรับตั้งค่าจอย, เชื่อมต่อ WiFi บ้าน/วงแลน และกำหนดที่อยู่ **Game App WebSocket Server**

---

## ✨ คุณสมบัติหลัก (Features)

1. **รองรับจอย PS3 พร้อมกัน 4 จอย (`P1 – P4`)**:
   - ขยายขีดจำกัด L2CAP (`BT_PSM_HIDC 0x0011` และ `BT_PSM_HIDI 0x0013`) ของ `jvpernis/esp32-ps3` ให้แยกแยะช่องสัญญาณตาม `BD_ADDR` ของจอยแต่ละตัวได้สูงสุด 4 เครื่องพร้อมกัน
   - แสดงไฟ LED ประจำตัวผู้เล่น (`LED1` – `LED4`) อัตโนมัติเมื่อเชื่อมต่อ และรองรับคำสั่งสั่น (Rumble) แยกอิสระทั้ง 4 จอย
   - รองรับการล็อก MAC ประจำสล็อต (Pin MAC to P1–P4) หรือสลับสล็อตจอย (`Swap Slot`) ผ่านหน้าเว็บได้ทันที

2. **Web UI AP Configuration Portal (`http://192.168.4.1`)**:
   - กระจายสัญญาณ WiFi AP ชื่อ **`MiniConsole-PS3`** (รหัสผ่านเริ่มต้น: **`12345678`**)
   - แสดงค่า **Bluetooth Master MAC** ของบอร์ด ESP32 เพื่อนำไปกรอกในโปรแกรม `SixaxisPairTool` หรือกำหนด **Custom Bluetooth Master MAC** บนหน้าเว็บเพื่อให้จอย PS3 ที่จับคู่ไว้แล้วเชื่อมต่อได้ทันทีโดยไม่ต้องเสียบสายใหม่
   - สแกนหาเครือข่าย WiFi 2.4GHz (`Scan WiFi`) และบันทึก SSID/Password เพื่อเชื่อมต่อเข้ากับเราเตอร์ (ทำงานแบบ `AP+STA` พร้อมกัน)
   - ตั้งค่า **Game App Server WebSocket URL** (เช่น `ws://192.168.1.100:8080/ws`) พร้อมปุ่มทดสอบสั่นจอยและปุ่มส่งแพ็กเก็ตทดสอบเข้าเซิร์ฟเวอร์

3. **ส่งข้อมูลผ่าน WebSocket ความเร็วสูง 60 Hz (รองรับทั้งโหมด Client และ Server)**:
   - **Outbound WebSocket Client**: เชื่อมต่อไปยัง Game App Server ตาม URL ที่ตั้งค่าไว้ในหน้าเว็บ (`ws://<server-ip>:8080/ws`) อัตโนมัติ (ผ่าน official `espressif/esp_websocket_client`)
   - **Direct WebSocket Server**: เปิดพอร์ต `ws://192.168.4.1:81/` (และ `ws://<sta-ip>:81/` รวมถึง `/ws`) เพื่อให้หน้าเว็บเกมเชื่อมต่อตรงเข้าหา ESP32 ได้ทันที

---

## 🛠️ วิธี Build และ Flash เฟิร์มแวร์ด้วย ESP-IDF v5.5.1

### 1. คอมไพล์เฟิร์มแวร์ (Build)
```bash
export IDF_TOOLS_PATH=/Users/tinshunijtanakun/esp-idf
export IDF_PATH=/Users/tinshunijtanakun/esp/v5.5.1/esp-idf
source /Users/tinshunijtanakun/esp/v5.5.1/esp-idf/export.sh

cd "/Users/tinshunijtanakun/Documents/Antigravity/Online Game/esp32_ps3_idf"
idf.py build
```

### 2. แฟลชลงบอร์ด ESP32 (Flash)
เสียบสาย USB เข้ากับบอร์ด ESP32 แล้วรันคำสั่ง (เปลี่ยน `/dev/cu.usbserial-XXXX` เป็นพอร์ตของบอร์ด):
```bash
idf.py -p /dev/cu.usbserial-0001 flash monitor
```

---

## 🎮 วิธีใช้งานร่วมกับตัวเกม Mini Game Console 3D

### วิธีที่ 1: รัน Game App WebSocket Server บนเครื่องคอมพิวเตอร์
1. เปิด Terminal ในโฟลเดอร์เกมแล้วรัน:
   ```bash
   node "/Users/tinshunijtanakun/Documents/Antigravity/Online Game/ws_game_server.js"
   ```
2. Terminal จะแสดง URL ของเซิร์ฟเวอร์ เช่น `ws://192.168.1.50:8080/ws`
3. เชื่อมต่อ WiFi มือถือหรือคอมพิวเตอร์ไปที่ **`MiniConsole-PS3`** (รหัส `12345678`) แล้วเปิดเบราว์เซอร์ไปที่ **`http://192.168.4.1`**
4. ตั้งค่าให้ ESP32 เกาะ WiFi วงเดียวกับคอมพิวเตอร์ และกรอก **Game App Server WebSocket Address** เป็น `ws://192.168.1.50:8080/ws` แล้วกดบันทึก

### วิธีที่ 2: เชื่อมต่อตรงจากเบราว์เซอร์ไปที่ ESP32
- ในหน้า **ห้องเตรียมความพร้อมจอยสติ๊ก (Lobby)** ของเกม สามารถกรอก `ws://192.168.4.1:81` หรือ `ws://<IP-ของ-ESP32>:81` แล้วกดปุ่ม **เชื่อมต่อ** ได้โดยตรง
