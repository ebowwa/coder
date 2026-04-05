import { describe, test, expect } from 'bun:test';

describe('Trades API - Basic Validation', () => {

  test('trade endpoint requires authentication', async () => {
    const res = await fetch('http://localhost:3000/api/v1/markets/test-market/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        side: 'YES',
        shares: 10,
      }),
    });
    expect(res.status).toBe(401);
  });
});
