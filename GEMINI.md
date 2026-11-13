# Project & Verification Rules

## 1. Mandatory System Testing After Major Changes (บังคับทดสอบระบบทุกครั้งหลังการแก้ไขใหญ่)
- **ทุกครั้งที่มีการแก้ไขโค้ดในส่วนสำคัญหรือเรื่องใหญ่ๆ ต้องทำการทดสอบระบบจริงก่อนส่งมอบงานเสมอ** (Never report completion after a major change without first running end-to-end verification).
- สำหรับโปรเจกต์ **Mini Game Console 3D** นี้ ทุกครั้งที่แก้ไขไฟล์ใน `js/*.js` หรือ `games/*.js`:
  1. **Sync Inline Bundle**: ต้องรันสคริปต์อัปเดตโค้ดรวมภายใน `<script type="module">` ของไฟล์ `index.html` ทันที (เพื่อให้เปิดผ่าน `file://` ได้ตรงกับไฟล์โมดูล) และตรวจสอบว่าไม่มี `import` ซ้ำซ้อนหรือขาดหาย
  2. **Console & Runtime Verification**: ต้องรันทดสอบเปิด `index.html` ด้วย Google Chrome แบบ Headless พร้อมเปิด `--enable-logging=stderr` เพื่อตรวจสอบว่าไม่มี `SyntaxError`, `ReferenceError`, `TypeError` หรือ Console Error ใดๆ
  3. **Visual / DOM Verification**: ตรวจสอบ Screenshot หรือสถานะ DOM ว่ากราฟิก WebGL 3D และ UI แสดงผลขึ้นมาอย่างถูกต้อง ไม่ค้างและไม่เป็นจอดำ
