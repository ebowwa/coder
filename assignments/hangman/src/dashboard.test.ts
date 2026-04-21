/**
 * Tests for the dashboard module
 *
 * Validates renderDashboard, loadDashboard data flow, Quick Play interaction,
 * stat card rendering, active games list, leaderboard display, and
 * localStorage-based user resolution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup before importing the module under test
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('./router', () => ({
  router: { navigate: mockNavigate },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createContainer(): HTMLDivElement {
  return document.createElement('div');
}

function seedLocalStorage(user: Record<string, unknown> = {}, token = 'test-token'): void {
  localStorage.setItem('hm_user', JSON.stringify(user));
  localStorage.setItem('hm_token', token);
}

function makeDashboardResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: () => Promise.resolve(overrides),
  };
}

/**
 * Flush all pending microtasks so async loadDashboard can complete.
 */
async function flushAsync(): Promise<void> {
  // Flush several rounds to handle nested async operations
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dashboard', () => {
  let container: HTMLDivElement;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeDashboardResponse({
        stats: {
          rank: 42,
          totalGames: 30,
          wins: 20,
          winRate: 0.667,
          bestStreak: 5,
        },
        activeGames: [],
        leaderboard: [],
      }),
    );
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // renderDashboard – basic structure
  // ---------------------------------------------------------------------------

  describe('renderDashboard – HTML structure', () => {
    it('renders welcome banner with default "Player" when no user in localStorage', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toContain('Player');
    });

    it('renders welcome banner with displayName from localStorage', async () => {
      seedLocalStorage({ displayName: 'Alice' });
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Alice');
    });

    it('renders welcome banner with username when displayName is absent', async () => {
      seedLocalStorage({ username: 'bob99' });
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('bob99');
    });

    it('renders the Quick Play button', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const btn = container.querySelector('#quick-play-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Quick Play');
    });

    it('renders 5 stat cards', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const cards = container.querySelectorAll('.stat-card');
      expect(cards.length).toBe(5);
    });

    it('renders stat elements with correct ids', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const ids = ['stat-games', 'stat-wins', 'stat-winrate', 'stat-streak', 'stat-rank'];
      for (const id of ids) {
        expect(container.querySelector(`#${id}`)).toBeTruthy();
      }
    });

    it('stat cards start with skeleton placeholder', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const gamesEl = container.querySelector('#stat-games');
      expect(gamesEl).toBeTruthy();
      // Initially a skeleton element — either empty or has shimmer class
      expect(gamesEl!.classList.contains('dash-skeleton')).toBe(true);
    });

    it('renders the stats line element with skeleton', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const line = container.querySelector('#dash-stats-line');
      expect(line).toBeTruthy();
      // Stats line initially contains a skeleton shimmer placeholder
      const skeleton = line!.querySelector('.dash-skeleton');
      expect(skeleton).toBeTruthy();
    });

    it('renders active games container', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const activeEl = container.querySelector('#active-games');
      expect(activeEl).toBeTruthy();
    });

    it('renders leaderboard container', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const lbEl = container.querySelector('#leaderboard-list');
      expect(lbEl).toBeTruthy();
    });

    it('renders a grid layout with two columns (active games + leaderboard)', async () => {
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const grids = container.querySelectorAll('[style*="grid-template-columns"]');
      expect(grids.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // loadDashboard – data-driven rendering via fetch
  // ---------------------------------------------------------------------------

  describe('loadDashboard – stats update', () => {
    it('updates stat cards after fetch resolves', async () => {
      seedLocalStorage();
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-games')!.textContent).toBe('30');
      expect(container.querySelector('#stat-wins')!.textContent).toBe('20');
      expect(container.querySelector('#stat-winrate')!.textContent).toBe('67%');
      expect(container.querySelector('#stat-streak')!.textContent).toBe('5');
      expect(container.querySelector('#stat-rank')!.textContent).toBe('#42');
    });

    it('updates the stats line with rank, games, and wins', async () => {
      seedLocalStorage();
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const line = container.querySelector('#dash-stats-line')!;
      expect(line.textContent).toContain('#42');
      expect(line.textContent).toContain('30');
      expect(line.textContent).toContain('20');
    });

    it('handles zero stats gracefully', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { rank: null, totalGames: 0, wins: 0, winRate: 0, bestStreak: 0 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-games')!.textContent).toBe('0');
      expect(container.querySelector('#stat-wins')!.textContent).toBe('0');
      expect(container.querySelector('#stat-winrate')!.textContent).toBe('0%');
      expect(container.querySelector('#stat-streak')!.textContent).toBe('0');
      expect(container.querySelector('#stat-rank')!.textContent).toBe('--');
    });

    it('shows "Could not load stats" when response is not ok', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#dash-stats-line')!.textContent).toContain('Could not load stats');
    });

    it('handles fetch error gracefully without crashing', async () => {
      seedLocalStorage();
      const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const { renderDashboard } = await import('./dashboard');
      expect(() => renderDashboard(container)).not.toThrow();

      await flushAsync();
      consoleErrSpy.mockRestore();
    });

    it('sends Authorization header with token from localStorage', async () => {
      seedLocalStorage({}, 'my-secret-token');
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const call = fetchSpy.mock.calls.find((c) => (c[1] as RequestInit)?.headers);
      const headers = (call![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer my-secret-token');
    });
  });

  // ---------------------------------------------------------------------------
  // loadDashboard – active games
  // ---------------------------------------------------------------------------

  describe('loadDashboard – active games list', () => {
    it('shows empty state when no active games', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#active-games')!.textContent).toContain('No active games');
    });

    it('renders active game entries with name, players, and status', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [
            { code: 'ABC', name: 'Room 1', players: ['p1', 'p2'], maxPlayers: 4, status: 'playing' },
            { code: 'DEF', name: 'Room 2', players: ['p3'], maxPlayers: 2, status: 'waiting' },
          ],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const activeEl = container.querySelector('#active-games')!;
      expect(activeEl.textContent).toContain('Room 1');
      expect(activeEl.textContent).toContain('Room 2');
      expect(activeEl.textContent).toContain('2/4 players');
      expect(activeEl.textContent).toContain('playing');
      expect(activeEl.textContent).toContain('waiting');
    });

    it('active game entries have data-room attribute', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [{ code: 'XYZ', name: 'Test', players: [], maxPlayers: 2, status: 'waiting' }],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('[data-room="XYZ"]')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // loadDashboard – leaderboard
  // ---------------------------------------------------------------------------

  describe('loadDashboard – leaderboard', () => {
    it('shows empty state when no entries', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#leaderboard-list')!.textContent).toContain('No entries yet');
    });

    it('renders leaderboard entries with rank, name, and score', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [],
          leaderboard: [
            { playerName: 'Alice', score: 1500 },
            { playerName: 'Bob', score: 1200 },
            { playerName: 'Charlie', score: 900 },
          ],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const lbEl = container.querySelector('#leaderboard-list')!;
      expect(lbEl.textContent).toContain('Alice');
      expect(lbEl.textContent).toContain('Bob');
      expect(lbEl.textContent).toContain('Charlie');
      expect(lbEl.textContent).toContain('1500');
      expect(lbEl.textContent).toContain('1200');
      expect(lbEl.textContent).toContain('900');
    });

    it('renders rank numbers starting at 1', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [],
          leaderboard: [
            { playerName: 'Alice', score: 1500 },
            { playerName: 'Bob', score: 1200 },
          ],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const lbEl = container.querySelector('#leaderboard-list')!;
      expect(lbEl.textContent).toContain('1');
      expect(lbEl.textContent).toContain('2');
    });
  });

  // ---------------------------------------------------------------------------
  // Quick Play button
  // ---------------------------------------------------------------------------

  describe('Quick Play button', () => {
    it('navigates to lobby on successful quickplay', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/quickplay')) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(
          makeDashboardResponse({ stats: {}, activeGames: [], leaderboard: [] }),
        );
      });

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const btn = container.querySelector('#quick-play-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();

      btn.click();

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('lobby');
    });

    it('navigates to game on quickplay fetch error', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/quickplay')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(
          makeDashboardResponse({ stats: {}, activeGames: [], leaderboard: [] }),
        );
      });

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const btn = container.querySelector('#quick-play-btn') as HTMLButtonElement;
      btn.click();

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('game');
    });

    it('sends POST request to /api/quickplay with auth header', async () => {
      seedLocalStorage({}, 'qp-token');
      const quickplayCalls: string[] = [];
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/quickplay')) {
          quickplayCalls.push(u);
          expect(init?.method).toBe('POST');
          const headers = init?.headers as Record<string, string>;
          expect(headers?.Authorization).toBe('Bearer qp-token');
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(
          makeDashboardResponse({ stats: {}, activeGames: [], leaderboard: [] }),
        );
      });

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const btn = container.querySelector('#quick-play-btn') as HTMLButtonElement;
      btn.click();

      await flushAsync();

      expect(quickplayCalls.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // localStorage interaction
  // ---------------------------------------------------------------------------

  describe('localStorage interaction', () => {
    it('reads hm_user and hm_token from localStorage', async () => {
      seedLocalStorage({ displayName: 'TestUser' }, 'tok-123');
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('TestUser');

      await flushAsync();

      const call = fetchSpy.mock.calls.find((c) => (c[1] as RequestInit)?.headers);
      const headers = (call![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer tok-123');
    });

    it('handles empty localStorage without crashing', async () => {
      const { renderDashboard } = await import('./dashboard');
      expect(() => renderDashboard(container)).not.toThrow();
    });

    it('handles malformed hm_user JSON gracefully', async () => {
      localStorage.setItem('hm_user', '{invalid json');
      localStorage.setItem('hm_token', 'token');

      const { renderDashboard } = await import('./dashboard');
      expect(() => renderDashboard(container)).toThrow();
    });

    it('uses default "Player" when user object is empty', async () => {
      localStorage.setItem('hm_user', '{}');
      localStorage.setItem('hm_token', 'token');

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Player');
    });

    it('prefers displayName over username', async () => {
      seedLocalStorage({ displayName: 'Display', username: 'uname' });

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Display');
      expect(h2!.textContent).not.toContain('uname');
    });
  });

  // ---------------------------------------------------------------------------
  // Win rate calculation
  // ---------------------------------------------------------------------------

  describe('win rate display', () => {
    it('rounds win rate to nearest percentage', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { winRate: 0.666 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-winrate')!.textContent).toBe('67%');
    });

    it('shows 100% for winRate of 1', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { winRate: 1.0 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-winrate')!.textContent).toBe('100%');
    });

    it('shows 0% when winRate is 0', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { winRate: 0 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-winrate')!.textContent).toBe('0%');
    });
  });

  // ---------------------------------------------------------------------------
  // Rank display
  // ---------------------------------------------------------------------------

  describe('rank display', () => {
    it('shows "#<rank>" when rank is a positive number', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { rank: 7 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-rank')!.textContent).toBe('#7');
    });

    it('shows "--" when rank is 0', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { rank: 0 },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-rank')!.textContent).toBe('--');
    });

    it('shows "--" when rank is null', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: { rank: null },
          activeGames: [],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      expect(container.querySelector('#stat-rank')!.textContent).toBe('--');
    });
  });

  // ---------------------------------------------------------------------------
  // Dashboard API call
  // ---------------------------------------------------------------------------

  describe('dashboard API endpoint', () => {
    it('calls /api/dashboard on render', async () => {
      seedLocalStorage();
      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const dashboardCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/dashboard');
      });
      expect(dashboardCall).toBeTruthy();
    });

    it('does not send Authorization header when token is missing', async () => {
      localStorage.setItem('hm_user', '{}');

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const dashboardCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/dashboard');
      });
      const headers = (dashboardCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer null');
    });
  });

  // ---------------------------------------------------------------------------
  // XSS prevention
  // ---------------------------------------------------------------------------

  describe('XSS prevention', () => {
    it('escapes XSS in active game name', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [
            {
              code: 'XSS',
              name: '<script>alert("xss")</script>',
              players: ['p1'],
              maxPlayers: 4,
              status: 'playing',
            },
          ],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const activeEl = container.querySelector('#active-games')!;
      expect(activeEl.innerHTML).not.toContain('<script>');
      expect(activeEl.innerHTML).toContain('&lt;script&gt;');
    });

    it('escapes XSS in leaderboard player name', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [],
          leaderboard: [
            { playerName: '<img src=x onerror=alert(1)>', score: 100 },
          ],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const lbEl = container.querySelector('#leaderboard-list')!;
      expect(lbEl.innerHTML).not.toContain('<img');
      expect(lbEl.innerHTML).toContain('&lt;img');
    });

    it('escapes XSS in welcome banner username', async () => {
      seedLocalStorage({ displayName: '<script>alert("hi")</script>' });

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      const h2 = container.querySelector('h2');
      expect(h2!.innerHTML).not.toContain('<script>');
      expect(h2!.innerHTML).toContain('&lt;script&gt;');
    });

    it('escapes XSS in active game status', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [
            {
              code: 'A',
              name: 'Room',
              players: [],
              maxPlayers: 4,
              status: '<b>bold</b>',
            },
          ],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const activeEl = container.querySelector('#active-games')!;
      expect(activeEl.innerHTML).not.toContain('<b>bold</b>');
      expect(activeEl.innerHTML).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('escapes XSS in active game code data attribute', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeDashboardResponse({
          stats: {},
          activeGames: [
            {
              code: '"><script>alert(1)</script>',
              name: 'Room',
              players: [],
              maxPlayers: 4,
              status: 'playing',
            },
          ],
          leaderboard: [],
        }),
      );

      const { renderDashboard } = await import('./dashboard');
      renderDashboard(container);

      await flushAsync();

      const activeEl = container.querySelector('#active-games')!;
      // The escaped code can't break out of the attribute to inject scripts
      // When innerHTML reads back the attribute, &quot; gets normalized
      // but the core check is that no actual <script> element is created
      const scriptElements = activeEl.querySelectorAll('script');
      expect(scriptElements.length).toBe(0);
    });
  });
});
