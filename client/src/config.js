// Central place for all environment URLs.
//
// In production (Vite build) the client is served by the SAME Express server
// (single Render web service), so we use relative URLs — the app works on any
// domain without rebuilding. You can still force a specific backend with the
// VITE_API_URL / VITE_SOCKET_URL build-time env vars (e.g. a split Vercel +
// Render setup).
const isProduction = import.meta.env.PROD;

const explicitApi = import.meta.env.VITE_API_URL;
const explicitSocket = import.meta.env.VITE_SOCKET_URL;

export const API_URL = explicitApi || (isProduction ? '' : 'http://localhost:5000');
export const SOCKET_URL = explicitSocket || (isProduction ? undefined : 'http://localhost:5000');
export const CLIENT_URL = isProduction ? '' : 'http://localhost:5173';