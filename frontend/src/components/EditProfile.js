import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------
// 1. CustomModal Component
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


function EditProfile() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        lastname: '',
        phone: '',
        password: ''
    });
    const [currentUsername, setCurrentUsername] = useState('');
    const [loading, setLoading] = useState(true);
    
    // สถานะสำหรับ Modal และ Password Toggle
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    // ฟังก์ชันสำหรับแสดง Alert Modal
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

    useEffect(() => {
        const user = localStorage.getItem('currentUser');
        if (!user) {
            navigate('/');
            return;
        }
        setCurrentUsername(user);
        fetchUserData(user);
    }, [navigate]);

    const fetchUserData = async (username) => {
        try {
            const res = await axios.get(`http://localhost:8001/user-profile/${username}`);
            if (res.data.success) {
                const data = res.data.user;
                setFormData({
                    username: data.username,
                    name: data.name,
                    lastname: data.lastname,
                    phone: data.phone,
                    password: '' 
                });
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password && formData.password.length < 6) {
            showAlert('รหัสผ่านไม่ปลอดภัย', 'รหัสผ่านสั้นเกินไป กรุณาใช้รหัสผ่านอย่างน้อย 6 ตัวอักษร');
            return;
        }

        try {
            const res = await axios.post(`http://localhost:8001/update-profile/${currentUsername}`, formData);
            if (res.data.success) {
                if (currentUsername !== formData.username) {
                    localStorage.setItem('currentUser', formData.username);
                }
                setModalConfig({
                    title: '✅ บันทึกสำเร็จ',
                    message: 'ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว',
                    isConfirm: false,
                    confirmText: 'ตกลง',
                    onConfirm: () => {
                        setShowModal(false);
                        navigate('/profile'); 
                    }
                });
                setShowModal(true);
                
            } else {
                showAlert('อัปเดตล้มเหลว', 'Update failed: ' + res.data.message);
            }
        } catch (error) {
            console.error('Update error:', error);
            showAlert('ข้อผิดพลาดการเชื่อมต่อ', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    };
    
    if (loading) return <div style={styles.loading}>Loading...</div>;

    // ----------------------------------------------------------------------
    // Icon Components (Minimal SVG)
    // ----------------------------------------------------------------------
    const EyeIcon = (props) => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    const EyeOffIcon = (props) => (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
    );

    return (
        <div style={styles.pageContainer}>
            {/* CSS Global Overrides สำหรับซ่อน Native Eye Icon และแก้สี Autofill */}
            <style>
            {`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear {
                    display: none;
                }
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px #2C2C2E inset !important;
                    -webkit-text-fill-color: white !important;
                    caret-color: white;
                }
            `}
            </style>

            <div style={styles.card}>
                <h1 style={styles.title}>แก้ไขข้อมูล</h1>
                <p style={styles.subtitle}>อัปเดตข้อมูลล่าสุดของคุณ</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Username</label>
                        <input 
                            type="text" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleChange} 
                            required 
                            style={styles.input}
                        />
                    </div>

                    {/* ช่องใส่รหัสผ่านพร้อมปุ่ม Toggle แบบ Minimal */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password (Optional)</label>
                        <div style={styles.passwordInputWrapper}>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                placeholder="เปลี่ยนรหัสผ่านใหม่"
                                style={{...styles.input, paddingRight: '45px'}}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(prev => !prev)}
                                style={styles.passwordToggle}
                                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                            >
                                {showPassword ? (
                                    <EyeIcon style={{width: '20px', height: '20px', color: '#fff'}} />
                                ) : (
                                    <EyeOffIcon style={{width: '20px', height: '20px', color: '#666'}} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={styles.row}>
                        <div style={styles.inputGroupHalf}>
                            <label style={styles.label}>ชื่อจริง</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.inputGroupHalf}>
                            <label style={styles.label}>นามสกุล</label>
                            <input 
                                type="text" 
                                name="lastname" 
                                value={formData.lastname} 
                                onChange={handleChange} 
                                required 
                                style={styles.input}
                            />
                        </div>
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>เบอร์โทรศัพท์</label>
                        <input 
                            type="tel" 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            required 
                            style={styles.input}
                        />
                    </div>
                    
                    <div style={styles.buttonGroup}>
                        <button type="submit" style={{ ...styles.button, ...styles.btnPrimary }}>
                            บันทึกการแก้ไข
                        </button>
                        <button 
                            type="button" 
                            onClick={() => navigate('/profile')} 
                            style={{ ...styles.button, ...styles.btnSecondary }}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
            
            <CustomModal show={showModal} config={modalConfig} />
        </div>
    );
}

// ----------------------------------------------------------------------
// 4. Styles
// ----------------------------------------------------------------------

const styles = {
    pageContainer: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        fontFamily: "'Inter', sans-serif",
    },
    loading: { color: '#fff', textAlign: 'center', marginTop: '50px' },
    card: {
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#1C1C1E',
        borderRadius: '32px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        margin: '20px'
    },
    title: {
        color: '#fff',
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '5px',
        textAlign: 'center'
    },
    subtitle: {
        color: '#666',
        fontSize: '14px',
        marginBottom: '30px',
        textAlign: 'center'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    row: {
        display: 'flex',
        gap: '15px'
    },
    inputGroupHalf: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1
    },
    label: {
        color: '#888',
        fontSize: '13px',
        fontWeight: '500',
        marginLeft: '5px'
    },
    input: {
        width: '100%',
        padding: '16px 20px',
        borderRadius: '16px',
        border: 'none',
        backgroundColor: '#2C2C2E', 
        color: '#fff',
        fontSize: '16px',
        outline: 'none',
        transition: 'box-shadow 0.2s',
        boxSizing: 'border-box'
    },
    
    // ** Styles for Password Toggle **
    passwordInputWrapper: {
        position: 'relative',
        width: '100%',
    },
    passwordToggle: {
        position: 'absolute',
        right: '15px', // ขยับเข้ามาอีกนิดให้ดูสมดุล
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent', // แน่ใจว่าโปร่งใส
        border: 'none',
        outline: 'none', // ลบเส้นขอบเวลาคลิก
        cursor: 'pointer',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },

    buttonGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginTop: '20px'
    },
    button: {
        width: '100%',
        padding: '16px',
        borderRadius: '16px',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'transform 0.1s ease',
    },
    btnPrimary: {
        backgroundColor: '#FFD700',
        color: '#000',
        boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
    },
    btnSecondary: {
        backgroundColor: 'transparent',
        color: '#888',
        border: '1px solid #333'
    }
};

// Custom Modal Styles
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
        backgroundColor: '#FFD700',
        color: '#000',
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

export default EditProfile;