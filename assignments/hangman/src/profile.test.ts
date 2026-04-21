/**
 * Tests for the profile module
 *
 * Validates renderProfile HTML structure, profile stats loading,
 * theme selection, edit profile modal, upgrade flow, and
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
  // Use the global document object provided by jsdom
  if (typeof document === 'undefined') {
    throw new Error('document is not available - jsdom environment not properly set up');
  }
  return document.createElement('div');
}

function seedLocalStorage(
  user: Record<string, unknown> = {},
  token = 'test-token',
): void {
  localStorage.setItem('hm_user', JSON.stringify(user));
  localStorage.setItem('hm_token', token);
}

function makeProfileResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: () => Promise.resolve(overrides),
  };
}

/**
 * Flush all pending microtasks so async loadProfileStats can complete.
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('profile', () => {
  let container: HTMLDivElement;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    mockNavigate.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeProfileResponse({
        stats: {
          totalGames: 50,
          wins: 30,
          losses: 20,
          winRate: 0.6,
          bestStreak: 8,
          rank: 15,
        },
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
  // renderProfile – HTML structure
  // ---------------------------------------------------------------------------

  describe('renderProfile – HTML structure', () => {
    it('renders profile header with username from localStorage', async () => {
      seedLocalStorage({ username: 'alice' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toContain('alice');
    });

    it('renders profile header with displayName when available', async () => {
      seedLocalStorage({ displayName: 'Alice Smith', username: 'alice' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Alice Smith');
    });

    it('renders "Player" as default name when no user data', async () => {
      seedLocalStorage({});
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Player');
    });

    it('renders the Edit Profile button', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const btn = container.querySelector('#edit-profile-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Edit Profile');
    });

    it('renders profile stats grid with all stat elements', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const ids = [
        'p-stat-total',
        'p-stat-wins',
        'p-stat-losses',
        'p-stat-winrate',
        'p-stat-streak',
        'p-stat-rank',
      ];
      for (const id of ids) {
        const el = container.querySelector(`#${id}`);
        expect(el, `Expected #${id} to exist`).toBeTruthy();
      }
    });

    it('stat elements start with placeholder "--"', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      expect(container.querySelector('#p-stat-total')!.textContent).toBe('--');
      expect(container.querySelector('#p-stat-wins')!.textContent).toBe('--');
      expect(container.querySelector('#p-stat-losses')!.textContent).toBe('--');
      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('--');
      expect(container.querySelector('#p-stat-streak')!.textContent).toBe('--');
      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('--');
    });

    it('renders the profile stats line with "Loading..." before fetch completes', async () => {
      seedLocalStorage({ username: 'bob' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const statGames = container.querySelector('#profile-stat-games');
      expect(statGames).toBeTruthy();
      expect(statGames!.textContent).toContain('Loading');
    });

    it('renders theme grid with 4 theme cards', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const themeCards = container.querySelectorAll('.theme-card');
      expect(themeCards.length).toBe(4);
    });

    it('renders the theme section heading', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const heading = container.querySelector('#theme-grid');
      expect(heading).toBeTruthy();
    });

    it('renders edit profile modal (hidden) with display name input', async () => {
      seedLocalStorage({ displayName: 'Test' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const editDisplay = container.querySelector('#edit-display') as HTMLInputElement;
      expect(editDisplay).toBeTruthy();
      expect(editDisplay.value).toBe('Test');
    });

    it('renders edit profile modal with avatar color input', async () => {
      seedLocalStorage({ avatar: '#ff0000' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const avatarInput = container.querySelector('#edit-avatar-color') as HTMLInputElement;
      expect(avatarInput).toBeTruthy();
      expect(avatarInput.value).toBe('#ff0000');
    });

    it('renders save and cancel buttons in edit modal', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      expect(container.querySelector('#edit-save')).toBeTruthy();
      expect(container.querySelector('#edit-cancel')).toBeTruthy();
    });

    it('shows PRO badge when user tier is pro', async () => {
      seedLocalStorage({ username: 'proUser', tier: 'pro' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.innerHTML).toContain('PRO');
    });

    it('does not show PRO badge for free tier users', async () => {
      seedLocalStorage({ username: 'freeUser', tier: 'free' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.innerHTML).not.toContain('PRO');
    });

    it('shows Upgrade to Pro button for non-pro users', async () => {
      seedLocalStorage({ tier: 'free' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const upgradeBtn = container.querySelector('#upgrade-btn') as HTMLButtonElement;
      expect(upgradeBtn).toBeTruthy();
      expect(upgradeBtn.textContent).toContain('Upgrade to Pro');
    });

    it('does not show Upgrade button for pro users', async () => {
      seedLocalStorage({ tier: 'pro' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const upgradeBtn = container.querySelector('#upgrade-btn');
      expect(upgradeBtn).toBeNull();
    });

    it('shows Pro Member message for pro users', async () => {
      seedLocalStorage({ tier: 'pro' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const themeSection = container.querySelector('#theme-grid')?.parentElement;
      expect(themeSection!.textContent).toContain('Pro Member - All themes unlocked');
    });

    it('displays avatar circle with first letter of displayName', async () => {
      seedLocalStorage({ displayName: 'Charlie' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      // The avatar div shows the first character of displayName
      const avatarDiv = container.querySelector('[style*="border-radius: 50%"]');
      expect(avatarDiv).toBeTruthy();
      expect(avatarDiv!.textContent).toBe('C');
    });

    it('displays "@" followed by username', async () => {
      seedLocalStorage({ username: 'bob99' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const p = container.querySelector('p[style*="color: #888"]');
      expect(p).toBeTruthy();
      expect(p!.textContent).toBe('@bob99');
    });
  });

  // ---------------------------------------------------------------------------
  // loadProfileStats – data-driven rendering via fetch
  // ---------------------------------------------------------------------------

  describe('loadProfileStats – stats update', () => {
    it('updates all stat elements after fetch resolves', async () => {
      seedLocalStorage({ username: 'user1' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-total')!.textContent).toBe('50');
      expect(container.querySelector('#p-stat-wins')!.textContent).toBe('30');
      expect(container.querySelector('#p-stat-losses')!.textContent).toBe('20');
      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('60%');
      expect(container.querySelector('#p-stat-streak')!.textContent).toBe('8');
      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('#15');
    });

    it('updates profile stat games line', async () => {
      seedLocalStorage({ username: 'user1' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      const statGames = container.querySelector('#profile-stat-games');
      expect(statGames!.textContent).toBe('50 games');
    });

    it('updates profile stat win rate line', async () => {
      seedLocalStorage({ username: 'user1' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      const statWR = container.querySelector('#profile-stat-wr');
      expect(statWR!.textContent).toBe('60% WR');
    });

    it('handles zero stats gracefully', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({
          stats: {
            totalGames: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            bestStreak: 0,
            rank: null,
          },
        }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-total')!.textContent).toBe('0');
      expect(container.querySelector('#p-stat-wins')!.textContent).toBe('0');
      expect(container.querySelector('#p-stat-losses')!.textContent).toBe('0');
      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('0%');
      expect(container.querySelector('#p-stat-streak')!.textContent).toBe('0');
      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('--');
    });

    it('handles stats object being missing', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({}),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-total')!.textContent).toBe('0');
      expect(container.querySelector('#p-stat-wins')!.textContent).toBe('0');
    });

    it('does not update stats when response is not ok', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      // Stats should remain at default "--"
      expect(container.querySelector('#p-stat-total')!.textContent).toBe('--');
    });

    it('handles fetch error gracefully without crashing', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const { renderProfile } = await import('./profile');
      expect(() => renderProfile(container)).not.toThrow();
    });

    it('sends Authorization header with token from localStorage', async () => {
      seedLocalStorage({ username: 'user1' }, 'my-profile-token');
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      const profileCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/profile/');
      });
      expect(profileCall).toBeTruthy();
      const headers = (profileCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer my-profile-token');
    });

    it('calls /api/profile/{username} endpoint', async () => {
      seedLocalStorage({ username: 'cooluser' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      const profileCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/profile/cooluser');
      });
      expect(profileCall).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Edit profile modal
  // ---------------------------------------------------------------------------

  describe('Edit Profile modal', () => {
    it('modal is initially hidden', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const modal = container.querySelector('#edit-modal') as HTMLDivElement;
      expect(modal).toBeTruthy();
      // The modal uses inline style with display: none (appears twice in the HTML)
      expect(modal.getAttribute('style')).toContain('display: none');
    });

    it('shows modal when Edit Profile button is clicked', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const btn = container.querySelector('#edit-profile-btn') as HTMLButtonElement;
      btn.click();

      const modal = container.querySelector('#edit-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('flex');
    });

    it('hides modal when Cancel button is clicked', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const btn = container.querySelector('#edit-profile-btn') as HTMLButtonElement;
      btn.click();

      const cancelBtn = container.querySelector('#edit-cancel') as HTMLButtonElement;
      cancelBtn.click();

      const modal = container.querySelector('#edit-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');
    });

    it('sends PUT /api/profile with displayName and avatar on save', async () => {
      seedLocalStorage({ displayName: 'Old Name', avatar: '#4ecdc4' }, 'save-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/') && init?.method !== 'PUT') {
          return Promise.resolve(
            makeProfileResponse({ stats: {} }),
          );
        }
        if (u.includes('/api/profile') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { displayName: 'New Name', avatar: '#ff0000' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      // Open modal
      container.querySelector('#edit-profile-btn')!.dispatchEvent(new MouseEvent('click'));

      // Change display name
      const nameInput = container.querySelector('#edit-display') as HTMLInputElement;
      nameInput.value = 'New Name';

      // Click save
      container.querySelector('#edit-save')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const saveCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        const init = c[1] as RequestInit;
        return u.includes('/api/profile') && init?.method === 'PUT';
      });
      expect(saveCall).toBeTruthy();
      const body = JSON.parse((saveCall![1] as RequestInit).body as string);
      expect(body.displayName).toBe('New Name');
    });

    it('hides modal and navigates after successful save', async () => {
      seedLocalStorage({ displayName: 'Test' }, 'save-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/') && init?.method !== 'PUT') {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/profile') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { displayName: 'Updated' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      container.querySelector('#edit-profile-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#edit-save')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const modal = container.querySelector('#edit-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');
      expect(mockNavigate).toHaveBeenCalledWith('profile');
    });

    it('updates localStorage after successful save', async () => {
      seedLocalStorage({ displayName: 'Test' }, 'save-token');
      const newUser = { displayName: 'Updated Name', username: 'test' };
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/') && init?.method !== 'PUT') {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/profile') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: newUser }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      container.querySelector('#edit-profile-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#edit-save')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const stored = JSON.parse(localStorage.getItem('hm_user')!);
      expect(stored.displayName).toBe('Updated Name');
    });
  });

  // ---------------------------------------------------------------------------
  // Theme selection
  // ---------------------------------------------------------------------------

  describe('Theme selection', () => {
    it('sends PUT /api/theme when a theme card is clicked', async () => {
      seedLocalStorage({ tier: 'pro' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/')) {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/theme')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { theme: 'neon', tier: 'pro' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const neonCard = container.querySelector('[data-theme="neon"]') as HTMLElement;
      expect(neonCard).toBeTruthy();
      neonCard.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const themeCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/theme');
      });
      expect(themeCall).toBeTruthy();
      const init = themeCall![1] as RequestInit;
      expect(init.method).toBe('PUT');
      const body = JSON.parse(init.body as string);
      expect(body.theme).toBe('neon');
    });

    it('updates localStorage and navigates after successful theme change', async () => {
      seedLocalStorage({ tier: 'pro' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/')) {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/theme')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { theme: 'dark', tier: 'pro' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const darkCard = container.querySelector('[data-theme="dark"]') as HTMLElement;
      darkCard.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const stored = JSON.parse(localStorage.getItem('hm_user')!);
      expect(stored.theme).toBe('dark');
      expect(mockNavigate).toHaveBeenCalledWith('profile');
    });

    it('highlights active theme based on user data', async () => {
      seedLocalStorage({ tier: 'pro', theme: 'default' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const defaultCard = container.querySelector('[data-theme="default"]') as HTMLElement;
      // The active theme has a border color of #4ecdc4
      expect(defaultCard.getAttribute('style')).toContain('#4ecdc4');
    });
  });

  // ---------------------------------------------------------------------------
  // Upgrade to Pro
  // ---------------------------------------------------------------------------

  describe('Upgrade to Pro', () => {
    it('sends POST /api/upgrade when Upgrade button is clicked', async () => {
      seedLocalStorage({ tier: 'free' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/')) {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/upgrade')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { tier: 'pro' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const upgradeBtn = container.querySelector('#upgrade-btn') as HTMLButtonElement;
      upgradeBtn.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const upgradeCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/upgrade');
      });
      expect(upgradeCall).toBeTruthy();
      const init = upgradeCall![1] as RequestInit;
      expect(init.method).toBe('POST');
    });

    it('updates localStorage and navigates after successful upgrade', async () => {
      seedLocalStorage({ tier: 'free' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/profile/')) {
          return Promise.resolve(makeProfileResponse({ stats: {} }));
        }
        if (u.includes('/api/upgrade')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { tier: 'pro' } }),
          } as Response);
        }
        return Promise.resolve(makeProfileResponse({ stats: {} }));
      });

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      container.querySelector('#upgrade-btn')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const stored = JSON.parse(localStorage.getItem('hm_user')!);
      expect(stored.tier).toBe('pro');
      expect(mockNavigate).toHaveBeenCalledWith('profile');
    });
  });

  // ---------------------------------------------------------------------------
  // localStorage interaction
  // ---------------------------------------------------------------------------

  describe('localStorage interaction', () => {
    it('reads hm_user and hm_token from localStorage', async () => {
      seedLocalStorage({ displayName: 'TestUser' }, 'tok-123');
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('TestUser');

      await flushAsync();

      const profileCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/profile/');
      });
      const headers = (profileCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer tok-123');
    });

    it('handles empty localStorage with empty user object', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      expect(() => renderProfile(container)).not.toThrow();
    });

    it('prefers displayName over username', async () => {
      seedLocalStorage({ displayName: 'Display', username: 'uname' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('Display');
    });

    it('falls back to username when displayName is absent', async () => {
      seedLocalStorage({ username: 'fallback' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const h2 = container.querySelector('h2');
      expect(h2!.textContent).toContain('fallback');
    });
  });

  // ---------------------------------------------------------------------------
  // Win rate calculation
  // ---------------------------------------------------------------------------

  describe('win rate display', () => {
    it('rounds win rate to nearest percentage', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({
          stats: { winRate: 0.666, totalGames: 10, wins: 7, losses: 3, bestStreak: 2 },
        }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('67%');
    });

    it('shows 100% for winRate of 1', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({
          stats: { winRate: 1.0, totalGames: 10, wins: 10, losses: 0, bestStreak: 10 },
        }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('100%');
    });

    it('shows 0% when winRate is 0', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({
          stats: { winRate: 0, totalGames: 5, wins: 0, losses: 5, bestStreak: 0 },
        }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-winrate')!.textContent).toBe('0%');
    });
  });

  // ---------------------------------------------------------------------------
  // Rank display
  // ---------------------------------------------------------------------------

  describe('rank display', () => {
    it('shows "#<rank>" when rank is a positive number', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({ stats: { rank: 7 } }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('#7');
    });

    it('shows "--" when rank is 0', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({ stats: { rank: 0 } }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('--');
    });

    it('shows "--" when rank is null', async () => {
      seedLocalStorage({ username: 'user1' });
      fetchSpy.mockResolvedValue(
        makeProfileResponse({ stats: { rank: null } }),
      );

      const { renderProfile } = await import('./profile');
      renderProfile(container);

      await flushAsync();

      expect(container.querySelector('#p-stat-rank')!.textContent).toBe('--');
    });
  });

  // ---------------------------------------------------------------------------
  // Theme cards data attributes
  // ---------------------------------------------------------------------------

  describe('theme cards', () => {
    it('has 4 theme cards with correct data-theme values', async () => {
      seedLocalStorage();
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const themes = ['default', 'dark', 'neon', 'classic-wood'];
      for (const theme of themes) {
        const card = container.querySelector(`[data-theme="${theme}"]`);
        expect(card, `Expected theme card for "${theme}"`).toBeTruthy();
      }
    });

    it('shows lock icon on pro themes for free users', async () => {
      seedLocalStorage({ tier: 'free' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      // Dark theme should have a lock for free users
      const darkCard = container.querySelector('[data-theme="dark"]');
      expect(darkCard!.innerHTML).toContain('🔒');
    });

    it('does not show lock icon on pro themes for pro users', async () => {
      seedLocalStorage({ tier: 'pro' });
      const { renderProfile } = await import('./profile');
      renderProfile(container);

      const darkCard = container.querySelector('[data-theme="dark"]');
      expect(darkCard!.innerHTML).not.toContain('🔒');
    });
  });
});
