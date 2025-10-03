// Runtime environment configuration
// This file will be replaced by Docker at runtime with actual environment variables
window.ENV = window.ENV || {
  VITE_API_URL: import.meta?.env?.VITE_API_URL || 'http://localhost:8080/api'
};
