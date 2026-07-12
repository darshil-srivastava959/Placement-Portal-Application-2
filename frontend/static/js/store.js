// store.js — auth state + axios instance shared across all views
import { reactive } from 'vue';
import axios from 'axios';

// ── Auth store ─────────────────────────────────────────────
export const auth = reactive({
  token: localStorage.getItem('ppa_token') || null,
  role:  localStorage.getItem('ppa_role')  || null,
  user:  JSON.parse(localStorage.getItem('ppa_user') || 'null'),
});

export function saveSession(token, role, user) {
  auth.token = token;
  auth.role  = role;
  auth.user  = user;
  localStorage.setItem('ppa_token', token);
  localStorage.setItem('ppa_role',  role);
  localStorage.setItem('ppa_user',  JSON.stringify(user));
}

export function clearSession() {
  auth.token = auth.role = auth.user = null;
  ['ppa_token', 'ppa_role', 'ppa_user'].forEach(k => localStorage.removeItem(k));
}

// ── Axios instance ─────────────────────────────────────────
export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use(cfg => {
  if (auth.token) cfg.headers.Authorization = 'Bearer ' + auth.token;
  return cfg;
});

http.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      clearSession();
      window.location.hash = '#/login';   // avoid circular import with router
    }
    return Promise.reject(err);
  }
);

export const errMsg = e => e.response?.data?.error || 'Something went wrong';
