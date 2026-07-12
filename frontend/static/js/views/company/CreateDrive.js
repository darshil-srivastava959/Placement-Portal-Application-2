// views/company/CreateDrive.js
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';

export default {
  components: { AppAlert },
  setup() {
    const router = useRouter();
    const f = reactive({
      title:'', job_role:'', description:'', min_cgpa:0,
      eligible_branches:'ANY', eligible_grad_year:'',
      salary:'', location:'', deadline:''
    });
    const error = ref(''), success = ref('');

    async function submit() {
      error.value = ''; success.value = '';
      try {
        await http.post('/company/drives', {
          ...f,
          min_cgpa: parseFloat(f.min_cgpa) || 0,
          eligible_grad_year: f.eligible_grad_year ? parseInt(f.eligible_grad_year) : null,
          salary: f.salary ? parseFloat(f.salary) : null,
        });
        success.value = 'Drive submitted for admin approval.';
        setTimeout(() => router.push('/company'), 1000);
      } catch(e) { error.value = errMsg(e); }
    }

    return { f, error, success, submit };
  },
  template: `
    <div class="container py-4" style="max-width:560px">
      <router-link to="/company" class="text-decoration-none small">&larr; Back</router-link>
      <h4 class="mt-2 mb-3">New placement drive</h4>
      <app-alert :msg="error" />
      <app-alert :msg="success" type="success" />
      <form @submit.prevent="submit">
        <div class="mb-2"><label class="form-label">Title</label><input class="form-control" v-model="f.title" required /></div>
        <div class="mb-2"><label class="form-label">Job role</label><input class="form-control" v-model="f.job_role" required /></div>
        <div class="mb-2"><label class="form-label">Description</label><textarea class="form-control" rows="3" v-model="f.description"></textarea></div>
        <div class="row g-2 mb-2">
          <div class="col"><label class="form-label">Min CGPA</label><input class="form-control" type="number" step="0.01" v-model="f.min_cgpa" /></div>
          <div class="col"><label class="form-label">Branches (ANY or CS,ECE)</label><input class="form-control" v-model="f.eligible_branches" /></div>
          <div class="col"><label class="form-label">Grad year</label><input class="form-control" type="number" v-model="f.eligible_grad_year" /></div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col"><label class="form-label">Salary</label><input class="form-control" type="number" v-model="f.salary" /></div>
          <div class="col"><label class="form-label">Location</label><input class="form-control" v-model="f.location" /></div>
        </div>
        <div class="mb-3"><label class="form-label">Deadline</label><input class="form-control" type="date" v-model="f.deadline" required /></div>
        <button class="btn btn-dark w-100">Submit for approval</button>
      </form>
    </div>`
};
