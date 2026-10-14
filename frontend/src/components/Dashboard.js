import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './Dashboard.css';

// ----------------------------------------------------------------------
// 1. Payment Modal Component
// ----------------------------------------------------------------------
const PaymentModal = ({ show, onClose, onPaymentSuccess }) => {
    const [qrImage, setQrImage] = useState(null);
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (show) {
            setLoading(true);
            setErrorMsg(null);
            axios.post(`${API_URL}/generate-qr`)
                .then(res => {
                    if (res.data.success) {
                        setQrImage(res.data.qrImage);
                        setAmount(res.data.amount);
                    } else {
                        setErrorMsg(res.data.message || 'สร้าง QR ไม่สำเร็จ');
                    }
                })
                .catch(err => {
                    console.error("QR Error", err);
                    setErrorMsg('ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อสร้าง QR Code');
                })
                .finally(() => setLoading(false));
        }
    }, [show]);

    if (!show) return null;

    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.paymentModal}>
                <h3 style={modalStyles.title}>📲 สแกนจ่ายเพื่อจอง</h3>
                
                {loading ? (
                    <p style={{color: '#fff'}}>กำลังสร้าง QR Code...</p>
                ) : errorMsg ? (
                    <p style={{color: '#FF5252', padding: '20px 0'}}>{errorMsg}</p>
                ) : (
                    <>
                        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '10px', margin: '20px auto', width: 'fit-content' }}>
                            {/* ตรวจสอบว่า qrImage เป็น string ก่อนแสดงผล */}
                            {qrImage && typeof qrImage === 'string' && (
                                <img src={qrImage} alt="PromptPay QR" style={{ width: '200px', height: '200px' }} />
                            )}
                        </div>
                        <p style={{ color: '#FFD700', fontSize: '24px', fontWeight: 'bold' }}>
                            ยอดชำระ: {Number(amount).toFixed(2)} บาท
                        </p>
                        <p style={{ color: '#ccc', fontSize: '14px' }}>
                            (กรุณาสแกนด้วยแอปธนาคาร แล้วกดปุ่มด้านล่าง)
                        </p>
                    </>
                )}

                <div style={modalStyles.actions}>
                    <button onClick={onClose} style={modalStyles.cancelButton}>ยกเลิก</button>
                    
                    <button 
                        onClick={onPaymentSuccess} 
                        style={modalStyles.confirmButton}
                        disabled={loading}
                    >
                        ✅ ชำระเงินเรียบร้อย
                    </button>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. CustomModal Component
