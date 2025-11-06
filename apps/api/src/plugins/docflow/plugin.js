import { Hono } from 'hono';
const router = new Hono();
router.get('/', (c) => c.json({ message: 'FormFlow  plugin running!' }));
const plugin = {
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
