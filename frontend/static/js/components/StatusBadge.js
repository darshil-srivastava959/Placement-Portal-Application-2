// components/StatusBadge.js
export default {
  props: ['status'],
  computed: {
    cls() {
      return {
        Pending:              'bg-warning text-dark',
        Approved:             'bg-success',
        Rejected:             'bg-danger',
        Closed:               'bg-secondary',
        Applied:              'bg-primary',
        Shortlisted:          'bg-info text-dark',
        'Interview Scheduled':'bg-info text-dark',
        Selected:             'bg-success',
      }[this.status] || 'bg-secondary';
    }
  },
  template: `<span class="badge" :class="cls">{{ status }}</span>`
};
