
// views/admin/Dashboard.js
import { ref, computed, onMounted } from 'vue';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';
 
export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const stats = ref({}), companies = ref([]), pending = ref([]);
    const students = ref([]), drives = ref([]), applications = ref([]);
    const search = ref(''), error = ref('');
 
    async function load() {
      try {
        const r = await http.get('/admin/dashboard', { params: { search: search.value || undefined } });
        stats.value    = r.data.stats;
        companies.value = r.data.companies;
        pending.value  = r.data.pending_companies;
        students.value = r.data.students;
        drives.value   = r.data.drives;
        applications.value = r.data.applications;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    const pendingDrives = computed(() => drives.value.filter(d => d.status === 'Pending'));
 
    async function act(url) {
      try { await http.post(url); load(); } catch(e) { error.value = errMsg(e); }
    }
 
    return { stats, companies, pending, students, drives, pendingDrives, applications, search, error, load, act };
  },
  template: `
    <div class="container py-4">
      <h4 class="mb-4">Admin dashboard</h4>
      <app-alert :msg="error" />
 
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3" v-for="(val, key) in stats" :key="key">
          <div class="card border-0 shadow-sm text-center py-3"
            :class="{
              'bg-primary text-white': key === 'total_applications',
              'bg-success text-white': key === 'total_companies',
              'bg-warning text-dark':  key === 'total_drives',
              'bg-info text-dark':     key === 'total_students',
            }">
            <div class="fs-2 fw-bold">{{ val }}</div>
            <div class="small text-capitalize" :class="key === 'total_applications' || key === 'total_companies' ? 'text-white-50' : 'text-muted'">{{ key.replace('total_','').replace('_',' ') }}</div>
          </div>
        </div>
      </div>
 
      <div class="input-group mb-4" style="max-width:340px">
        <input class="form-control" placeholder="Search..." v-model="search" @keyup.enter="load" />
        <button class="btn btn-outline-secondary" @click="load">Go</button>
      </div>
 
      <div class="card mb-4">
        <div class="card-header bg-warning text-dark fw-semibold">Companies awaiting approval</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Name</th><th>Email</th><th></th></tr></thead>
          <tbody>
            <tr v-for="c in pending" :key="c.id">
              <td>{{ c.name }}</td><td>{{ c.email }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-success me-1" @click="act('/admin/companies/'+c.id+'/approve')">Approve</button>
                <button class="btn btn-sm btn-outline-danger" @click="act('/admin/companies/'+c.id+'/reject')">Reject</button>
              </td>
            </tr>
            <tr v-if="!pending.length"><td colspan="3" class="text-muted small">None pending.</td></tr>
          </tbody>
        </table>
      </div>
 
      <div class="card mb-4">
        <div class="card-header bg-warning text-dark fw-semibold">Drives awaiting approval</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Drive</th><th>Company</th><th>Deadline</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in pendingDrives" :key="d.id">
              <td>{{ d.title }}</td><td>{{ d.company_name }}</td><td>{{ d.deadline }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-success me-1" @click="act('/admin/drives/'+d.id+'/approve')">Approve</button>
                <button class="btn btn-sm btn-outline-danger" @click="act('/admin/drives/'+d.id+'/reject')">Reject</button>
              </td>
            </tr>
            <tr v-if="!pendingDrives.length"><td colspan="4" class="text-muted small">None pending.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card mb-4">
        <div class="card-header bg-primary text-white fw-semibold">All drives</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Drive</th><th>Company</th><th>Status</th><th>Deadline</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in drives" :key="d.id">
              <td>{{ d.title }}</td><td>{{ d.company_name }}</td>
              <td><status-badge :status="d.status" /></td>
              <td>{{ d.deadline }}</td>
              <td class="text-end">
                <router-link class="btn btn-sm btn-outline-secondary me-1" :to="'/admin/drives/'+d.id">
                  View drive
                </router-link>
                <router-link class="btn btn-sm btn-outline-primary" :to="'/admin/drives/'+d.id+'/applications'">
                  View applications
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
 
      <div class="card mb-4">
        <div class="card-header bg-dark text-white fw-semibold">Student applications</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Name</th><th>Drive</th><th>Company</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="a in applications" :key="a.id">
              <td>{{ a.student_name }}</td>
              <td>{{ a.drive_title }}</td>
              <td>{{ a.company_name }}</td>
              <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '-' }}</td>
              <td><status-badge :status="a.status" /></td>
              <td class="text-end">
                <router-link class="btn btn-sm btn-outline-primary" :to="'/admin/applications/'+a.id">View</router-link>
              </td>
            </tr>
            <tr v-if="!applications.length"><td colspan="6" class="text-muted small">No applications yet.</td></tr>
          </tbody>
        </table>
      </div>
 
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white fw-semibold">Approved companies</div>
            <table class="table table-sm bg-white mb-0">
              <thead class="table-light"><tr><th>Name</th><th>Email</th><th></th></tr></thead>
              <tbody>
                <tr v-for="c in companies" :key="c.id">
                  <td>{{ c.name }} <span v-if="c.is_blacklisted" class="badge bg-danger ms-1">BL</span></td>
                  <td>{{ c.email }}</td>
                  <td>
                    <button v-if="!c.is_blacklisted" class="btn btn-sm btn-outline-danger"
                      @click="act('/admin/companies/'+c.id+'/blacklist')">Blacklist</button>
                    <button v-else class="btn btn-sm btn-outline-success"
                      @click="act('/admin/companies/'+c.id+'/reactivate')">Reactivate</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-info text-dark fw-semibold">Students</div>
            <table class="table table-sm bg-white mb-0">
              <thead class="table-light"><tr><th>Name</th><th>Email</th><th></th></tr></thead>
              <tbody>
                <tr v-for="s in students" :key="s.id">
                  <td>{{ s.name }} <span v-if="s.is_blacklisted" class="badge bg-danger ms-1">BL</span></td>
                  <td>{{ s.email }}</td>
                  <td>
                    <button v-if="!s.is_blacklisted" class="btn btn-sm btn-outline-danger"
                      @click="act('/admin/students/'+s.id+'/blacklist')">Blacklist</button>
                    <button v-else class="btn btn-sm btn-outline-success"
                      @click="act('/admin/students/'+s.id+'/reactivate')">Reactivate</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`
};
 