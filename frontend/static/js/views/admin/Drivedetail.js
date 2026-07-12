// views/admin/DriveDetail.js
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';
 
export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const route = useRoute();
    const drive = ref({}), error = ref('');
 
    async function load() {
      try {
        const r = await http.get('/admin/drives/' + route.params.id);
        drive.value = r.data;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    return { drive, error };
  },
  template: `
    <div class="container py-4">
      <router-link to="/admin" class="text-decoration-none small">&larr; Back</router-link>
      <div class="d-flex justify-content-between align-items-start mt-2 mb-3">
        <h4 class="mb-0">{{ drive.title }}</h4>
        <status-badge :status="drive.status" />
      </div>
      <app-alert :msg="error" />
 
      <div class="card border-0 shadow-sm p-4" style="max-width:640px">
        <dl class="row mb-0">
          <dt class="col-sm-4">Company</dt>
          <dd class="col-sm-8">{{ drive.company_name }}</dd>
 
          <dt class="col-sm-4">Job title</dt>
          <dd class="col-sm-8">{{ drive.job_role }}</dd>
 
          <dt class="col-sm-4">Description</dt>
          <dd class="col-sm-8">{{ drive.description || '—' }}</dd>
 
          <dt class="col-sm-4">Min CGPA</dt>
          <dd class="col-sm-8">{{ drive.min_cgpa }}</dd>
 
          <dt class="col-sm-4">Eligible branches</dt>
          <dd class="col-sm-8">{{ drive.eligible_branches }}</dd>
 
          <dt class="col-sm-4">Eligible grad year</dt>
          <dd class="col-sm-8">{{ drive.eligible_grad_year || 'Any' }}</dd>
 
          <dt class="col-sm-4">Salary</dt>
          <dd class="col-sm-8">{{ drive.salary || '—' }}</dd>
 
          <dt class="col-sm-4">Location</dt>
          <dd class="col-sm-8">{{ drive.location || '—' }}</dd>
 
          <dt class="col-sm-4">Deadline</dt>
          <dd class="col-sm-8">{{ drive.deadline }}</dd>
        </dl>
 
        <router-link class="btn btn-outline-primary mt-3" :to="'/admin/drives/'+drive.id+'/applications'">
          View applications
        </router-link>
      </div>
    </div>`
};
 