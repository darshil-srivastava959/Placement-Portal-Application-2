// views/student/Profile.js
import { reactive, ref, onMounted } from 'vue';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';

export default {
  components: { AppAlert },
  setup() {
    const f = reactive({ name:'', branch:'', cgpa:'', grad_year:'', password:'' });
    const currentResume = ref('');
    const resumeFile   = ref(null);
    const error = ref(''), success = ref('');

    onMounted(async () => {
      const r = await http.get('/me');
      f.name       = r.data.name;
      f.branch     = r.data.branch     || '';
      f.cgpa       = r.data.cgpa       || '';
      f.grad_year  = r.data.grad_year  || '';
      currentResume.value = r.data.resume || '';
    });

    function onFile(e) { resumeFile.value = e.target.files[0] || null; }

    async function submit() {
      error.value = ''; success.value = '';
      const data = {
        name: f.name, branch: f.branch,
        cgpa: parseFloat(f.cgpa) || null,
        grad_year: parseInt(f.grad_year) || null,
      };
      if (f.password) data.password = f.password;
      try {
        await http.put('/student/profile', data);
        if (resumeFile.value) {
          const fd = new FormData();
          fd.append('resume', resumeFile.value);
          await http.post('/student/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        success.value = 'Saved.';
      } catch(e) { error.value = errMsg(e); }
    }

    return { f, currentResume, onFile, error, success, submit };
  },
  template: `
    <div class="container py-4" style="max-width:440px">
      <router-link to="/student" class="text-decoration-none small">&larr; Back</router-link>
      <h4 class="mt-2 mb-3">Edit profile</h4>
      <app-alert :msg="error" />
      <app-alert :msg="success" type="success" />
      <form @submit.prevent="submit">
        <div class="mb-2"><label class="form-label">Name</label><input class="form-control" v-model="f.name" /></div>
        <div class="row g-2 mb-2">
          <div class="col"><label class="form-label">Branch</label><input class="form-control" v-model="f.branch" /></div>
          <div class="col"><label class="form-label">CGPA</label><input class="form-control" type="number" step="0.01" v-model="f.cgpa" /></div>
          <div class="col"><label class="form-label">Grad year</label><input class="form-control" type="number" v-model="f.grad_year" /></div>
        </div>
        <div class="mb-3"><label class="form-label">New password (optional)</label><input class="form-control" type="password" v-model="f.password" /></div>
        <hr>
        <div class="mb-3">
          <label class="form-label">Resume (PDF/DOC/DOCX)</label>
          <input class="form-control" type="file" accept=".pdf,.doc,.docx" @change="onFile" />
          <small class="text-muted" v-if="currentResume">Current: {{ currentResume }}</small>
        </div>
        <button class="btn btn-dark w-100">Save changes</button>
      </form>
    </div>`
};
