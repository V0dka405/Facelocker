import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Components
import Login from './components/Login';
import Signup from './components/Signup';
import SignupFace from './components/SignupFace';
import LoginFace from './components/LoginFace'; 
import Dashboard from './components/Dashboard'; 
import ReturnFaceScan from './components/ReturnFaceScan'; 
import EditProfile from './components/EditProfile'; // หน้า Form แก้ไข
import UserProfile from './components/UserProfile'; // หน้าแสดงข้อมูลส่วนตัว (View)

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* หน้า Login (หน้าแรก) */}
          <Route path="/" element={<Login />} />
          
          {/* หน้าสมัครสมาชิก */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup-face" element={<SignupFace />} />
          
          {/* เข้าสู่ระบบ */}
          <Route path="/login-face" element={<LoginFace />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 🔑 ส่วนจัดการ Profile */}
          <Route path="/profile" element={<UserProfile />} />      {/* ดูข้อมูล + ปุ่ม Logout/Edit */}
          <Route path="/profile-edit" element={<EditProfile />} /> {/* ฟอร์มแก้ไข */}
          
          {/* คืนตู้ */}
          <Route path="/return-scan/:id" element={<ReturnFaceScan />} />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;