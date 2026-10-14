import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { API_URL } from '../config';

function SignupFace() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // สำหรับแสดง error/success แทน alert()
  const [isCapturedState, setIsCapturedState] = useState(false); // state สำหรับ trigger re-render UI
  
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const isMounted = useRef(true);
  const intervalRef = useRef(null); // Ref for interval ID
  const isCaptured = useRef(false); // Flag to ensure capture runs once

  useEffect(() => {
    isMounted.current = true;
    console.log("🚀 VERSION: AUTO-CAPTURE (Cleaned)"); 
    return () => {
      isMounted.current = false;
      // Clear interval when component is unmounted
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const videoConstraints = {
    width: 400,
    height: 300,
    facingMode: "user"
  };

  // --- Helper: Check Box Validity ---
  const isValidBox = (box) => {
    if (!box) return false;
    const { x, y, width, height } = box;
    if (
      typeof x !== 'number' || typeof y !== 'number' ||
      typeof width !== 'number' || typeof height !== 'number'
    ) return false;
    if (
      !Number.isFinite(x) || !Number.isFinite(y) ||
      !Number.isFinite(width) || !Number.isFinite(height)
    ) return false;
    if (width <= 0 || height <= 0) return false;
    return true;
  };

  // --- Load Models ---
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (isMounted.current) {
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error("Load model error:", err);
      }
    };
    loadModels();
  }, []);

  // --- Auto-Confirm Function ---
  const handleConfirm = useCallback(async (descriptor) => {
    if (!descriptor) {
      if (isMounted.current) setStatusMessage("❌ ไม่พบข้อมูลใบหน้า");
      isCaptured.current = false;
      setIsCapturedState(false);
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/register-face`, {
        username: username,
        faceDescriptor: descriptor
      });

      if (res.data.success) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (isMounted.current) {
          setStatusMessage("✅ บันทึกใบหน้าสำเร็จ!");
          setTimeout(() => navigate("/"), 1000);
        }
      } else {
        if (isMounted.current) {
          setStatusMessage("❌ " + res.data.message);
          // รีเซ็ตให้ลองใหม่ได้หลัง 2 วินาที
          setTimeout(() => {
            isCaptured.current = false;
            setIsCapturedState(false);
            setStatusMessage(null);
          }, 2000);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setStatusMessage("❌ เชื่อมต่อ Server ไม่ได้");
        setTimeout(() => {
          isCaptured.current = false;
          setIsCapturedState(false);
          setStatusMessage(null);
        }, 2000);
      }
    }
  }, [username, navigate]);

  // --- Main Detection Loop ---
  const handleVideoOnPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isCaptured.current) return;

    intervalRef.current = setInterval(async () => {
      if (!modelsLoaded || isCaptured.current) return; 

      if (
        !isMounted.current ||
        !webcamRef.current ||
        !webcamRef.current.video ||
        !canvasRef.current
      ) return;

      const video = webcamRef.current.video;
      const canvas = canvasRef.current;

      if (video.readyState !== 4 || video.videoWidth <= 0) return;

      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };

      try {
        faceapi.matchDimensions(canvas, displaySize);
      } catch (err) { return; }

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!isMounted.current) return;

        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!detections || detections.length === 0) {
          setFaceDetected(false);
          return;
        }

        const validDetections = detections.filter(det => 
          det && det.detection && isValidBox(det.detection.box)
        );

        if (validDetections.length === 0) {
          setFaceDetected(false);
          return;
        }
        
        const validFace = validDetections[0];

        if (!validFace || !isValidBox(validFace.detection.box)) {
            setFaceDetected(false);
            return;
        }
        
        setFaceDetected(true);
        const descriptor = Array.from(validFace.descriptor);

        // --- 🚨 AUTO-CAPTURE LOGIC 🚨 ---
        if (descriptor && descriptor.length > 0 && !isCaptured.current) {
            isCaptured.current = true; // Set flag to prevent double capture
            setIsCapturedState(true); // trigger re-render
            
            // Call Confirm function immediately with the descriptor
            handleConfirm(descriptor);
        }

      } catch (err) {
        if (isMounted.current) setFaceDetected(false);
      }
    }, 500);
  };

  if (!username) {
    return (
      <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '15px' }}>ไม่พบข้อมูลผู้ใช้งาน</h2>
        <p style={{ color: '#aaa', marginBottom: '20px' }}>กรุณากรอกข้อมูลสมัครสมาชิกก่อนลงทะเบียนใบหน้า</p>
        <button 
          onClick={() => navigate('/signup')}
          className="btn-confirm"
          style={{ width: '220px' }}
        >
          กลับไปหน้าสมัคร
        </button>
      </div>
    );
  }
  
  // Color logic for border
  const primaryBorderColor = isCapturedState ? '#4CAF50' : faceDetected ? '#00FF00' : '#FFD700'; 
  
  // Status text logic
  let mainStatusText = "⏳ กำลังโหลดระบบ...";
  if (isCapturedState) {
      mainStatusText = "⏳ กำลังบันทึกข้อมูล..."
  } else if (modelsLoaded) {
      mainStatusText = faceDetected 
        ? "✅ พบใบหน้าแล้ว" 
        : "🔍 กรุณามองกล้อง";
  }

  return (
    <div style={{ 
        backgroundColor: '#000', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>ลงทะเบียนใบหน้า</h1>
      <h3 style={{ marginBottom: '20px', color: '#ccc' }}>ผู้ใช้งาน: {username}</h3>
      
      {/* Camera Container (Oval) */}
      <div style={{ 
          position: "relative", 
          width: "300px", 
          height: "400px", 
          borderRadius: "50%", 
          border: `4px solid ${primaryBorderColor}`, 
          overflow: "hidden", 
          boxShadow: `0 0 20px ${primaryBorderColor}30`,
          marginBottom: '40px',
          backgroundColor: '#222'
      }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              transform: "scaleX(-1)" 
          }}
          onUserMedia={handleVideoOnPlay}
        />
        <canvas
          ref={canvasRef}
          style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              width: "100%", 
              height: "100%",
              transform: "scaleX(-1)" 
          }}
        />
      </div>

      {/* Status Text */}
      <p style={{ 
          textAlign: 'center', 
          color: primaryBorderColor, 
          fontWeight: 'bold', 
          fontSize: '18px',
          margin: '0 0 20px 0' 
      }}>
        {mainStatusText}
      </p>

      {/* Error/Success Message (แทน alert) */}
      {statusMessage && (
        <p style={{ 
            textAlign: 'center', 
            color: statusMessage.startsWith('✅') ? '#4CAF50' : '#FF5252',
            fontWeight: 'bold', 
            fontSize: '16px',
            margin: '0 0 15px 0' 
        }}>
          {statusMessage}
        </p>
      )}

      {/* Placeholder for status while capturing */}
      {isCapturedState ? (
        <div style={{ padding: "12px 30px", borderRadius: "30px", border: "none", fontSize: "18px", backgroundColor: "#555", color: "#aaa", fontWeight: 'bold' }}>
          กำลังส่งข้อมูล...
        </div>
      ) : (
        <div style={{ padding: "12px 30px", borderRadius: "30px", border: "none", fontSize: "18px", backgroundColor: faceDetected ? "#FFD700" : "#555", color: faceDetected ? "#000" : "#aaa", fontWeight: 'bold' }}>
           {faceDetected ? "พบใบหน้าแล้ว! (Auto-Capture)" : "รอการตรวจจับใบหน้า"}
        </div>
      )}

      <p 
        onClick={() => navigate('/signup')}
        style={{ marginTop: '20px', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
      >
         ย้อนกลับ
      </p>
    </div>
  );
}

export default SignupFace;