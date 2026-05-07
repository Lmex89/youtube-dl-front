
// src/config.js
const config = {
    // MUST use REACT_APP_ prefix for React to read it
    API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    isProduction: process.env.NODE_ENV === 'production'
}

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
    console.log('Environment Variables:', {
        REACT_APP_API_URL: process.env.REACT_APP_API_URL,
        NODE_ENV: process.env.NODE_ENV
    });
    console.log('Config:', config);
}

export default config;