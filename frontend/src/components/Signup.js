import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------
// 1. CustomModal Component (ใช้แทน alert)
// ----------------------------------------------------------------------

const CustomModal = ({ show, config }) => {
    if (!show) return null;

    const { title, message, isConfirm, onConfirm, onCancel, confirmText, cancelText } = config;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
    };

    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.modal}>
                <h3 style={modalStyles.title}>{title || 'แจ้งเตือน'}</h3>
                <p style={modalStyles.message}>{message}</p>
                
                <div style={modalStyles.actions}>
                    {isConfirm && (
                        <button 
                            onClick={handleCancel} 
                            style={modalStyles.cancelButton}
                        >
                            {cancelText || 'ยกเลิก'}
                        </button>
                    )}
                    
                    <button 
                        onClick={handleConfirm} 
                        style={isConfirm ? modalStyles.confirmButton : modalStyles.alertButton}
                    >
                        {confirmText || 'ตกลง'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// 2. Signup Component
// ----------------------------------------------------------------------

function Signup() {
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '',
    name: '', lastname: '', phone: ''
  });
  const navigate = useNavigate();

  // สถานะสำหรับ Modal
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  // ฟังก์ชันแสดง Alert Modal
  const showAlert = (title, message) => {
      setModalConfig({
          title: title,
          message: message,
          isConfirm: false,
          confirmText: 'ตกลง',
          onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    // ป้องกัน Form Refresh หน้าเว็บเมื่อกด Enter
    if (e) e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showAlert('❌ รหัสผ่านไม่ตรงกัน', 'กรุณากรอกรหัสผ่านให้ตรงกันทั้งสองช่อง');
      return;
    }

    try {
      // ส่งเฉพาะ field ที่ backend ต้องการ (ไม่ส่ง confirmPassword)
      const { confirmPassword, ...payload } = formData;
      const response = await axios.post('http://localhost:8001/register', payload);
      
      if (response.data.success) {
        // สมัครเสร็จ -> ส่งไปหน้าสแกนหน้า
        navigate('/signup-face', { state: { username: formData.username } });
      } else {
        showAlert('❌ สมัครไม่สำเร็จ', response.data.message);
      }
    } catch (error) {
      showAlert('❌ เกิดข้อผิดพลาด', error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="container">
      <h1>Sign Up</h1>
      
      {/* ใช้ Form ห่อ input ทั้งหมดเพื่อให้กด Enter ได้ */}
      <form onSubmit={handleSignup}>
        <div className="input-group">
          <label>Name</label>
          <input 
            name="name" 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Last Name</label>
          <input 
            name="lastname" 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Phone</label>
          <input 
            name="phone" 
            onChange={handleChange} 
            required 
          />
        </div>
        
        <div className="input-group">
          <label>Username</label>
          <input 
            name="username" 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input 
            name="password" 
            type="password" 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Confirm Password</label>
          <input 
            name="confirmPassword" 
            type="password" 
            onChange={handleChange} 
            required 
          />
        </div>

        {/* ปุ่ม Submit จะทำงานอัตโนมัติเมื่อกด Enter ในช่องไหนก็ได้ */}
        <button type="submit" className="btn-confirm">Next Step</button>
      </form>

      <p className="link-text" onClick={() => navigate('/')}>Back to Login</p>

      {/* แสดง Modal */}
      <CustomModal show={showModal} config={modalConfig} />
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Modal Styles
// ----------------------------------------------------------------------

const modalStyles = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box'
    },
    modal: {
        backgroundColor: '#1C1C1E',
        borderRadius: '16px',
        padding: '30px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        border: '1px solid #333'
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '15px'
    },
    message: {
        fontSize: '16px',
        color: '#ccc',
        marginBottom: '30px'
    },
    actions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px'
    },
    confirmButton: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#007AFF',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background 0.2s'
    },
    alertButton: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#28A745',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background 0.2s'
    },
    cancelButton: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid #555',
        backgroundColor: 'transparent',
        color: '#ccc',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background 0.2s'
    }
};

export default Signup;