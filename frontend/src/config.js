// Central API Configuration
// Allows dynamic resolution for local development, Docker, and LAN access (e.g. testing with mobile webcam)
export const API_URL = 
  process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname 
    ? `http://${window.location.hostname}:8001` 
    : 'http://localhost:8001');

export default API_URL;
