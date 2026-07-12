// views/admin/StudentApplication.js
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http, errMsg } from '../../store.js';
import AppAlert from '../../components/AppAlert.js';
import StatusBadge from '../../components/StatusBadge.js';

export default {
  components: { AppAlert, StatusBadge },
  setup() {
    const route = useRoute();
    const application = ref({}), error = ref('');

    async function load() {
      try {
        const r = await http.get('/admin/applications/' + route.params.id);
        application.value = r.data;
      } catch(e) { error.value = errMsg(e); }
    }
    onMounted(load);

    return { application, error };
  },
  template: `
    <div class="container py-4">
      <router-link to="/admin" class="text-decoration-none small">&larr; Back</router-link>
      <div class="d-flex justify-content-between align-items-start mt-2 mb-3">
        <h4 class="mb-0">Student application</h4>
        <status-badge :status="application.status" />
      </div>
      <app-alert :msg="error" />

      <div class="card border-0 shadow-sm p-4" style="max-width:600px">
        <dl class="row mb-0">
          <dt class="col-sm-4">Student name</dt>
          <dd class="col-sm-8">{{ application.student_name }}</dd>

          <dt class="col-sm-4">Email</dt>
          <dd class="col-sm-8">{{ application.student_email }}</dd>

          <dt class="col-sm-4">Branch</dt>
          <dd class="col-sm-8">{{ application.student_branch || '—' }}</dd>

          <dt class="col-sm-4">CGPA</dt>
          <dd class="col-sm-8">{{ application.student_cgpa ?? '—' }}</dd>

          <dt class="col-sm-4">Drive</dt>
          <dd class="col-sm-8">{{ application.drive_title }}</dd>

          <dt class="col-sm-4">Company</dt>
          <dd class="col-sm-8">{{ application.company_name }}</dd>

          <dt class="col-sm-4">Applied on</dt>
          <dd class="col-sm-8">{{ application.applied_date ? application.applied_date.slice(0,10) : '-' }}</dd>
        </dl>

        <a v-if="application.resume_url" :href="application.resume_url" target="_blank"
           class="btn btn-outline-primary mt-3">View resume</a>
        <p v-else class="text-muted small mt-3 mb-0">No resume uploaded.</p>
      </div>
    </div>`
};
