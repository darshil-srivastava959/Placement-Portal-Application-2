// views/Login.js
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { http, saveSession, errMsg } from '../store.js';
import AppAlert from '../components/AppAlert.js';

export default {
  components: { AppAlert },
  setup() {
    const router = useRouter();
    const role = ref('student'), email = ref(''), password = ref(''), error = ref('');

    async function submit() {
      error.value = '';
      try {
        const r = await http.post('/login', { role: role.value, email: email.value, password: password.value });
        saveSession(r.data.access_token, r.data.role, r.data.user);
        router.push('/' + r.data.role);
      } catch(e) { error.value = errMsg(e); }
    }
    return { role, email, password, error, submit };
  },
  template: `
    <div class="container py-5" style="max-width:400px">
      <h4 class="mb-3">Log in</h4>
      <app-alert :msg="error" />
      <form @submit.prevent="submit">
        <div class="mb-2">
          <label class="form-label">Role</label>
          <select class="form-select" v-model="role">
            <option value="student">Student</option>
            <option value="company">Company</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="mb-2">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" v-model="email" required />
          <small v-if="role==='admin'" class="text-muted"></small>
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" type="password" v-model="password" required />
          <small v-if="role==='admin'" class="text-muted"></small>
        </div>
        <button class="btn btn-dark w-100">Log in</button>
      </form>
      <p class="text-center mt-3 small" v-if="role!=='admin'">
        No account? <router-link to="/register">Register</router-link>
      </p>
    </div>`
};
