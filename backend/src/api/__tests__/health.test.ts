import request from 'supertest';

// Ensure test environment does not start background jobs
process.env.NODE_ENV = 'test';

// Import the Express app (ts-jest will handle the .ts file)
import { app } from '../../server';

test('GET /api/health returns status 200', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
