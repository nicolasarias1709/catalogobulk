/**
 * @fileoverview /router/index.js
 * TODA la configuracion de rutas de la aplicacion, en un solo archivo.
 *
 * Mapa de la aplicacion:
 *
 *   /               -> Login       (unica pantalla publica)
 *   /dashboard      -> AdminLayout privada (placeholder de bienvenida)
 *   /productos      -> AdminLayout privada (CRUD de productos)
 *   /proveedores    -> AdminLayout privada (CRUD de proveedores)
 *   /categorias     -> AdminLayout privada (edicion de categorias)
 *   cualquier otra  -> 404
 *
 * El login es la RAIZ porque es la primera pantalla que ve cualquiera: sin
 * token la API no entrega ni un dato, asi que no tendria sentido llegar a otro
 * lado. Por eso no lleva layout: es una pantalla suelta, sin barra.
 *
 * Cuando se agregue el modulo de imports, se suma como una ruta HIJA mas de
 * AdminLayout, con el mismo patron que las de aqui abajo.
 */
import { createRouter, createWebHashHistory } from "vue-router";
import { Notify } from "quasar";

import { useAuthStore } from "@/store/Auth";

// Layout: el marco de las pantallas con sesion.
import AdminLayout from "@/layouts/AdminLayout.vue";

// Vistas: una pantalla por ruta.
import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";
import ProductosView from "@/views/ProductosView.vue";
import ProveedoresView from "@/views/ProveedoresView.vue";
import CategoriasView from "@/views/CategoriasView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

const routes = [
  {
    // RAIZ = login. Va de PRIMERA a proposito: abajo hay otra ruta con path "/"
    // (la del layout) y Vue Router evalua en orden. Como esta no tiene hijas,
    // solo hace match con "/" exacto; "/dashboard" sigue de largo hasta la de abajo.
    path: "/",
    name: "login",
    component: LoginView,
    meta: { titulo: "Iniciar sesion", soloInvitados: true },
  },
  {
    // Todo lo demas vive dentro del layout con sesion.
    path: "/",
    component: AdminLayout,
    children: [
      {
        path: "dashboard",
        name: "dashboard",
        component: DashboardView,
        // requiereAuth lo lee el guard protegerRutas del final del archivo.
        meta: { titulo: "Panel", requiereAuth: true },
      },
      {
        path: "productos",
        name: "productos",
        component: ProductosView,
        meta: { titulo: "Productos", requiereAuth: true },
      },
      {
        path: "proveedores",
        name: "proveedores",
        component: ProveedoresView,
        meta: { titulo: "Proveedores", requiereAuth: true },
      },
      {
        path: "categorias",
        name: "categorias",
        component: CategoriasView,
        meta: { titulo: "Categorías", requiereAuth: true },
      },
      {
        // Comodin: cualquier URL que no exista cae aqui. Va SIEMPRE de ultimo.
        path: ":pathMatch(.*)*",
        name: "no-encontrado",
        component: NotFoundView,
        meta: { titulo: "Pagina no encontrada" },
      },
    ],
  },
];

export const router = createRouter({
  /**
   * createWebHashHistory: las URLs llevan almohadilla
   *   http://localhost:5173/#/dashboard
   *
   * Lo que va despues del # nunca se envia al servidor, asi que al recargar con
   * F5 una ruta interna siempre carga el index.html y no da 404.
   */
  history: createWebHashHistory(),
  routes,

  scrollBehavior: () => ({ left: 0, top: 0 }),
});

/**
 * PROTECCION DE RUTAS (guard global).
 *
 * beforeEach se ejecuta ANTES de cada navegacion y decide si deja pasar:
 *   return true            -> deja pasar
 *   return { name: "..." } -> cancela y redirige a otra ruta
 *
 * Esta es la primera barrera, la de la interfaz, y sirve para no mostrarle
 * pantallas vacias a quien no ha entrado. La barrera de verdad esta en el
 * backend (middlewares/auth.js): aunque alguien se salte esta, el servidor
 * responde 401 y no entrega ni un dato.
 *
 * @param {Object} to - ruta a la que se quiere entrar
 * @returns {boolean|Object} true para permitir, o una ruta para redirigir
 */
function protegerRutas(to) {
  // El store se pide DENTRO de la funcion: cuando se carga este archivo, Pinia
  // todavia no esta instalada.
  const auth = useAuthStore();

  // 1. Ruta privada y sin sesion: se avisa y se manda al login.
  if (to.meta.requiereAuth === true && !auth.estaAutenticado) {
    Notify.create({
      type: "negative",
      message: "Debes iniciar sesion para entrar a esa pagina",
      icon: "lock",
      position: "top-right",
    });

    return { name: "login" };
  }

  // 2. Login con sesion abierta: no tiene sentido volver a entrar.
  if (to.meta.soloInvitados === true && auth.estaAutenticado) {
    return { name: "dashboard" };
  }

  // 3. Todo lo demas pasa.
  return true;
}

router.beforeEach(protegerRutas);

/**
 * Guard que se ejecuta DESPUES de cada navegacion.
 * Aprovecha el meta.titulo para cambiar el titulo de la pestana.
 */
router.afterEach((to) => {
  const base = import.meta.env.VITE_APP_TITULO || "CatalogoBulk";
  document.title = to.meta.titulo ? `${to.meta.titulo} | ${base}` : base;
});
