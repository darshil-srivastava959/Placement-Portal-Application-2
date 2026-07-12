
// views/student/CompanyDetail.js
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
 
export default {
  components: { AppAlert },
  setup() {
    const route = useRoute();
    const company = ref({}), drives = ref([]), error = ref('');
 
    async function load() {
      try {
        const r = await http.get('/student/companies/' + route.params.id);
        company.value = r.data.company;
        drives.value  = r.data.drives;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    return { company, drives, error };
  },
  template: `
    <div class="container py-4">
      <router-link to="/student" class="text-decoration-none small">&larr; Back</router-link>
 
      <div class="card mt-2 mb-4">
        <div class="card-header bg-primary text-white fw-semibold">{{ company.name }}</div>
        <div class="card-body">
          <dl class="row mb-0">
            <dt class="col-sm-3">Email</dt>
            <dd class="col-sm-9">{{ company.email }}</dd>
            <dt class="col-sm-3">About</dt>
            <dd class="col-sm-9">{{ company.description || '—' }}</dd>
          </dl>
        </div>
      </div>
 
      <app-alert :msg="error" />
 
      <div class="card">
        <div class="card-header bg-success text-white fw-semibold">Open drives</div>
        <table class="table table-sm bg-white mb-0">
          <thead class="table-light"><tr><th>Drive</th><th>Role</th><th>Deadline</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in drives" :key="d.id">
              <td>{{ d.title }}</td><td>{{ d.job_role }}</td><td>{{ d.deadline }}</td>
              <td><router-link :to="'/student/drives/'+d.id" class="btn btn-sm btn-outline-dark">View</router-link></td>
            </tr>
            <tr v-if="!drives.length"><td colspan="4" class="text-muted small">No open drives right now.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`
};
 