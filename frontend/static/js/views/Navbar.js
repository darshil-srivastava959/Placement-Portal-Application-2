// views/Navbar.js
import { auth, clearSession } from '../store.js';

export default {
  setup() {
    function logout() {
      clearSession();
      window.location.hash = '#/login';
    }
    return { auth, logout };
  },
  template: `
    <nav class="navbar bg-white border-bottom px-3">
      <span class="navbar-brand fw-semibold">Placement Portal</span>
      <div class="ms-auto d-flex align-items-center gap-2">
        <span v-if="auth.role" class="badge bg-secondary text-capitalize">{{ auth.role }}</span>
        <span v-if="auth.user" class="small text-muted">{{ auth.user.name || auth.user.email }}</span>
        <button v-if="auth.role" class="btn btn-sm btn-outline-secondary" @click="logout">Log out</button>
      </div>
    </nav>`
};
