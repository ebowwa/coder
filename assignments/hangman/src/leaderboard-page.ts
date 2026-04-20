/**
 * Leaderboard Page - Full dedicated leaderboard view
 *
 * Shows: global rankings, per-category breakdowns, player search,
 * personal stats, and category filter tabs.
 */

import { Leaderboard, leaderboard as lb } from './leaderboard';
import { router } from './router';
import { escapeHtml } from './escape-html';

const API = '';

export function renderLeaderboardPage(container: HTMLDivElement): void {
  const user = JSON.parse(localStorage.getItem('hm_user') || '{}');
  const token = localStorage.getItem('hm_token');

  const categories = lb.getCategories();
  const activeCategory = categories.length > 0 ? categories[0] : '';

  container.innerHTML = `
    <div style="padding: 30px; max-width: 1100px; margin: 0 auto;">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%);
        border-radius: 16px; padding: 24px 30px; margin-bottom: 24px;
        border: 1px solid rgba(78,205,196,0.2);
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div>
          <h2 style="color: #fff; margin: 0 0 4px; font-size: 1.5em;">Leaderboard</h2>
          <p style="color: #888; margin: 0; font-size: 0.9em;" id="lb-subtitle">
            Top players across all categories
          </p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="lb-search" placeholder="Search player..." style="
            padding: 10px 14px; border: 2px solid #333; border-radius: 8px;
            background: #0f0f1a; color: #fff; font-size: 0.9em; width: 200px;
          ">
          <button id="lb-refresh" style="
            padding: 10px 16px; border: none; border-radius: 8px;
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            color: #fff; font-weight: bold; cursor: pointer; font-size: 0.9em;
          ">Refresh</button>
        </div>
      </div>

      <!-- Category Tabs -->
      <div id="lb-category-tabs" style="
        display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
      ">
        <button class="lb-tab" data-category="" style="
          padding: 8px 16px; border: 1px solid rgba(78,205,196,0.3); border-radius: 20px;
          background: rgba(78,205,196,0.15); color: #4ecdc4;
          cursor: pointer; font-size: 0.85em; font-weight: 500; transition: all 0.2s;
        ">All</button>
        ${categories.map(cat => `
          <button class="lb-tab" data-category="${cat}" style="
            padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
            background: transparent; color: #aaa;
            cursor: pointer; font-size: 0.85em; transition: all 0.2s;
          ">${cat}</button>
        `).join('')}
      </div>

      <!-- Main content grid -->
      <div style="display: grid; grid-template-columns: 1fr 320px; gap: 24px;">
        <!-- Leaderboard Table -->
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="
            display: grid; grid-template-columns: 50px 1fr 100px 100px 80px;
            padding: 10px 12px; margin-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          ">
            <span style="color: #666; font-size: 0.8em; font-weight: bold;">#</span>
            <span style="color: #666; font-size: 0.8em; font-weight: bold;">Player</span>
            <span style="color: #666; font-size: 0.8em; font-weight: bold; text-align: right;">Score</span>
            <span style="color: #666; font-size: 0.8em; font-weight: bold; text-align: right;">Games</span>
            <span style="color: #666; font-size: 0.8em; font-weight: bold; text-align: right;">Best</span>
          </div>
          <div id="lb-table-body">
            ${renderLeaderboardRows(lb.getTopScores(50))}
          </div>
        </div>

        <!-- Sidebar: Your Stats + Top Categories -->
        <div>
          <!-- Your Rank Card -->
          <div style="
            background: linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%);
            border-radius: 16px; padding: 20px; margin-bottom: 20px;
            border: 1px solid rgba(78,205,196,0.2);
          ">
            <h3 style="color: #4ecdc4; margin: 0 0 12px; font-size: 0.95em;">Your Stats</h3>
            <div id="lb-your-stats">
              ${renderYourStats(user.displayName || user.username || '')}
            </div>
          </div>

          <!-- Category Breakdown -->
          <div style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px; padding: 20px; margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.08);
          ">
            <h3 style="color: #fff; margin: 0 0 12px; font-size: 0.95em;">Categories</h3>
            <div id="lb-category-breakdown">
              ${renderCategoryBreakdown(categories)}
            </div>
          </div>

          <!-- Recently Active -->
          <div style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px; padding: 20px;
            border: 1px solid rgba(255,255,255,0.08);
          ">
            <h3 style="color: #fff; margin: 0 0 12px; font-size: 0.95em;">Recent Games</h3>
            <div id="lb-recent">
              ${renderRecentEntries(lb.getTopScores(5))}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  wireLeaderboardEvents(container, lb);
}

function renderLeaderboardRows(entries: ReturnType<Leaderboard['getTopScores']>): string {
  if (entries.length === 0) {
    return '<div style="color: #666; text-align: center; padding: 40px; font-size: 0.9em;">No entries yet. Play some games!</div>';
  }

  return entries.map((entry, i) => {
    const rank = i + 1;
    const playerStats = lb.getPlayerStats(entry.playerName);
    const rankColor = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#888';
    const rowBg = rank <= 3 ? 'rgba(78,205,196,0.05)' : 'transparent';

    return `
      <div style="
        display: grid; grid-template-columns: 50px 1fr 100px 100px 80px;
        padding: 10px 12px; margin-bottom: 2px;
        background: ${rowBg}; border-radius: 6px;
        align-items: center;
      ">
        <span style="color: ${rankColor}; font-weight: bold; font-size: 0.9em;">${rank}</span>
        <span style="color: #fff; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(entry.playerName)}</span>
        <span style="color: #4ecdc4; font-size: 0.85em; font-weight: bold; text-align: right;">${entry.score.toLocaleString()}</span>
        <span style="color: #aaa; font-size: 0.85em; text-align: right;">${playerStats.gamesPlayed}</span>
        <span style="color: #ffe66d; font-size: 0.85em; text-align: right;">${playerStats.bestScore}</span>
      </div>
    `;
  }).join('');
}

function renderYourStats(playerName: string): string {
  if (!playerName) {
    return '<div style="color: #666; font-size: 0.85em;">Log in to see your stats</div>';
  }

  const stats = lb.getPlayerStats(playerName);
  const rank = lb.getPlayerRank(playerName);

  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        <div style="color: #4ecdc4; font-size: 1.4em; font-weight: bold;">${rank > 0 ? '#' + rank : '--'}</div>
        <div style="color: #888; font-size: 0.75em;">Rank</div>
      </div>
      <div>
        <div style="color: #4caf50; font-size: 1.4em; font-weight: bold;">${stats.totalScore.toLocaleString()}</div>
        <div style="color: #888; font-size: 0.75em;">Total Score</div>
      </div>
      <div>
        <div style="color: #ffe66d; font-size: 1.4em; font-weight: bold;">${stats.gamesPlayed}</div>
        <div style="color: #888; font-size: 0.75em;">Games</div>
      </div>
      <div>
        <div style="color: #ff6b6b; font-size: 1.4em; font-weight: bold;">${stats.bestScore}</div>
        <div style="color: #888; font-size: 0.75em;">Best Score</div>
      </div>
    </div>
  `;
}

