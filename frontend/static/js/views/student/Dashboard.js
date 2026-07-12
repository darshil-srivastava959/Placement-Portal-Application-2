
// views/student/Dashboard.js
import { ref, computed, onMounted } from 'vue';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';
 
export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const student = ref({}), drives = ref([]), companies = ref([]), error = ref('');
    const search = ref('');
 
    async function load() {
      try {
        const r = await http.get('/student/dashboard');
        student.value = r.data.student;
        drives.value  = r.data.drives;
      } catch(e) { error.value = errMsg(e); }
      try {
        const r2 = await http.get('/student/companies');
        companies.value = r2.data.companies;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    const filtered = computed(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return drives.value;
      return drives.value.filter(d =>
        (d.company_name||'').toLowerCase().includes(q) ||
        (d.title||'').toLowerCase().includes(q) ||
        (d.job_role||'').toLowerCase().includes(q)
      );
    });
 
    return { student, drives, companies, filtered, search, error };
  },
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">{{ student.name }}</h4>
        <div class="d-flex gap-2">
          <router-link to="/student/history" class="btn btn-sm btn-outline-dark">My applications</router-link>
          <router-link to="/student/profile" class="btn btn-sm btn-outline-dark">Edit profile</router-link>
        </div>
      </div>
      <app-alert :msg="error" />
 
      <div class="card mb-4">
        <div class="card-header bg-info text-dark fw-semibold">Companies</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Name</th><th>About</th><th>Open drives</th><th></th></tr></thead>
          <tbody>
            <tr v-for="c in companies" :key="c.id">
              <td>{{ c.name }}</td>
              <td class="text-truncate" style="max-width:320px">{{ c.description || '—' }}</td>
              <td>{{ c.open_drives }}</td>
              <td><router-link :to="'/student/companies/'+c.id" class="btn btn-sm btn-outline-dark">View details</router-link></td>
            </tr>
            <tr v-if="!companies.length"><td colspan="4" class="text-muted small">No companies yet.</td></tr>
          </tbody>
        </table>
      </div>
 
      <div class="input-group mb-3" style="max-width:340px">
        <input class="form-control form-control-sm" placeholder="Search drives..." v-model="search" />
        <button class="btn btn-sm btn-outline-secondary" @click="search=''">Clear</button>
      </div>
 
      <div class="card">
        <div class="card-header bg-success text-white fw-semibold">
          Open drives <span class="fw-normal">({{ filtered.length }})</span>
        </div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Company</th><th>Drive</th><th>Role</th><th>Deadline</th><th>Eligible</th><th>Applied</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id">
              <td>{{ d.company_name }}</td>
              <td>{{ d.title }}</td>
              <td>{{ d.job_role }}</td>
              <td>{{ d.deadline }}</td>
              <td>
                <span v-if="d.eligible" class="badge bg-success">Yes</span>
                <span v-else class="badge bg-secondary">No</span>
              </td>
              <td>
                <span v-if="d.already_applied" class="badge bg-primary">Applied</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td><router-link :to="'/student/drives/'+d.id" class="btn btn-sm btn-outline-dark">View</router-link></td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="7" class="text-muted small">No drives match your search.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`
};
 