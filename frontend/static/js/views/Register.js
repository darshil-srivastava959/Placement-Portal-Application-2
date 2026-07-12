// views/Register.js
import { ref } from 'vue';
import { http, errMsg } from '../store.js';
import AppAlert from '../components/AppAlert.js';

export default {
  components: { AppAlert },
  setup() {
    const role = ref('student');
    const name = ref(''), email = ref(''), password = ref('');
    const branch = ref(''), cgpa = ref(''), grad_year = ref('');
    const description = ref('');
    const error = ref(''), success = ref('');

    async function submit() {
      error.value = ''; success.value = '';
      const data = { role: role.value, name: name.value, email: email.value, password: password.value };
      if (role.value === 'student') {
        data.branch   = branch.value;
        data.cgpa     = cgpa.value ? parseFloat(cgpa.value) : null;
        data.grad_year = grad_year.value ? parseInt(grad_year.value) : null;
      } else {
        data.description = description.value;
      }
      try {
        const r = await http.post('/register', data);
        success.value = r.data.message;
      } catch(e) { error.value = errMsg(e); }
    }
    return { role, name, email, password, branch, cgpa, grad_year, description, error, success, submit };
  },
  template: `
    <div class="container py-5" style="max-width:460px">
      <h4 class="mb-3">Register</h4>
      <app-alert :msg="error" />
      <app-alert :msg="success" type="success" />
      <form @submit.prevent="submit">
        <div class="mb-2">
          <label class="form-label">I am a</label>
          <select class="form-select" v-model="role">
            <option value="student">Student</option>
            <option value="company">Company</option>
          </select>
        </div>
        <div class="mb-2">
          <label class="form-label">{{ role === 'student' ? 'Full name' : 'Company name' }}</label>
          <input class="form-control" v-model="name" required />
        </div>
        <div class="mb-2">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" v-model="email" required />
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" type="password" v-model="password" required />
        </div>
        <template v-if="role==='student'">
          <div class="row g-2 mb-3">
            <div class="col"><label class="form-label">Branch</label><input class="form-control" v-model="branch" /></div>
            <div class="col"><label class="form-label">CGPA</label><input class="form-control" type="number" step="0.01" v-model="cgpa" /></div>
            <div class="col"><label class="form-label">Grad Year</label><input class="form-control" type="number" v-model="grad_year" /></div>
          </div>
        </template>
        <template v-else>
          <div class="mb-3">
            <label class="form-label">About company</label>
            <textarea class="form-control" rows="3" v-model="description"></textarea>
          </div>
          <div class="alert alert-info small py-2">Companies require admin approval before logging in.</div>
        </template>
        <button class="btn btn-dark w-100">Register</button>
      </form>
      <p class="text-center mt-3 small"><router-link to="/login">Back to login</router-link></p>
    </div>`
};