// ----------------------------------------------------------------------
const CustomModal = ({ show, config }) => {
    if (!show) return null;

    const { 
        title = 'แจ้งเตือน', 
        message = '', 
        isConfirm = false, 
        onConfirm, 
        onCancel, 
        confirmText = 'ตกลง', 
        cancelText = 'ยกเลิก' 
    } = config || {};

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
    };

    return (
        <div style={modalStyles.backdrop}>
            <div style={modalStyles.modal}>
                <h3 style={modalStyles.title}>{title}</h3>
                <p style={modalStyles.message}>
                    {typeof message === 'object' ? JSON.stringify(message) : message}
                </p>
                
                <div style={modalStyles.actions}>
                    {isConfirm && (
                        <button onClick={handleCancel} style={modalStyles.cancelButton}>
                            {cancelText}
                        </button>
                    )}
                    
                    <button 
                        onClick={handleConfirm} 
                        style={isConfirm ? modalStyles.confirmButton : modalStyles.alertButton}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. Dashboard Component (Main Logic)
// ----------------------------------------------------------------------
function Dashboard() {
    const [lockers, setLockers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null); 
    const [myLocker, setMyLocker] = useState(null); 
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [showPayment, setShowPayment] = useState(false);
    const [selectedLockerId, setSelectedLockerId] = useState(null);

    const fetchLockers = useCallback(async (username) => {
        try {
            const res = await axios.get(`${API_URL}/lockers`);
            if (Array.isArray(res.data)) {
                setLockers(res.data);
                const userLocker = res.data.find(locker => locker.owner === username);
                setMyLocker(userLocker);
            }
        } catch (err) {
            console.error('Error fetching lockers:', err);
        }
    }, []);
    
    useEffect(() => {
        const user = localStorage.getItem('currentUser');
        if (!user) {
            navigate('/'); 
        } else {
            setCurrentUser(user);
            fetchLockers(user); 
        }
        
        const interval = setInterval(() => {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) fetchLockers(storedUser);
        }, 2000);
        
        return () => clearInterval(interval);
    }, [navigate, fetchLockers]); 

    const handleBooking = (lockerId) => {
        if(myLocker) {
            setModalConfig({
                title: '❌ จองไม่ได้',
                message: `คุณจองตู้ ${myLocker.id} อยู่แล้ว!`,
                isConfirm: false,
                confirmText: 'รับทราบ',
                onConfirm: () => setShowModal(false)
            });
            setShowModal(true);
            return;
        }
        setSelectedLockerId(lockerId);
        setShowPayment(true);
    };

    const handlePaymentSuccess = async () => {
        setShowPayment(false);
        executeBooking(selectedLockerId);
    };

    const executeBooking = async (lockerId) => {
        setShowModal(false);
        try {
            const res = await axios.post(`${API_URL}/book`, {
                lockerId: lockerId,
                username: currentUser
            });
            
            if (res.data.success) {
                fetchLockers(currentUser);
                setModalConfig({
                    title: '✅ จองสำเร็จ',
                    message: `ขอบคุณที่ใช้บริการ! ตู้หมายเลข ${lockerId} เปิดแล้ว`,
                    isConfirm: false,
                    confirmText: 'ตกลง',
                    onConfirm: () => setShowModal(false)
                });
                setShowModal(true);
            } else {
                setModalConfig({
                    title: '❌ จองไม่สำเร็จ',
                    message: typeof res.data.message === 'string' ? res.data.message : 'เกิดข้อผิดพลาดในการจอง',
                    isConfirm: false,
                    confirmText: 'ตกลง',
                    onConfirm: () => setShowModal(false)
                });
                setShowModal(true);
            }
        } catch (err) {
            setModalConfig({
                title: '❌ เกิดข้อผิดพลาด',
                message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
                isConfirm: false,
                confirmText: 'ตกลง',
                onConfirm: () => setShowModal(false)
            });
            setShowModal(true);
        }
    };
    
    const handleReturnScan = () => {
        if (!myLocker) return; 
        navigate(`/return-scan/${myLocker.id}`, { state: { username: currentUser } });
    };
    
    const handleViewProfile = () => {
        navigate('/profile'); 
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-content"> 
                
                {/* Header Section */}
                <header className="dashboard-header">
                    <div>
                        <h2 className="dashboard-title">Locker Service</h2>
                        <p className="dashboard-welcome">สวัสดี, {currentUser}</p>
                    </div>
                    
                    <button 
                        onClick={handleViewProfile} 
                        className="dashboard-profile-btn"
                    >
                        <span>👤</span> ข้อมูลส่วนตัว
                    </button>
                </header>

                {/* Active Locker Section */}
                {myLocker && (
                    <div className="dashboard-active-card">
                        <div className="active-info">
                            <div className="active-label">
                                <span style={{fontSize: '22px'}}>🔒</span> คุณกำลังใช้งาน
                            </div>
                            <div className="active-number">ตู้ {myLocker.id}</div>
                        </div>
                        
                        <button 
                            onClick={handleReturnScan}
                            className="return-button"
                        >
                            สแกนหน้าเพื่อปลดล็อกตู้
                        </button>
                    </div>
                )}
                
                {/* Lockers Grid */}
                <div className="lockers-grid">
                    {Array.isArray(lockers) && lockers
                        .filter(locker => !myLocker || myLocker.id !== locker.id)
                        .sort((a, b) => a.id - b.id)
                        .map((locker) => (
                            <div 
                                key={locker.id} 
                                className={`locker-card ${locker.status}`}
                            >
                                <div className="locker-header">
                                    <span className="locker-id">{locker.id}</span>
                                    <div className={`status-dot ${locker.status}`}></div>
                                </div>

                                <div className="locker-body">
                                    {locker.status === 'available' ? (
                                        <>
                                            <p className="status-text-available">ว่าง</p>
                                            <button 
                                                onClick={() => handleBooking(locker.id)} 
                                                className="book-button"
                                            >
                                                จอง (10฿)
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="status-text-occupied">ไม่ว่าง</p>
                                            <p className="owner-text">โดย: {locker.owner}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    }
                </div>

            </div>
            
            <PaymentModal 
                show={showPayment} 
                onClose={() => setShowPayment(false)} 
                onPaymentSuccess={handlePaymentSuccess} 
            />
            
            <CustomModal show={showModal} config={modalConfig} />
        </div>
    );
}

export default Dashboard;

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
    paymentModal: { 
        backgroundColor: '#1C1C1E',
        borderRadius: '16px',
        padding: '30px',
        width: '100%',
        maxWidth: '400px', 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        border: '1px solid #333'
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