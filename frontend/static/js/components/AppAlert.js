// components/AppAlert.js
export default {
  props: { msg: String, type: { default: 'danger' } },
  template: `<div v-if="msg" :class="'alert alert-'+type+' py-2 mt-2'">{{ msg }}</div>`
};
