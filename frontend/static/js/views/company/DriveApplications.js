
// views/company/DriveApplications.js
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';
 
export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const route = useRoute();
    const drive = ref({}), applications = ref([]), error = ref('');
 
    async function load() {
      try {
        const r = await http.get('/company/drives/' + route.params.id + '/applications');
        drive.value        = r.data.drive;
        applications.value = r.data.applications;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);
 
    async function updateStatus(appId, status) {
      try { await http.put('/company/applications/' + appId, { status }); load(); }
      catch(e) { error.value = errMsg(e); }
    }
 
    return { drive, applications, error, updateStatus };
  },
  template: `
    <div class="container py-4">
      <router-link to="/company" class="text-decoration-none small">&larr; Back</router-link>
      <h4 class="mt-2 mb-1">{{ drive.title }}</h4>
      <p class="text-muted small mb-3">{{ applications.length }} applicant(s)</p>
      <app-alert :msg="error" />
      <table class="table table-sm bg-white">
        <thead class="table-light"><tr><th>Student</th><th>Applied on</th><th>Status</th><th>Update status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in applications" :key="a.id">
            <td>{{ a.student_name }}</td>
            <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '-' }}</td>
            <td><status-badge :status="a.status" /></td>
            <td>
              <select class="form-select form-select-sm" style="width:auto" :value="a.status"
                @change="updateStatus(a.id, $event.target.value)">
                <option>Applied</option>
                <option>Shortlisted</option>
                <option>Interview Scheduled</option>
                <option>Selected</option>
                <option>Rejected</option>
              </select>
            </td>
            <td>
              <router-link class="btn btn-sm btn-outline-primary" :to="'/company/applications/'+a.id">View</router-link>
            </td>
          </tr>
          <tr v-if="!applications.length"><td colspan="5" class="text-muted small">No applications yet.</td></tr>
        </tbody>
      </table>
    </div>`
};
 