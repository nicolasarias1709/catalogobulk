// src/main.js
// Único punto de montaje: aquí Vue inyecta toda la aplicación en #app.

import { createApp } from 'vue';
import { Quasar, Notify, Dialog } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

import App from './App.vue';
import router from './router';
import './css/app.sass';

const app = createApp(App);

app.use(Quasar, {
  plugins: { Notify, Dialog },
  config: {
    brand: {
      primary: '#1976d2',
      secondary: '#26a69a',
      accent: '#9c27b0',
      dark: '#1d1d1d',
      positive: '#21ba45',
      negative: '#c10015',
      info: '#31ccec',
      warning: '#f2c037',
    },
  },
});
app.use(router);

app.mount('#app');
