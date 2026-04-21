import { describe, test, expect } from 'bun:test';

describe('Server Health', () => {
  test('health endpoint returns ok', async () => {
    const res = await fetch('http://localhost:3000/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});

describe('Markets API - Basic Validation', () => {
  test('market creation requires authentication', async () => {
    const res = await fetch('http://localhost:3000/api/v1/groups/test-group/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Test question?',
        expires_at: Date.now() + 86400000,
        initial_liquidity: 100,
      }),
    });
    expect(res.status).toBe(401);
  });

  test('market creation validates question length', async () => {
    const res = await fetch('http://localhost:3000/api/v1/groups/test-group/markets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user',
        'X-Group-ID': 'test-group',
      },
      body: JSON.stringify({
        question: 'Hi',
        expires_at: Date.now() + 86400000,
        initial_liquidity: 100,
      }),
    });
    expect(res.status).toBe(403);
  });
});
