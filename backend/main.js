const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const mqtt = require('mqtt');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr'); // ✅ 1. เพิ่มบรรทัดนี้

const path = require('path');

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env อัตโนมัติ (ปลอดภัย ไม่หลุดขึ้น Git)
try {
    process.loadEnvFile();
} catch (e) {
    try {
        process.loadEnvFile(path.resolve(__dirname, '../.env'));
    } catch (err) {}
}

const app = express();
const PORT = process.env.PORT || 8001;
const MQTT_HOST = process.env.MQTT_HOST || 'mqtt://127.0.0.1:1883';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/facelocker';
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD) || 0.55;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ----------------------------------------
// 1. ตั้งค่า MQTT และ Database
// ----------------------------------------
const mqttClient = mqtt.connect(MQTT_HOST, { reconnectPeriod: 10000 });

mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT Broker:', MQTT_HOST);
});

mqttClient.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
});

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB:', MONGO_URI);
        initLockers();
    })
    .catch((err) => console.error('❌ Connection Error:', err));

// ----------------------------------------
// 2. Database Schemas
// ----------------------------------------
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    lastname: String,
    phone: String,
    faceDescriptor: Array
});
const User = mongoose.model('User', userSchema);

const lockerSchema = new mongoose.Schema({
    id: Number,
    status: { type: String, default: 'available' },
    owner: { type: String, default: null }
});
const Locker = mongoose.model('Locker', lockerSchema);

async function initLockers() {
    try {
        const count = await Locker.countDocuments();
        if (count === 0) {
            for (let i = 1; i <= 12; i++) {
                await Locker.create({ id: i });
            }
            console.log('✅ สร้างตู้ล็อกเกอร์เรียบร้อย');
        }
    } catch (err) {
        console.error('❌ Error initializing lockers:', err);
    }
}

function getEuclideanDistance(face1, face2) {
    if (!Array.isArray(face1) || !Array.isArray(face2) || face1.length !== face2.length) {
        return 1.0;
    }
    return Math.sqrt(
        face1.map((val, i) => val - face2[i])
            .reduce((sum, diff) => sum + diff * diff, 0)
    );
}

// ----------------------------------------
// 4. API Routes
// ----------------------------------------

app.get('/', (req, res) => res.send('✅ Server is Ready!'));

// ==========================================
// 🟢 API สร้าง QR Code
// ==========================================
app.post('/generate-qr', async (req, res) => {
    try {
        // เบอร์โทรศัพท์ PromptPay ของระบบ (10 หลัก)
        const mobileNumber = process.env.PROMPTPAY_ID || req.body?.mobileNumber || '0623284172'; 
        const amount = Number(req.body?.amount) || 10.00; // จำนวนเงิน

        // สร้าง Payload พร้อมเพย์จากเบอร์โทร
        const payload = generatePayload(mobileNumber, { amount });
        
        // แปลงเป็นรูปภาพ QR Code (Base64)
        const qrImage = await QRCode.toDataURL(payload);

        res.json({ 
            success: true, 
            qrImage: qrImage, 
            amount: amount 
        });
    } catch (error) {
        console.error("QR Error:", error);
        res.status(500).json({ success: false, message: "สร้าง QR ไม่สำเร็จ: " + error.message });
    }
});
// ==========================================

app.get('/user-profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select('-password -faceDescriptor');
        if (user) {
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/update-profile/:currentUsername', async (req, res) => {
    try {
        const { currentUsername } = req.params;
        const { username, name, lastname, phone, password } = req.body;
        const updateData = { name, lastname, phone };
        let newUsername = username;

        if (username !== currentUsername) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.json({ success: false, message: 'Username นี้ถูกใช้ไปแล้ว' });
            }
            updateData.username = username;
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        const result = await User.updateOne({ username: currentUsername }, { $set: updateData });

        if (username !== currentUsername && result.matchedCount === 1) {
            await Locker.updateMany({ owner: currentUsername }, { $set: { owner: username } });
        }

        if (result.matchedCount === 1) {
            res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', newUsername: newUsername });
        } else {
            res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดต' });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password, name, lastname, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, name, lastname, phone });
        await newUser.save();
        res.json({ success: true });
    } catch (error) {
        if (error.code === 11000) {
            return res.json({ success: false, message: 'Username นี้ถูกใช้ไปแล้ว' });
        }
        console.error(error);
        res.json({ success: false, message: 'ระบบผิดพลาด' });
    }
});

