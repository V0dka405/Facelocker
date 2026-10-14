import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';


// ----------------------------------------------------------------------
// 1. CustomModal Component (ใช้แทน alert/confirm)
// ----------------------------------------------------------------------

const CustomModal = ({ show, config }) => {
    if (!show) return null;

    const { title, message, isConfirm, onConfirm, onCancel, confirmText, cancelText } = config;

    // ฟังก์ชันสำหรับเรียกใช้การยืนยันแล้วปิด Modal
    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    // ฟังก์ชันสำหรับเรียกใช้การยกเลิกแล้วปิด Modal
    const handleCancel = () => {
        if (onCancel) onCancel();
    };

    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.modal}>
                <h3 style={modalStyles.title}>{title || 'แจ้งเตือน'}</h3>
                <p style={modalStyles.message}>{message}</p>

                <div style={modalStyles.actions}>
                    {/* ปุ่มยกเลิก/ปิด (แสดงเฉพาะถ้าเป็น Confirm Modal หรือ Alert) */}
                    {isConfirm && (
                        <button
                            onClick={handleCancel}
                            style={modalStyles.cancelButton}
                        >
                            {cancelText || 'ยกเลิก'}
                        </button>
                    )}

                    {/* ปุ่มตกลง/ยืนยัน/ปิด */}
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
// 3. Login Component
// ----------------------------------------------------------------------

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // ✅ สถานะสำหรับ Modal
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    // ฟังก์ชันแสดง Alert/Error ด้วย Modal
    const showAlert = (title, message, navigateTo = null) => {
        setModalConfig({
            title: title,
            message: message,
            isConfirm: false,
            confirmText: 'ตกลง',
            onConfirm: () => {
                setShowModal(false);
                if (navigateTo) {
                    navigate(navigateTo);
                }
            }
        });
        setShowModal(true);
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();

        try {
            // ✅ ใช้ API_URL
            const response = await axios.post(`${API_URL}/login`, {
                username,
                password
            });

            if (response.data.success) {
                localStorage.setItem('currentUser', response.data.user.username);

                // ❌ แทนที่ alert ด้วย Modal
                showAlert(
                    '✅ เข้าสู่ระบบสำเร็จ',
                    'ยินดีต้อนรับคุณ ' + response.data.user.username,
                    '/dashboard' // กำหนดให้ไปหน้า dashboard หลังกดตกลง
                );

            } else {
                // ❌ แทนที่ alert ด้วย Modal
                showAlert('❌ เข้าสู่ระบบไม่สำเร็จ', response.data.message);
            }
        } catch (error) {
            // ❌ แทนที่ alert ด้วย Modal
            showAlert('❌ ข้อผิดพลาดการเชื่อมต่อ', 'ไม่สามารถติดต่อ Server ได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    return (
        <div className="container">
            <h1>LOGIN</h1>

            <form onSubmit={handleLogin}>
                <div className="input-group">
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {/* ปุ่ม Confirm เดิม */}
                <button type="submit" className="btn-confirm">Confirm</button>

                {/* ✅ เพิ่ม: ปุ่ม Login with Face */}
                <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => navigate('/login-face')}
                    style={{
                        marginTop: '15px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: '1px solid #555'
                    }}
                >
                    Login with Face 📷
                </button>

            </form>

            <p className="link-text" onClick={() => navigate('/signup')}>
                ยังไม่มีบัญชี? สมัครสมาชิก
            </p>

            {/* ✅ แสดง Modal */}
            <CustomModal show={showModal} config={modalConfig} />
        </div>
    );
}

// ----------------------------------------------------------------------
// 4. Styles (สำหรับ Modal)
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
        justifyContent: 'center', // จัดให้อยู่ตรงกลาง
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

export default Login;