function renderCategoryBreakdown(categories: string[]): string {
  if (categories.length === 0) {
    return '<div style="color: #666; font-size: 0.85em;">No categories yet</div>';
  }

  return categories.map(cat => {
    const topEntries = lb.getTopScores(1, cat);
    const topScore = topEntries.length > 0 ? topEntries[0].score : 0;
    const topPlayer = topEntries.length > 0 ? topEntries[0].playerName : '--';

    return `
      <div style="
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      ">
        <span style="color: #aaa; font-size: 0.85em;">${escapeHtml(cat)}</span>
        <div>
          <span style="color: #4ecdc4; font-size: 0.85em; font-weight: bold;">${topScore}</span>
          <span style="color: #666; font-size: 0.75em; margin-left: 4px;">${escapeHtml(topPlayer)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentEntries(entries: ReturnType<Leaderboard['getTopScores']>): string {
  if (entries.length === 0) {
    return '<div style="color: #666; font-size: 0.85em;">No recent games</div>';
  }

  return entries.map(entry => {
    const timeAgo = formatTimeAgo(entry.timestamp);

    return `
      <div style="
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      ">
        <div>
          <div style="color: #fff; font-size: 0.85em;">${escapeHtml(entry.playerName)}</div>
          <div style="color: #666; font-size: 0.75em;">${timeAgo}</div>
        </div>
        <span style="color: #4ecdc4; font-size: 0.85em; font-weight: bold;">${entry.score}</span>
      </div>
    `;
  }).join('');
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function wireLeaderboardEvents(container: HTMLDivElement, leaderboard: Leaderboard): void {
  // Category tab filtering
  const tabs = container.querySelectorAll('.lb-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = (tab as HTMLElement).dataset.category || undefined;

      // Update tab active states
      tabs.forEach(t => {
        const el = t as HTMLElement;
        el.style.background = 'transparent';
        el.style.color = '#aaa';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
      });
      (tab as HTMLElement).style.background = 'rgba(78,205,196,0.15)';
      (tab as HTMLElement).style.color = '#4ecdc4';
      (tab as HTMLElement).style.borderColor = 'rgba(78,205,196,0.3)';

      // Update subtitle
      const subtitle = container.querySelector('#lb-subtitle');
      if (subtitle) {
        subtitle.textContent = category
          ? `Top players in ${category}`
          : 'Top players across all categories';
      }

      // Update table
      const tableBody = container.querySelector('#lb-table-body');
      if (tableBody) {
        const entries = leaderboard.getTopScores(50, category);
        tableBody.innerHTML = renderLeaderboardRows(entries);
      }
    });
  });

  // Search
  const searchInput = container.querySelector('#lb-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const tableBody = container.querySelector('#lb-table-body');
    if (!tableBody) return;

    let entries = leaderboard.getTopScores(50);
    if (query) {
      entries = entries.filter(e => e.playerName.toLowerCase().includes(query));
    }
    tableBody.innerHTML = renderLeaderboardRows(entries);
  });

  // Refresh button
  container.querySelector('#lb-refresh')?.addEventListener('click', () => {
    // Re-fetch from server
    fetchLeaderboardFromServer(container, leaderboard);
  });

  // Initial server fetch
  fetchLeaderboardFromServer(container, leaderboard);
}

async function fetchLeaderboardFromServer(container: HTMLDivElement, leaderboard: Leaderboard): Promise<void> {
  const token = localStorage.getItem('hm_token');
  try {
    const res = await fetch(`${API}/api/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const data = await res.json();
    const entries = data.entries || [];

    // Merge server data into local leaderboard
    const tableBody = container.querySelector('#lb-table-body');
    if (tableBody && entries.length > 0) {
      tableBody.innerHTML = renderLeaderboardRows(entries);
    }
  } catch {
    // Silently fail - local data is still shown
  }
}
