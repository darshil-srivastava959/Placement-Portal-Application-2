// views/student/DriveDetail.js
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';

export default {
  components: { AppAlert },
  setup() {
    const route = useRoute();
    const drive = ref({}), error = ref(''), success = ref('');

    async function load() {
      try {
        const r = await http.get('/student/drives/' + route.params.id);
        drive.value = r.data;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);

    async function apply() {
      error.value = ''; success.value = '';
      try {
        await http.post('/student/drives/' + route.params.id + '/apply');
        success.value = 'Applied successfully!';
        load();
      } catch(e) { error.value = errMsg(e); }
    }

    return { drive, error, success, apply };
  },
  template: `
    <div class="container py-4" style="max-width:580px">
      <router-link to="/student" class="text-decoration-none small">&larr; Back</router-link>
      <h4 class="mt-2">{{ drive.title }}</h4>
      <p class="text-muted">{{ drive.company_name }} &middot; {{ drive.job_role }} &middot; {{ drive.location }}</p>
      <app-alert :msg="error" />
      <app-alert :msg="success" type="success" />
      <p>{{ drive.description }}</p>
      <table class="table table-sm table-bordered mb-3" style="max-width:320px">
        <tr><th>Min CGPA</th><td>{{ drive.min_cgpa }}</td></tr>
        <tr><th>Branches</th><td>{{ drive.eligible_branches }}</td></tr>
        <tr><th>Grad year</th><td>{{ drive.eligible_grad_year || 'Any' }}</td></tr>
        <tr><th>Salary</th><td>{{ drive.salary || '-' }}</td></tr>
        <tr><th>Deadline</th><td>{{ drive.deadline }}</td></tr>
      </table>
      <button class="btn btn-dark"
        :disabled="!drive.eligible || drive.already_applied"
        @click="apply">
        {{ drive.already_applied ? 'Already applied' : drive.eligible ? 'Apply now' : 'Not eligible' }}
      </button>
    </div>`
};
