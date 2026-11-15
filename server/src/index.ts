import { createApp } from './app.js';
import { env } from './config/env.js';
import { initCronJobs } from './services/cronService.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`CareCircle server listening on port ${env.PORT} (${env.NODE_ENV})`);
  initCronJobs();
});
