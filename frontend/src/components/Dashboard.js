import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ✅ กำหนด API URL กลาง
const API_URL = 'http://localhost:8001'; 

// ----------------------------------------------------------------------
// 1. Payment Modal Component
// ----------------------------------------------------------------------
const PaymentModal = ({ show, onClose, onPaymentSuccess }) => {
    const [qrImage, setQrImage] = useState(null);
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (show) {
            setLoading(true);
            axios.post(`${API_URL}/generate-qr`)
                .then(res => {
                    if (res.data.success) {
                        setQrImage(res.data.qrImage);
                        setAmount(res.data.amount);
                    }
                })
                .catch(err => console.error("QR Error", err))
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
        <div style={styles.pageContainer}>
            {/* ✅ แก้ไข: เพิ่ม <div ...> ตรงนี้ */}
            <div style={styles.contentWrapper}> 
                
                {/* Header Section */}
                <header style={styles.header}>
                    <div>
                        <h2 style={styles.appTitle}>Locker Service</h2>
                        <p style={styles.welcomeText}>สวัสดี, {currentUser}</p>
                    </div>
                    
                    <button 
                        onClick={handleViewProfile} 
                        style={styles.profileButton}
                    >
                        <span style={{marginRight: '8px'}}>👤</span> ข้อมูลส่วนตัว
                    </button>
                </header>

                {/* Active Locker Section */}
                {myLocker && (
                    <div style={styles.activeCard}>
                        <div style={styles.activeInfo}>
                            <div style={styles.activeLabel}>
                                <span style={{fontSize: '24px'}}>🔒</span> คุณกำลังใช้งาน
                            </div>
                            <div style={styles.activeNumber}>ตู้ {myLocker.id}</div>
                        </div>
                        
                        <button 
                            onClick={handleReturnScan}
                            style={styles.returnButton}
                        >
                            สแกนหน้าเพื่อปลดล็อกตู้
                        </button>
                    </div>
                )}
                
                {/* Lockers Grid */}
                <div style={styles.gridContainer}>
                    {Array.isArray(lockers) && lockers
                        .filter(locker => !myLocker || myLocker.id !== locker.id)
                        .sort((a, b) => a.id - b.id)
                        .map((locker) => (
                            <div key={locker.id} style={styles.lockerCard(locker.status)}>
                                <div style={styles.lockerHeader}>
                                    <span style={styles.lockerId}>{locker.id}</span>
                                    <div style={styles.statusDot(locker.status)}></div>
                                </div>

                                <div style={styles.lockerBody}>
                                    {locker.status === 'available' ? (
                                        <>
                                            <p style={styles.statusTextAvailable}>ว่าง</p>
                                            <button 
                                                onClick={() => handleBooking(locker.id)} 
                                                style={styles.bookButton}
                                            >
                                                จอง (10฿)
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p style={styles.statusTextOccupied}>ไม่ว่าง</p>
                                            <p style={styles.ownerText}>โดย: {locker.owner}</p>
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

// ----------------------------------------------------------------------
// ✅ แก้ไข: ลบ Router ที่ซ้อนกันออก และ Export Dashboard โดยตรง
// ----------------------------------------------------------------------
export default Dashboard;

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------
const styles = {
    pageContainer: {
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: '#000000', 
        fontFamily: "'Kanit', 'Inter', sans-serif",
        color: '#fff',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center', 
        padding: '0', 
        position: 'absolute', 
        top: 0,
        left: 0,
        overflowX: 'hidden'
    },
    contentWrapper: {
        width: '100%',
        maxWidth: '1200px',
        padding: '40px',
        boxSizing: 'border-box',
        margin: '0 auto', 
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        borderBottom: '1px solid #222',
        paddingBottom: '20px'
    },
    appTitle: {
        fontSize: '28px',
        fontWeight: '700',
        margin: 0,
        background: 'linear-gradient(90deg, #fff, #aaa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    welcomeText: {
        fontSize: '16px',
        color: '#666',
        margin: '5px 0 0 0'
    },
    profileButton: {
        backgroundColor: '#1C1C1E',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '30px',
        padding: '10px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        fontWeight: '500'
    },
    activeCard: {
        background: 'linear-gradient(135deg, #1C1C1E 0%, #252525 100%)',
        borderRadius: '30px',
        padding: '40px',
        marginBottom: '50px',
        border: '2px solid #FFD700', 
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
    },
    activeInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    activeLabel: {
        color: '#FFD700',
        fontSize: '18px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    activeNumber: {
        fontSize: '60px',
        fontWeight: '800',
        lineHeight: 1,
        color: '#fff'
    },
    returnButton: {
        backgroundColor: '#DC3545', 
        color: '#fff',
        border: 'none',
        borderRadius: '20px',
        padding: '15px 40px',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 10px 20px rgba(220, 53, 69, 0.3)',
        transition: 'transform 0.2s'
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 240px))',
        gap: '25px',
        width: '100%',
        justifyContent: 'center',
    },
    lockerCard: (status) => ({
        backgroundColor: '#1C1C1E',
        borderRadius: '24px',
        padding: '25px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px',
        transition: 'transform 0.2s',
        opacity: status === 'available' ? 1 : 0.6, 
        border: status === 'available' ? '1px solid #333' : '1px solid #222'
    }),
    lockerHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    lockerId: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#fff'
    },
    statusDot: (status) => ({
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: status === 'available' ? '#28A745' : '#DC3545',
        boxShadow: status === 'available' ? '0 0 10px #28A745' : 'none'
    }),
    lockerBody: {
        marginTop: '15px'
    },
    statusTextAvailable: {
        color: '#28A745',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '15px'
    },
    statusTextOccupied: {
        color: '#DC3545',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '5px'
    },
    ownerText: {
        color: '#666',
        fontSize: '12px'
    },
    bookButton: {
        width: '100%',
        padding: '12px',
        borderRadius: '16px',
        border: 'none',
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background 0.2s'
    }
};

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