app.post('/register-face', async (req, res) => {
    const { username, faceDescriptor } = req.body;

    // Validate input
    if (!username || !faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่สมบูรณ์ (ต้องการ username และ faceDescriptor 128 ค่า)' });
    }

    try {
        // ตรวจสอบว่า user มีอยู่จริง
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
        }

        await User.updateOne({ username: username }, { $set: { faceDescriptor: faceDescriptor } });
        res.json({ success: true, message: 'บันทึกรหัสใบหน้าเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const foundUser = await User.findOne({ username });
        if (!foundUser) {
            return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านผิด' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (isMatch) {
            const userWithoutPass = foundUser.toObject();
            delete userWithoutPass.password;
            res.json({ success: true, message: `ยินดีต้อนรับคุณ ${foundUser.name}`, user: userWithoutPass });
        } else {
            res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านผิด' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายใน Server' });
    }
});

app.get('/lockers', async (req, res) => {
    try {
        const lockers = await Locker.find().sort({ id: 1 });
        res.json(lockers);
    } catch (error) {
        console.error('Lockers error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายใน Server' });
    }
});

app.post('/book', async (req, res) => {
    try {
        const { lockerId, username } = req.body;
        const numericLockerId = Number(lockerId);

        // Atomic operation: find + update ในคำสั่งเดียว ป้องกัน race condition
        const locker = await Locker.findOneAndUpdate(
            { id: numericLockerId, status: 'available' },
            { $set: { status: 'busy', owner: username } },
            { new: true }
        );

        if (!locker) {
            // ตรวจสอบว่าตู้มีอยู่จริงหรือไม่
            const exists = await Locker.findOne({ id: numericLockerId });
            if (!exists) {
                return res.json({ success: false, message: 'ไม่พบตู้ล็อกเกอร์' });
            }
            return res.json({ success: false, message: 'ตู้ไม่ว่าง' });
        }

        if (mqttClient.connected) {
            const payload = JSON.stringify({
                id: numericLockerId,
                username: username,
                action: 'BOOK'
            });
            mqttClient.publish('locker/control', payload);
            console.log(`📡 MQTT: สั่งเปิดตู้ ${numericLockerId} โดย ${username} (Booking)`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Book error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายใน Server' });
    }
});

app.post('/return-face-verify', async (req, res) => {
    const { lockerId, faceDescriptor, username } = req.body;
    const numericLockerId = Number(lockerId);

    if (!faceDescriptor || faceDescriptor.length !== 128 || !numericLockerId || !username) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่สมบูรณ์' });
    }

    try {
        const user = await User.findOne({ username });
        const locker = await Locker.findOne({ id: numericLockerId });

        if (!user || !locker) {
            return res.json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }
        if (locker.owner !== username) {
            return res.json({ success: false, message: 'คุณไม่ใช่เจ้าของตู้' });
        }
        if (!user.faceDescriptor || !Array.isArray(user.faceDescriptor) || user.faceDescriptor.length !== 128) {
            return res.json({ success: false, message: 'ไม่มีข้อมูลใบหน้าในระบบ' });
        }

        const distance = getEuclideanDistance(faceDescriptor, user.faceDescriptor);

        console.log(`[Verify] User: ${username}, Distance: ${distance.toFixed(4)}, Threshold: ${MATCH_THRESHOLD}`);

        if (distance > MATCH_THRESHOLD) {
            return res.json({ success: false, message: 'ใบหน้าไม่ชัดเจน หรือไม่เหมือนตัวจริง' });
        }

        await Locker.updateOne({ id: numericLockerId }, { status: 'available', owner: null });

        if (mqttClient.connected) {
            const payload = JSON.stringify({
                id: numericLockerId,
                username: username,
                action: 'RETURN'
            });
            mqttClient.publish('locker/control', payload);
            console.log(`📡 MQTT: สั่งเปิดตู้ ${numericLockerId} โดย ${username} (Return)`);
        }

        return res.json({ success: true, message: 'ยืนยันและคืนตู้สำเร็จ' });

    } catch (error) {
        console.error("Return Face Verify Error:", error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายใน Server' });
    }
});

app.post('/login-face', async (req, res) => {
    const { faceDescriptor } = req.body;
    try {
        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ success: false, message: 'Invalid face descriptor' });
        }

        const allUsers = await User.find({ "faceDescriptor.0": { $exists: true } }).select('-password');
        let bestMatch = null;
        let minDistance = MATCH_THRESHOLD;

        for (const user of allUsers) {
            if (!Array.isArray(user.faceDescriptor) || user.faceDescriptor.length !== 128) continue;
            const distance = getEuclideanDistance(faceDescriptor, user.faceDescriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = user;
            }
        }

        if (bestMatch) {
            console.log(`[Login Face] Match found: ${bestMatch.username}, Distance: ${minDistance.toFixed(4)}`);
            res.json({ success: true, message: `ยินดีต้อนรับคุณ ${bestMatch.name || bestMatch.username}`, user: bestMatch });
        } else {
            res.json({ success: false, message: 'ไม่พบข้อมูลใบหน้า หรือหน้าไม่ชัดเจน' });
        }
    } catch (error) {
        console.error('Login face error:', error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาดภายใน Server' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});