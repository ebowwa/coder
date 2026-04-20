/**
 * Tests for the Leaderboard Page module (src/leaderboard-page.ts)
 *
 * Covers: rendering structure, category tabs, search filtering,
 * player stats display, refresh functionality, and localStorage integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { leaderboard } from './leaderboard';

const mockNavigate = vi.fn();

vi.mock('./router', () => ({
  router: { navigate: mockNavigate },
}));

function createContainer(): HTMLDivElement {
  return document.createElement('div');
}

function seedLocalStorage(user: Record<string, unknown> = {}, token = 'test-token'): void {
  localStorage.setItem('hm_user', JSON.stringify(user));
  localStorage.setItem('hm_token', token);
}

async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('leaderboard-page', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    // Clear and re-populate the shared leaderboard singleton
    leaderboard.clear();
    leaderboard.addScore('Alice', 500, 'animals');
    leaderboard.addScore('Bob', 300, 'food');
    leaderboard.addScore('Carol', 400, 'animals');
    leaderboard.addScore('Dave', 200, 'general');
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // HTML Structure
  // ---------------------------------------------------------------------------

  describe('renderLeaderboardPage - HTML structure', () => {
    it('renders the page header with title', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toBe('Leaderboard');
    });

    it('renders the subtitle element', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const subtitle = container.querySelector('#lb-subtitle');
      expect(subtitle).toBeTruthy();
      expect(subtitle!.textContent).toContain('Top players');
    });

    it('renders the search input', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      expect(searchInput.placeholder).toContain('Search');
    });

    it('renders the refresh button', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const refreshBtn = container.querySelector('#lb-refresh');
      expect(refreshBtn).toBeTruthy();
      expect(refreshBtn!.textContent).toContain('Refresh');
    });

    it('renders category tabs', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tabs = container.querySelectorAll('.lb-tab');
      expect(tabs.length).toBeGreaterThanOrEqual(2); // "All" + at least 1 category
    });

    it('renders the "All" tab', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const allTab = container.querySelector('.lb-tab[data-category=""]') as HTMLElement;
      expect(allTab).toBeTruthy();
      expect(allTab.textContent).toContain('All');
    });

    it('renders category-specific tabs from data', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tabs = container.querySelectorAll('.lb-tab');
      const tabTexts = Array.from(tabs).map(t => (t as HTMLElement).dataset.category);
      // Should have: "" (All), "animals", "food", "general"
      expect(tabTexts).toContain('');
      expect(tabTexts).toContain('animals');
      expect(tabTexts).toContain('food');
      expect(tabTexts).toContain('general');
    });

    it('renders the leaderboard table body', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body');
      expect(tableBody).toBeTruthy();
    });

    it('renders "Your Stats" section', async () => {
      seedLocalStorage({ username: 'Alice' });
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const yourStats = container.querySelector('#lb-your-stats');
      expect(yourStats).toBeTruthy();
    });

    it('renders category breakdown section', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const breakdown = container.querySelector('#lb-category-breakdown');
      expect(breakdown).toBeTruthy();
    });

    it('renders recent games section', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const recent = container.querySelector('#lb-recent');
      expect(recent).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Leaderboard Table Data
  // ---------------------------------------------------------------------------

  describe('leaderboard table content', () => {
    it('shows player names from leaderboard data', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
      expect(tableBody.textContent).toContain('Bob');
      expect(tableBody.textContent).toContain('Carol');
      expect(tableBody.textContent).toContain('Dave');
    });

    it('shows scores in the table', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('500');
      expect(tableBody.textContent).toContain('400');
      expect(tableBody.textContent).toContain('300');
      expect(tableBody.textContent).toContain('200');
    });

    it('sorts entries by score descending', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body')!;
      const text = tableBody.textContent || '';
      const alicePos = text.indexOf('Alice');
      const carolPos = text.indexOf('Carol');
      const bobPos = text.indexOf('Bob');
      const davePos = text.indexOf('Dave');
      // Alice (500) should appear before Carol (400) before Bob (300) before Dave (200)
      expect(alicePos).toBeLessThan(carolPos);
      expect(carolPos).toBeLessThan(bobPos);
      expect(bobPos).toBeLessThan(davePos);
    });

    it('shows rank numbers in the table', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body')!;
      const text = tableBody.textContent || '';
      // Should have rank indicators 1, 2, 3, 4
      expect(text).toContain('1');
      expect(text).toContain('2');
      expect(text).toContain('3');
      expect(text).toContain('4');
    });

    it('shows empty state when no entries exist', async () => {
      seedLocalStorage();
      leaderboard.clear();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('No entries yet');
    });
  });

  // ---------------------------------------------------------------------------
  // Category Tabs
  // ---------------------------------------------------------------------------

  describe('category tab filtering', () => {
    it('clicking a category tab filters the table', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      // Click the "animals" tab
      const animalsTab = container.querySelector('.lb-tab[data-category="animals"]') as HTMLElement;
      expect(animalsTab).toBeTruthy();
      animalsTab.click();

      // Table should now only show animals entries
      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
      expect(tableBody.textContent).toContain('Carol');
      expect(tableBody.textContent).not.toContain('Bob');
    });

    it('clicking "All" tab shows all entries', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      // First filter to a category
      const foodTab = container.querySelector('.lb-tab[data-category="food"]') as HTMLElement;
      foodTab.click();

      // Now click "All"
      const allTab = container.querySelector('.lb-tab[data-category=""]') as HTMLElement;
      allTab.click();

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
      expect(tableBody.textContent).toContain('Bob');
    });

    it('updates subtitle when category is selected', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const animalsTab = container.querySelector('.lb-tab[data-category="animals"]') as HTMLElement;
      animalsTab.click();

      const subtitle = container.querySelector('#lb-subtitle')!;
      expect(subtitle.textContent).toContain('animals');
    });

    it('resets subtitle to "all categories" when All tab is clicked', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const animalsTab = container.querySelector('.lb-tab[data-category="animals"]') as HTMLElement;
      animalsTab.click();

      const allTab = container.querySelector('.lb-tab[data-category=""]') as HTMLElement;
      allTab.click();

      const subtitle = container.querySelector('#lb-subtitle')!;
      expect(subtitle.textContent).toContain('all categories');
    });
  });

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  describe('search filtering', () => {
    it('filters entries by player name', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      searchInput.value = 'Alice';
      searchInput.dispatchEvent(new Event('input'));

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
      expect(tableBody.textContent).not.toContain('Bob');
      expect(tableBody.textContent).not.toContain('Carol');
    });

    it('is case-insensitive', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      searchInput.value = 'alice';
      searchInput.dispatchEvent(new Event('input'));

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
    });

    it('shows no results for non-matching query', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      searchInput.value = 'ZZZnonexistent';
      searchInput.dispatchEvent(new Event('input'));

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('No entries yet');
    });

    it('restores all results when search is cleared', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      searchInput.value = 'Alice';
      searchInput.dispatchEvent(new Event('input'));

      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Alice');
      expect(tableBody.textContent).toContain('Bob');
    });

    it('handles partial name matches', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
      searchInput.value = 'Da';
      searchInput.dispatchEvent(new Event('input'));

      const tableBody = container.querySelector('#lb-table-body')!;
      expect(tableBody.textContent).toContain('Dave');
      expect(tableBody.textContent).not.toContain('Alice');
    });
  });

  // ---------------------------------------------------------------------------
  // Your Stats
  // ---------------------------------------------------------------------------

  describe('Your Stats sidebar', () => {
    it('shows rank and stats for logged-in user', async () => {
      seedLocalStorage({ username: 'Alice' });
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const stats = container.querySelector('#lb-your-stats')!;
      expect(stats.textContent).toContain('500'); // totalScore
      expect(stats.textContent).toContain('1');    // gamesPlayed
    });

    it('shows "Log in" message when no user', async () => {
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const stats = container.querySelector('#lb-your-stats')!;
      expect(stats.textContent).toContain('Log in');
    });

    it('shows "--" rank for user not on leaderboard', async () => {
      seedLocalStorage({ username: 'NewPlayer' });
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const stats = container.querySelector('#lb-your-stats')!;
      expect(stats.textContent).toContain('--');
    });

    it('uses displayName for lookup when available', async () => {
      seedLocalStorage({ displayName: 'Bob', username: 'bob99' });
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const stats = container.querySelector('#lb-your-stats')!;
      expect(stats.textContent).toContain('300'); // Bob's total score
    });
  });

  // ---------------------------------------------------------------------------
  // Category Breakdown
  // ---------------------------------------------------------------------------

  describe('category breakdown', () => {
    it('lists all categories', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const breakdown = container.querySelector('#lb-category-breakdown')!;
      expect(breakdown.textContent).toContain('animals');
      expect(breakdown.textContent).toContain('food');
      expect(breakdown.textContent).toContain('general');
    });

    it('shows top score per category', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const breakdown = container.querySelector('#lb-category-breakdown')!;
      // Animals top is Alice with 500
      expect(breakdown.textContent).toContain('500');
    });

    it('shows empty message when no categories', async () => {
      seedLocalStorage();
      leaderboard.clear();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const breakdown = container.querySelector('#lb-category-breakdown')!;
      expect(breakdown.textContent).toContain('No categories');
    });
  });

  // ---------------------------------------------------------------------------
  // Recent Games
  // ---------------------------------------------------------------------------

  describe('recent games section', () => {
    it('shows recent entries', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const recent = container.querySelector('#lb-recent')!;
      expect(recent.textContent).toContain('Alice');
    });

    it('shows "No recent games" when empty', async () => {
      seedLocalStorage();
      leaderboard.clear();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const recent = container.querySelector('#lb-recent')!;
      expect(recent.textContent).toContain('No recent games');
    });
  });

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  describe('refresh button', () => {
    it('does not crash on fetch failure', async () => {
      seedLocalStorage();
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const refreshBtn = container.querySelector('#lb-refresh') as HTMLButtonElement;
      expect(refreshBtn).toBeTruthy();
      expect(() => refreshBtn.click()).not.toThrow();
    });

    it('fetches from /api/leaderboard on refresh', async () => {
      seedLocalStorage();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ entries: [] }),
      } as Response);

      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const refreshBtn = container.querySelector('#lb-refresh') as HTMLButtonElement;
      refreshBtn.click();

      await flushAsync();

      const lbCall = fetchSpy.mock.calls.find(c => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/leaderboard');
      });
      expect(lbCall).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty localStorage without crashing', async () => {
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      expect(() => renderLeaderboardPage(container)).not.toThrow();
    });

    it('handles malformed hm_user gracefully', async () => {
      localStorage.setItem('hm_user', '{bad json');
      localStorage.setItem('hm_token', 'token');

      const { renderLeaderboardPage } = await import('./leaderboard-page');
      // JSON.parse will throw, which propagates - same as dashboard behavior
      expect(() => renderLeaderboardPage(container)).toThrow();
    });

    it('handles empty user object', async () => {
      localStorage.setItem('hm_user', '{}');
      localStorage.setItem('hm_token', 'token');

      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
    });

    it('renders the table with a grid layout', async () => {
      seedLocalStorage();
      const { renderLeaderboardPage } = await import('./leaderboard-page');
      renderLeaderboardPage(container);

      const grids = container.querySelectorAll('[style*="grid-template-columns"]');
      expect(grids.length).toBeGreaterThanOrEqual(2);
    });
  });
});
