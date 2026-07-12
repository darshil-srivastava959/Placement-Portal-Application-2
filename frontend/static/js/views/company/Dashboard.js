
// views/company/Dashboard.js
import { ref, onMounted } from 'vue';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';
 
export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const company = ref({}), upcoming = ref([]), closed = ref([]), error = ref('');
 
    async function load() {
      try {
        const r = await http.get('/company/dashboard');
        company.value = r.data.company;
        upcoming.value = r.data.upcoming_drives;
        closed.value   = r.data.closed_drives;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    async function closeDrive(id) {
      try { await http.post('/company/drives/'+id+'/close'); load(); }
      catch(e) { error.value = errMsg(e); }
    }
 
    return { company, upcoming, closed, error, closeDrive };
  },
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Company dashboard</h4>
        <router-link to="/company/drives/new" class="btn btn-dark btn-sm">+ New drive</router-link>
      </div>
      <app-alert :msg="error" />
 
      <div class="card mb-4">
        <div class="card-header bg-primary text-white fw-semibold">Company details</div>
        <div class="card-body">
          <dl class="row mb-0">
            <dt class="col-sm-3">Name</dt>
            <dd class="col-sm-9">{{ company.name }}</dd>
 
            <dt class="col-sm-3">Email</dt>
            <dd class="col-sm-9">{{ company.email }}</dd>
 
            <dt class="col-sm-3">About</dt>
            <dd class="col-sm-9">{{ company.description || '—' }}</dd>
 
            <dt class="col-sm-3">Status</dt>
            <dd class="col-sm-9">
              <span class="badge" :class="company.is_approved ? 'bg-success' : 'bg-warning text-dark'">
                {{ company.is_approved ? 'Approved' : 'Pending approval' }}
              </span>
            </dd>
          </dl>
        </div>
      </div>
 
      <div class="card mb-4">
        <div class="card-header bg-success text-white fw-semibold">Active drives</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Title</th><th>Role</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in upcoming" :key="d.id">
              <td>{{ d.title }}</td><td>{{ d.job_role }}</td><td>{{ d.deadline }}</td>
              <td><status-badge :status="d.status" /></td>
              <td class="text-end">
                <router-link :to="'/company/drives/'+d.id+'/applications'" class="btn btn-sm btn-outline-dark me-1">Applicants</router-link>
                <button class="btn btn-sm btn-outline-secondary" @click="closeDrive(d.id)">Close</button>
              </td>
            </tr>
            <tr v-if="!upcoming.length"><td colspan="5" class="text-muted small">No active drives.</td></tr>
          </tbody>
        </table>
      </div>
 
      <div class="card">
        <div class="card-header bg-secondary text-white fw-semibold">Closed drives</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Title</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in closed" :key="d.id">
              <td>{{ d.title }}</td><td>{{ d.job_role }}</td>
              <td><status-badge :status="d.status" /></td>
              <td><router-link :to="'/company/drives/'+d.id+'/applications'" class="btn btn-sm btn-outline-dark">Applicants</router-link></td>
            </tr>
            <tr v-if="!closed.length"><td colspan="4" class="text-muted small">None yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`
};
 