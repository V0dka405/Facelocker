import React, { useRef, useState, useEffect, useCallback } from 'react'; // 👈 บรรทัดนี้สำคัญมาก ต้องมีครบ
import Webcam from 'react-webcam';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as faceapi from 'face-api.js';

function ReturnFaceScan() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    
    const { id: lockerId } = useParams(); 
    const location = useLocation();
    const username = location.state?.username;

    const navigate = useNavigate();

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [statusText, setStatusText] = useState("กำลังโหลด AI...");
    const [isProcessing, setIsProcessing] = useState(false);
    const isProcessingRef = useRef(false); // ใช้ ref เป็น source of truth ป้องกัน interval ซ้อน

    // ตั้งค่ากล้องเป็นแนวตั้งเพื่อให้เหมาะกับกรอบวงรี
    const videoConstraints = { 
        facingMode: "user",
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
    };

    // ---------- 1. โหลดโมเดล ----------
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models'; 
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setStatusText("ระบบกำลังสแกนหน้าอัตโนมัติ... กรุณามองกล้อง");
            } catch (err) {
                console.error("Load model error:", err);
                setStatusText("โหลด AI ไม่สำเร็จ ❌");
            }
        };
        loadModels();
    }, []);

    // ---------- 2. ฟังก์ชันส่งข้อมูลไปยืนยัน ----------
    const verifyAndReturn = useCallback(async (descriptor) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);
        setStatusText("⚡ พบใบหน้า! กำลังยืนยันและคืนตู้...");

        try {
            const res = await axios.post('http://localhost:8001/return-face-verify', {
                lockerId: parseInt(lockerId),
                faceDescriptor: descriptor,
                username: username 
            });

            if (res.data.success) {
                setStatusText(`✅ คืนตู้ ${lockerId} สำเร็จ! ประตูจะเปิดออก`);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 500); 
            } else {
                setStatusText(`❌ ไม่ผ่าน: ${res.data.message}`);
                setTimeout(() => {
                    isProcessingRef.current = false;
                    setIsProcessing(false);
                    setStatusText("ระบบกำลังสแกนหน้าอัตโนมัติ... กรุณามองกล้อง");
                }, 2000); 
            }
        } catch (err) {
            console.error("Return error:", err);
            setStatusText("❌ เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
            setTimeout(() => {
                isProcessingRef.current = false;
                setIsProcessing(false);
                setStatusText("ระบบกำลังสแกนหน้าอัตโนมัติ... กรุณามองกล้อง");
            }, 2000);
        }
    }, [lockerId, username, navigate]);


    // ---------- 3. Auto Scan Loop (ทำงานตลอดเวลา) ----------
    useEffect(() => {
        // Loop ตรวจจับหน้าทุกๆ 0.5 วินาที
        const interval = setInterval(async () => {
            // ใช้ ref เช็คแทน state เพื่อไม่ให้ interval สร้างใหม่ทุกครั้ง
            if (!modelsLoaded || isProcessingRef.current) return; 

            const video = webcamRef.current?.video;
            if (!video || video.readyState !== 4 || video.videoWidth === 0) return;

            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            
            if(canvasRef.current) {
                faceapi.matchDimensions(canvasRef.current, displaySize);
            }

            try {
                const detections = await faceapi
                    .detectAllFaces(
                        video, 
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.8 })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0) {
                    const validDetections = detections.filter(det => 
                        det?.detection?.box && det.detection.box.width > 0 && !isNaN(det.detection.box.x)
                    );

                    if (validDetections.length > 0) {
                        const resized = faceapi.resizeResults(validDetections, displaySize);
                        const valid = resized[0];

                        if (valid && valid.descriptor) {
                            verifyAndReturn(Array.from(valid.descriptor));
                        }
                    }
                }
            } catch (err) {
                // Detection skip
            }

        }, 500);

        return () => clearInterval(interval);
    }, [modelsLoaded, verifyAndReturn]);


    if (!username) {
        return <div className="container"><h1>Error: No Username Data</h1></div>;
    }

    return (
        <div className="container" style={{ width: "500px", textAlign: 'center', marginTop: '20px' }}>
            <h1>คืนตู้ {lockerId} (สแกนหน้า)</h1>
            <p>ผู้ใช้งาน: {username}</p>

            {/* กรอบวงรีแนวตั้ง */}
            <div 
                style={{ 
                    position: "relative", 
                    width: "300px",
                    height: "400px",
                    margin: "0 auto 20px auto", 
                    borderRadius: "50%", // ทำเป็นวงรี
                    overflow: "hidden", // ซ่อนส่วนเกินนอกวงรี
                    border: isProcessing ? '5px solid #00FF00' : '3px solid #FFC107', // เปลี่ยนสีขอบเมื่อเจอหน้า
                    backgroundColor: '#000',
                    transition: 'border 0.3s ease'
                }}
            >
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    videoConstraints={videoConstraints}
                    style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover", // ขยายวิดีโอให้เต็มพื้นที่วงรี
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1
                    }}
                />
                <canvas
                    ref={canvasRef}
                    style={{ 
                        position: "absolute", 
                        top: 0, 
                        left: 0, 
                        width: "100%", 
                        height: "100%",
                        zIndex: 2
                    }}
                />
            </div>
            
            {/* แสดงสถานะปัจจุบัน */}
            <p style={{ marginTop: "20px", fontSize: "18px", color: isProcessing ? '#00FF00' : '#FFC107', fontWeight: 'bold' }}>
                {statusText}
            </p>

            {/* ปุ่มยกเลิก */}
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    marginTop: "15px",
                    padding: "12px 25px",
                    background: "white",
                    color: "black",
                    borderRadius: "30px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold"
                }}
            >
                ยกเลิก
            </button>
        </div>
    );
}
 
export default ReturnFaceScan;