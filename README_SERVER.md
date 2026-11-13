# Mini Game Console 3D — Portable Server Pack

แพ็กเกจติดตั้งและรันเซิร์ฟเวอร์ (Next.js + WebSocket Hub พอร์ต `8080`) สำหรับนำไปติดตั้งบนเครื่อง **Windows**, **macOS**, หรือ **Linux / Unix**

## สิ่งที่ตัวติดตั้งจะตรวจสอบและติดตั้งให้อัตโนมัติ
1. ตรวจสอบ **Node.js (>= v18)** และ **npm** — หากยังไม่มีจะดาวน์โหลด/ติดตั้งให้อัตโนมัติ (macOS: Homebrew หรือ Official tarball, Linux: Official tarball หรือ apt/dnf/yum/pacman/apk, Windows: `winget` หรือ Official portable ZIP)
2. ติดตั้ง Dependencies ทั้งหมด (`npm ci` / `npm install`: `next`, `react`, `three`, `cannon-es`, `ws`, `typescript`)
3. คอมไพล์ Production Build (`npm run build`)
4. ตรวจสอบความพร้อมของพอร์ต (`8080`)

---

## วิธีติดตั้งและรัน

### macOS / Linux / Unix
```bash
chmod +x install.sh start.sh
./install.sh          # ตรวจสอบ + ติดตั้ง + Build
./start.sh            # รันเซิร์ฟเวอร์ (พอร์ต 8080)
# หรือติดตั้งและรันทันที:
./install.sh --start
```

### Windows
- ดับเบิลคลิก **`install.bat`** (หรือรัน `powershell -ExecutionPolicy Bypass -File install.ps1` ใน PowerShell)
- จากนั้นดับเบิลคลิก **`start.bat`** เพื่อเปิดเซิร์ฟเวอร์

> เปลี่ยนพอร์ตได้ด้วยตัวแปร `PORT` เช่น `PORT=3000 ./start.sh` (Mac/Unix) หรือ `set PORT=3000 && start.bat` (Windows)
