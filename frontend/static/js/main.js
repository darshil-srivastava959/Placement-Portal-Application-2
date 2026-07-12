// main.js — entry point, mounts the Vue app
import { createApp } from 'vue';
import router from './router.js';
import Navbar from './views/Navbar.js';
import AppAlert from './components/AppAlert.js';
import StatusBadge from './components/StatusBadge.js';

createApp({
  components: { Navbar },
  template: `<Navbar /><router-view class="mt-2" />`
})
  .component('AppAlert', AppAlert)
  .component('StatusBadge', StatusBadge)
  .use(router)
  .mount('#app');
