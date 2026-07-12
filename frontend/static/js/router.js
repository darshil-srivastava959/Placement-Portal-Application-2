
// router.js — all routes defined here
import { createRouter, createWebHashHistory } from 'vue-router';
import { auth } from './store.js';
 
import Login              from './views/Login.js';
import Register           from './views/Register.js';
import AdminDashboard     from './views/admin/Dashboard.js';
import AdminDriveDetail   from './views/admin/DriveDetail.js';
import AdminDriveApplications  from './views/admin/DriveApplications.js';
import AdminApplication   from './views/admin/StudentApplication.js';
import CompanyDashboard   from './views/company/Dashboard.js';
import CreateDrive        from './views/company/CreateDrive.js';
import DriveApplications  from './views/company/DriveApplications.js';
import CompanyApplication from './views/company/StudentApplication.js';
import StudentDashboard   from './views/student/Dashboard.js';
import CompanyDetail      from './views/student/CompanyDetail.js';
import DriveDetail        from './views/student/DriveDetail.js';
import History            from './views/student/History.js';
import Profile            from './views/student/Profile.js';
 
const routes = [
  { path: '/',                                   redirect: '/login' },
  { path: '/login',                              component: Login },
  { path: '/register',                           component: Register },
  { path: '/admin',                              component: AdminDashboard,    meta: { role: 'admin' } },
  { path: '/admin/drives/:id',                   component: AdminDriveDetail,  meta: { role: 'admin' } },
  { path: '/admin/drives/:id/applications',      component: AdminDriveApplications, meta: { role: 'admin' } },
  { path: '/admin/applications/:id',             component: AdminApplication,  meta: { role: 'admin' } },
  { path: '/company',                            component: CompanyDashboard,  meta: { role: 'company' } },
  { path: '/company/drives/new',                 component: CreateDrive,       meta: { role: 'company' } },
  { path: '/company/drives/:id/applications',    component: DriveApplications, meta: { role: 'company' } },
  { path: '/company/applications/:id',           component: CompanyApplication, meta: { role: 'company' } },
  { path: '/student',                            component: StudentDashboard,  meta: { role: 'student' } },
  { path: '/student/companies/:id',              component: CompanyDetail,     meta: { role: 'student' } },
  { path: '/student/drives/:id',                 component: DriveDetail,       meta: { role: 'student' } },
  { path: '/student/history',                    component: History,           meta: { role: 'student' } },
  { path: '/student/profile',                    component: Profile,           meta: { role: 'student' } },
];
 
const router = createRouter({ history: createWebHashHistory(), routes });
 
router.beforeEach(to => {
  if (to.meta.role && to.meta.role !== auth.role) return '/login';
});
 
export default router;
 