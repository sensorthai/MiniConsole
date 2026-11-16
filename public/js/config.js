/**
 * Global Configuration & Hardware Protocol Constants (Thai Localization)
 */
export const Config = {
    wifi: {
        ssid: 'MiniConsole',
        password: '12345678',
        wsUrl: 'ws://192.168.4.1:81',
        reconnectIntervalMs: 2500
    },
    players: {
        maxPlayers: 4,
        activeCount: 2, // จำนวนผู้เล่นที่เลือกในหน้าแรก (1-4 คน)
        simulatedCount: 1,
        testMode: false,
        colors: [
            { hex: 0x00f0ff, css: '#00f0ff', name: 'จอย P1 (ฟ้าไซเบอร์)' },
            { hex: 0xff2a6d, css: '#ff2a6d', name: 'จอย P2 (แดงคริมสัน)' },
            { hex: 0x05ffa1, css: '#05ffa1', name: 'จอย P3 (เขียวมรกต)' },
            { hex: 0xffb800, css: '#ffb800', name: 'จอย P4 (เหลืองโซลาร์)' }
        ]
    },
    input: {
        deadZone: 0.12,
        analogExponent: 1.65,     // โค้งตอบสนองอนาล็อกสติ๊ก
        triggerSmoothing: 0.35    // ค่าความสมูทของปุ่ม L2/R2
    },
    graphics: {
        preset: 'High',           // 'Low' | 'Medium' | 'High' | 'Ultra'
        dynamicResolution: true,
        targetFps: 60,
        minPixelRatio: 0.55,
        maxPixelRatio: Math.min(window.devicePixelRatio || 1, 2.0),
        presets: {
            Low:    { shadows: false, shadowMapSize: 512,  bloom: false, ssao: false, particles: 0.35, pixelRatioCap: 0.85 },
            Medium: { shadows: true,  shadowMapSize: 1024, bloom: true,  ssao: false, particles: 0.65, pixelRatioCap: 1.0  },
            High:   { shadows: true,  shadowMapSize: 2048, bloom: true,  ssao: true,  particles: 1.0,  pixelRatioCap: 1.5  },
            Ultra:  { shadows: true,  shadowMapSize: 2048, bloom: true,  ssao: true,  particles: 1.4,  pixelRatioCap: 2.0  }
        }
    },
    games: [
        {
            id: 'kart',
            title: 'NEON KART RACING',
            titleTh: 'ศึกซิ่งคาร์ทสายฟ้า',
            subtitle: 'แข่งรถดริฟต์ 3 มิติ สนามยาวพิเศษ 4 เท่า (1-4 ผู้เล่น)',
            genre: 'เกมแข่งรถอาร์เคด',
            players: 'รองรับ 1-4 ผู้เล่น (แบ่งหน้าจอ Split-Screen)',
            accent: '#00f0ff',
            accentHex: 0x00f0ff,
            description: 'ซิ่งรถคาร์ทไซเบอร์บนสนามความยาวพิเศษ 4 เท่า ดริฟต์สะสมเกจไฟเทอร์โบ เหยียบแผ่นเร่งความเร็ว และเก็บกล่องไอเทมปริศนาชิงชัย 3 รอบสนาม พร้อมสรุปอันดับและสถิติ',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'บังคับเลี้ยวซ้าย / เลี้ยวขวา' },
                { btn: 'ปุ่ม ✕ หรือ R2', desc: 'เหยียบคันเร่งเดินหน้า' },
                { btn: 'ปุ่ม ◯ หรือ L2', desc: 'เบรก / ถอยหลัง' },
                { btn: 'ปุ่ม R1 หรือ L1 (ค้าง)', desc: 'ดริฟต์เข้าโค้งสะสมเกจไฟเทอร์โบบูสต์' },
                { btn: 'ปุ่ม □ หรือ △', desc: 'กดใช้งานไอเทมพิเศษที่เก็บได้' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        },
        {
            id: 'blaster',
            title: 'ARENA BLASTER',
            titleTh: 'สมรภูมิปืนเลเซอร์ไซเบอร์',
            subtitle: 'ดวลปืน 3 มิติ ลดพลังชีวิตนัดละ 10% รอบละ 3 นาที',
            genre: 'เกมยิงอารีน่า',
            players: 'รองรับ 1-4 ผู้เล่น (ตะลุมบอน Free-For-All)',
            accent: '#ff2a6d',
            accentHex: 0xff2a6d,
            description: 'ศึกดวลปืนพลาสม่าในสนามรบไซเบอร์ กระสุนลดพลังชีวิตนัดละ 10% พุ่งหลบด้วยเจ็ทแพ็ค เก็บไอเทมยิงรัว ยิงกระจาย และเกราะพลังงาน พร้อมตารางสรุปสถิติและอันดับ',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'เดินเคลื่อนที่ตัวละครทุกทิศทาง' },
                { btn: '🕹️ อนาล็อกขวา (R-Stick)', desc: 'หันเล็งทิศทางปากกระบอกปืน 360°' },
                { btn: 'ปุ่ม □ / ✕ / R2', desc: 'ยิงกระสุนปืนเลเซอร์พลาสม่า (ลดนัดละ 10%)' },
                { btn: 'ปุ่ม R1 / L1 / ◯', desc: 'พุ่งหลบความเร็วสูงด้วยเจ็ทแพ็ค (อมตะขณะพุ่ง)' },
                { btn: 'วิ่งชนกล่องคริสตัล', desc: 'เก็บไอเทมปืนยิงรัว / ยิงกระจาย / เกราะพลังงาน' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        },
        {
            id: 'sumo',
            title: 'SUMO BOTS',
            titleTh: 'ศึกหุ่นซูโม่ชนกระเด็น',
            subtitle: 'ฟิสิกส์ชนกระแทก กำหนดเวลา 2 นาที บนเวทีหกเหลี่ยม',
            genre: 'เกมแอ็กชันฟิสิกส์',
            players: 'รองรับ 1-4 ผู้เล่น (หาผู้รอดชีวิตคนสุดท้ายใน 2 นาที)',
            accent: '#ffb800',
            accentHex: 0xffb800,
            description: 'บังคับหุ่นซูโม่ไจโรหุ้มเกราะ พุ่งกระแทกคู่ต่อสู้ให้ตกจากเวทีภายในเวลา 2 นาที ในขณะที่วงแหวนรอบนอกพังทลายลงเรื่อยๆ พร้อมตารางสรุปสถิติและอันดับ',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'กลิ้งบังคับทิศทางหุ่นซูโม่ไจโรรอบเวที' },
                { btn: 'ปุ่ม ✕ / □ / R1', desc: 'พุ่งกระแทกพลังแม่เหล็กไฟฟ้า (Dash ชนกระเด็น)' },
                { btn: 'ระวังขอบเวทีกะพริบสีแดง', desc: 'วงแหวนรอบนอกจะพังทลายลงทุกๆ 30 วินาที' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        },
        {
            id: 'soccer',
            title: 'ROCKET SOCCER',
            titleTh: 'ฟุตบอลรถซิ่งติดจรวด',
            subtitle: 'รถสปอร์ตติดเทอร์โบปะทะลูกฟุตบอลยักษ์',
            genre: 'เกมกีฬาแอ็กชัน',
            players: 'รองรับ 1-4 ผู้เล่น (แบ่งทีม 1v1 หรือ 2v2)',
            accent: '#05ffa1',
            accentHex: 0x05ffa1,
            description: 'ขับรถซุปเปอร์คาร์ติดเทอร์โบ กระโดดลอยตัวกลางอากาศและพุ่งชนลูกฟุตบอลฟิสิกส์ยักษ์เข้าประตูฝ่ายตรงข้าม พร้อมเอฟเฟกต์ระเบิดเมื่อทำประตู',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'บังคับรถเดินหน้า / ถอยหลัง และเลี้ยวซ้าย / เลี้ยวขวา' },
                { btn: 'ปุ่ม ✕ / R2 หรือ ◯ / L2', desc: 'คันเร่งเดินหน้า / ถอยหลัง (สำรอง)' },
                { btn: 'ปุ่ม R1 หรือ □ (กดค้าง)', desc: 'เปิดไอพ่นเทอร์โบบูสต์พุ่งชนบอลแรงพิเศษ' },
                { btn: 'ปุ่ม △ หรือ L1', desc: 'กระโดดลอยตัวกลางอากาศเพื่อโหม่งลูกฟุตบอล' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        },
        {
            id: 'zombies',
            title: 'ZOMBIE DEFENSE CO-OP',
            titleTh: 'หน่วยรบพิทักษ์เตาปฏิกรณ์',
            subtitle: 'ป้องกันฐานและชิงแต้มสูงสุดภายในเวลา 3 นาที (5 เวฟ)',
            genre: 'เกมร่วมมือกันเอาชีวิตรอด',
            players: 'รองรับ 1-4 ผู้เล่น (ป้องกันฐาน + ชิงอันดับ 1 ใน 3 นาที)',
            accent: '#b829ff',
            accentHex: 0xb829ff,
            description: 'ปกป้องเตาปฏิกรณ์กลางจากฝูงซอมบี้กลายพันธุ์ภายในเวลา 3 นาที (5 เวฟ พร้อมบอสในเวฟที่ 3 และ 5) ใครทำคะแนนสังหารและดาเมจรวมสูงสุดคว้าแชมป์อันดับ 1!',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'เคลื่อนที่ฮีโร่ลาดตระเวนรอบฐานเตาปฏิกรณ์' },
                { btn: '🕹️ อนาล็อกขวา (R-Stick)', desc: 'หันเล็งทิศทางและยิงอัตโนมัติตามทิศที่ดัน' },
                { btn: 'ปุ่ม □ / ✕ / R2', desc: 'ยิงอาวุธปืนประจำทีม (อัปเกรดอัตโนมัติ 3 ระดับ)' },
                { btn: 'ปุ่ม △ (สามเหลี่ยม)', desc: 'ใช้แต้มพลังงานทีม 50 แต้ม ซ่อมเตาปฏิกรณ์ (+200 HP)' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        },
        {
            id: 'cyber-tennis',
            title: 'CYBER TENNIS',
            titleTh: 'ไซเบอร์เทนนิส 3 มิติ',
            subtitle: 'ดวลแร็กเกตพลังงานไซเบอร์ ชิง 5 คะแนน (1-4 ผู้เล่น)',
            genre: 'เกมกีฬาอาร์เคด 3 มิติ',
            players: 'รองรับ 1-4 ผู้เล่น (1v1 หรือ 2v2)',
            accent: '#00d9ff',
            accentHex: 0x00d9ff,
            description: 'ดวลเทนนิสในสนามนีออนไซเบอร์ 3 มิติ ตีลูกได้ 4 รูปแบบทั้ง Normal, Power, Lob และ Special Cyber Smash ชิง 5 แต้มแรกเพื่อคว้าแชมป์!',
            controls: [
                { btn: '🕹️ อนาล็อกซ้าย (L-Stick)', desc: 'เคลื่อนที่ซ้าย-ขวา หน้า-หลัง และกำหนดทิศทางลูก' },
                { btn: 'ปุ่ม ✕ หรือ R1', desc: 'ตีลูกปกติ (Normal Shot)' },
                { btn: 'ปุ่ม □ หรือ R2', desc: 'หวดลูกพลังสูงความเร็วแรง (Power Shot)' },
                { btn: 'ปุ่ม ◯ หรือ L1', desc: 'ตีลูกโด่งข้ามหัว (Lob Shot)' },
                { btn: 'ปุ่ม △ หรือ L2', desc: 'ท่าไม้ตาย Cyber Smash (ใช้พลังพิเศษ 50%)' },
                { btn: 'คีย์บอร์ด: Tab / P / ESC', desc: 'ดูตารางสถิติ / หยุดเกม / กลับเมนูหลัก' }
            ]
        }
    ]
};

// Bitmask constants matching ESP32 firmware protocol
export const PS3Buttons = {
    CROSS:    (1 << 0),  // 1
    CIRCLE:   (1 << 1),  // 2
    SQUARE:   (1 << 2),  // 4
    TRIANGLE: (1 << 3),  // 8
    L1:       (1 << 4),  // 16
    R1:       (1 << 5),  // 32
    L2:       (1 << 6),  // 64
    R2:       (1 << 7),  // 128
    SELECT:   (1 << 8),  // 256
    START:    (1 << 9),  // 512
    L3:       (1 << 10), // 1024
    R3:       (1 << 11), // 2048
    UP:       (1 << 12), // 4096
    DOWN:     (1 << 13), // 8192
    LEFT:     (1 << 14), // 16384
    RIGHT:    (1 << 15), // 32768
    PS:       (1 << 16)  // 65536
};
