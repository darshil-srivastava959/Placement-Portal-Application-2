// views/admin/DriveApplications.js
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
        const r = await http.get('/admin/drives/' + route.params.id + '/applications');
        drive.value        = r.data.drive;
        applications.value = r.data.applications;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);

    return { drive, applications, error };
  },
  template: `
    <div class="container py-4">
      <router-link to="/admin" class="text-decoration-none small">&larr; Back</router-link>
      <div class="d-flex justify-content-between align-items-start mt-2 mb-1">
        <h4 class="mb-0">{{ drive.title }}</h4>
        <status-badge :status="drive.status" />
      </div>
      <p class="text-muted small mb-3">
        {{ drive.company_name }} &middot; {{ drive.job_role }} &middot; Deadline: {{ drive.deadline }}
        &middot; {{ applications.length }} applicant(s)
      </p>
      <app-alert :msg="error" />
      <table class="table table-sm bg-white">
        <thead class="table-light"><tr><th>Student</th><th>Email</th><th>Applied on</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in applications" :key="a.id">
            <td>{{ a.student_name }}</td>
            <td>{{ a.student_email }}</td>
            <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '-' }}</td>
            <td><status-badge :status="a.status" /></td>
            <td>
              <router-link class="btn btn-sm btn-outline-primary" :to="'/admin/applications/'+a.id">View</router-link>
            </td>
          </tr>
          <tr v-if="!applications.length"><td colspan="5" class="text-muted small">No applications yet.</td></tr>
        </tbody>
      </table>
    </div>`
};
