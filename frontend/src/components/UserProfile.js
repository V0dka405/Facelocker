import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------
// 1. CustomModal Component (นำมาจาก Dashboard เพื่อความสอดคล้อง)
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
                    {/* ปุ่มยกเลิก/ปิด */}
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


function UserProfile() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // สถานะสำหรับจัดการ Modal
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    useEffect(() => {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            navigate('/');
            return;
        }
        fetchUserData(currentUser);
    }, [navigate]);

    const fetchUserData = async (username) => {
        try {
            const res = await axios.get(`http://localhost:8001/user-profile/${username}`);
            if (res.data.success) {
                setUserData(res.data.user);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    // ฟังก์ชันดำเนินการ Logout จริง
    const executeLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/');
    };
    
    // ฟังก์ชันเรียกใช้ Modal แทน window.confirm
    const handleLogout = () => {
        setModalConfig({
            title: 'ออกจากระบบ',
            message: 'คุณต้องการออกจากระบบใช่ไหม?',
            isConfirm: true,
            confirmText: 'ออกจากระบบ',
            cancelText: 'ยกเลิก',
            // เมื่อกด "ออกจากระบบ" ใน Modal จะเรียก executeLogout
            onConfirm: () => {
                setShowModal(false);
                executeLogout();
            },
            // เมื่อกด "ยกเลิก" ใน Modal
            onCancel: () => setShowModal(false) 
        });
        setShowModal(true);
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;
    if (!userData) return <div style={styles.loading}>User not found</div>;

    return (
        <div style={styles.pageContainer}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.avatar}>
                        {userData.username.charAt(0).toUpperCase()}
                    </div>
                    <h1 style={styles.title}>ข้อมูลส่วนตัว</h1>
                    <p style={styles.subtitle}>จัดการบัญชีของคุณ</p>
                </div>

                <div style={styles.infoContainer}>
                    <div style={styles.infoRow}>
                        <div style={styles.infoLabel}>USERNAME</div>
                        <div style={styles.infoValue}>{userData.username}</div>
                    </div>
                    <div style={styles.infoRow}>
                        <div style={styles.infoLabel}>ชื่อ - นามสกุล</div>
                        <div style={styles.infoValue}>{userData.name} {userData.lastname}</div>
                    </div>
                    
                    <div style={{...styles.infoRow, borderBottom: 'none'}}>
                        <div style={styles.infoLabel}>เบอร์โทรศัพท์</div>
                        <div style={styles.infoValue}>{userData.phone}</div>
                    </div>
                </div>

                <div style={styles.buttonGroup}>
                    <button 
                        onClick={() => navigate('/profile-edit')}
                        style={{ ...styles.button, ...styles.btnPrimary }}
                    >
                        แก้ไขข้อมูล
                    </button>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            style={{ ...styles.button, ...styles.btnSecondary }}
                        >
                            กลับหน้าหลัก
                        </button>

                        <button 
                            onClick={handleLogout} // เรียก Modal แทน window.confirm
                            style={{ ...styles.button, ...styles.btnDanger }}
                        >
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </div>
            
            {/* แสดง Custom Modal */}
            <CustomModal show={showModal} config={modalConfig} />
        </div>
    );
}

// ----------------------------------------------------------------------
// 3. Styles
// ----------------------------------------------------------------------

const styles = {
    pageContainer: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        fontFamily: "'Kanit', 'Inter', sans-serif",
    },
    loading: { color: '#fff', fontSize: '24px', textAlign: 'center', marginTop: '100px' },
    card: {
        width: '100%',
        maxWidth: '700px',
        backgroundColor: '#1C1C1E',
        borderRadius: '40px',
        padding: '60px 50px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '20px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
        width: '100%'
    },
    avatar: {
        width: '120px',
        height: '120px',
        backgroundColor: '#2C2C2E',
        color: '#FFD700',
        fontSize: '50px',
        fontWeight: 'bold',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto 25px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        border: '2px solid #333'
    },
    title: {
        color: '#fff',
        fontSize: '36px',
        fontWeight: '700',
        margin: '0 0 10px 0'
    },
    subtitle: {
        color: '#888',
        fontSize: '18px',
        margin: 0
    },
    infoContainer: {
        width: '100%',
        backgroundColor: '#252528',
        borderRadius: '20px',
        padding: '20px 30px',
        marginBottom: '40px'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 0',
        borderBottom: '1px solid #3A3A3C'
    },
    infoLabel: {
        color: '#888',
        fontSize: '16px',
        fontWeight: '500',
        textTransform: 'uppercase'
    },
    infoValue: {
        color: '#fff',
        fontSize: '20px',
        fontWeight: '600',
        textAlign: 'right'
    },
    buttonGroup: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    button: {
        width: '100%',
        padding: '18px',
        borderRadius: '18px',
        border: 'none',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.1s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: '#FFD700',
        color: '#000',
        boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)'
    },
    btnSecondary: {
        backgroundColor: '#333',
        color: '#fff',
        flex: 1
    },
    btnDanger: {
        backgroundColor: '#2a1a1a',
        color: '#FF453A',
        border: '1px solid #4a1a1a',
        flex: 1
    }
};

// Custom Modal Styles (นำมาจาก Dashboard)
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
        justifyContent: 'space-around',
        gap: '15px'
    },
    confirmButton: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: '#FF453A', // สีแดงสำหรับออกจากระบบ
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
        backgroundColor: '#28A745', // สีเขียวสำหรับ OK/Alert
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

export default UserProfile;