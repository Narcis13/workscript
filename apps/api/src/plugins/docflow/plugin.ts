import type { SaaSPlugin } from
  '../../core/plugins';
  import { Hono } from 'hono';

  const router = new Hono();
  router.get('/', (c) => c.json({ message: 'FormFlow  plugin running!' }));

  const plugin: SaaSPlugin = {
    id: 'formflow',
    name: 'FormFlow',
    version: '1.0.0',
    enabled: true,
    routes: {
      basePath: '/formflow',
      router
    }
  };

  export default plugin;