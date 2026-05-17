// Runtime environment configuration
// This file is replaced by Docker at runtime via the entrypoint script.
// The value below is only used if the script fails (should never happen in production).
window.ENV = window.ENV || {
	VITE_API_URL: 'https://gdb.davidhormigafonso.work/api',
}
