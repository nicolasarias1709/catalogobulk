import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/productos' },
  { path: '/login', component: () => import('../pages/LoginPage.vue'), meta: { publica: true } },
  { path: '/productos', component: () => import('../pages/ProductosPage.vue'), meta: { publica: true } },
  { path: '/categorias', component: () => import('../pages/CategoriasPage.vue'), meta: { publica: true } },
  { path: '/proveedores', component: () => import('../pages/ProveedoresPage.vue') },
  { path: '/importaciones', component: () => import('../pages/ImportacionesPage.vue') },
  { path: '/exportaciones', component: () => import('../pages/ExportacionesPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/productos' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (!to.meta.publica && !token) {
    return '/login';
  }
  return true;
});

export default router;
