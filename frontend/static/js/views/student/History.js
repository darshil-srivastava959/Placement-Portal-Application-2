// views/student/History.js
import { ref, onMounted } from 'vue';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';

export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const applications = ref([]), error = ref('');
    const exportState = ref('idle'), exportUrl = ref(''), exportMsg = ref('');
    let pollTimer = null;

    onMounted(async () => {
      try {
        const r = await http.get('/student/history');
        applications.value = r.data.applications;
      } catch(e) { error.value = errMsg(e); }
    });

    async function triggerExport() {
      exportState.value = 'loading';
      exportMsg.value   = 'Generating CSV…';
      exportUrl.value   = '';
      try {
        const r = await http.post('/student/export');
        const taskId = r.data.task_id;
        pollTimer = setInterval(async () => {
          try {
            const p = await http.get('/student/export/' + taskId);
            if (p.data.state === 'done') {
              clearInterval(pollTimer);
              exportState.value = 'done';
              exportUrl.value   = p.data.url;
              exportMsg.value   = `Export ready — ${p.data.count} record(s). Check your email too.`;
            } else if (p.data.state === 'failed') {
              clearInterval(pollTimer);
              exportState.value = 'failed';
              exportMsg.value   = 'Export failed. Try again.';
            }
          } catch(e) { clearInterval(pollTimer); exportState.value = 'failed'; exportMsg.value = errMsg(e); }
        }, 2000);
      } catch(e) { exportState.value = 'failed'; exportMsg.value = errMsg(e); }
    }

    return { applications, error, exportState, exportUrl, exportMsg, triggerExport };
  },
  template: `
    <div class="container py-4">
      <router-link to="/student" class="text-decoration-none small">&larr; Back</router-link>
      <div class="d-flex justify-content-between align-items-center mt-2 mb-3">
        <h4 class="mb-0">My applications</h4>
        <div class="d-flex align-items-center gap-2">
          <span v-if="exportMsg" class="small text-muted">{{ exportMsg }}</span>
          <a v-if="exportUrl" :href="exportUrl" class="btn btn-sm btn-success" download>Download CSV</a>
          <button class="btn btn-sm btn-outline-dark"
            :disabled="exportState === 'loading'"
            @click="triggerExport">
            <span v-if="exportState === 'loading'" class="spinner-border spinner-border-sm me-1"></span>
            {{ exportState === 'loading' ? 'Exporting…' : 'Export CSV' }}
          </button>
        </div>
      </div>
      <app-alert :msg="error" />
      <table class="table table-sm bg-white">
        <thead class="table-light"><tr><th>Company</th><th>Drive</th><th>Applied on</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="a in applications" :key="a.id">
            <td>{{ a.company_name }}</td>
            <td>{{ a.drive_title }}</td>
            <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '-' }}</td>
            <td><status-badge :status="a.status" /></td>
          </tr>
          <tr v-if="!applications.length"><td colspan="4" class="text-muted small">No applications yet.</td></tr>
        </tbody>
      </table>
    </div>`
};
