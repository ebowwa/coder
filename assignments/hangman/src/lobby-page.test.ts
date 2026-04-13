/**
 * Tests for the lobby-page module
 *
 * Validates renderLobbyPage HTML structure, room list loading,
 * create room modal interaction, join room behavior, filter elements,
 * and localStorage-based user resolution.
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

function seedLocalStorage(
  user: Record<string, unknown> = {},
  token = 'test-token',
): void {
  localStorage.setItem('hm_user', JSON.stringify(user));
  localStorage.setItem('hm_token', token);
}

function makeRoomsResponse(rooms: unknown[] = []) {
  return {
    ok: true,
    json: () => Promise.resolve(rooms),
  };
}

function makeSampleRooms() {
  return [
    {
      name: 'Fun Room',
      code: 'ABC123',
      hostName: 'Alice',
      category: 'animals',
      difficulty: 'easy',
      visibility: 'public',
      players: ['p1', 'p2'],
      maxPlayers: 4,
    },
    {
      name: 'Pro Game',
      code: 'DEF456',
      hostName: 'Bob',
      category: 'science',
      difficulty: 'hard',
      visibility: 'private',
      players: ['p3'],
      maxPlayers: 2,
    },
  ];
}

/**
 * Flush all pending microtasks so async loadRooms can complete.
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lobby-page', () => {
  let container: HTMLDivElement;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    mockNavigate.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeRoomsResponse([]),
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
  // renderLobbyPage – HTML structure
  // ---------------------------------------------------------------------------

  describe('renderLobbyPage – HTML structure', () => {
    it('renders the Game Lobby heading', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toContain('Game Lobby');
    });

    it('renders the Create Room button', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const btn = container.querySelector('#create-room-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Create Room');
    });

    it('renders the category filter select', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const select = container.querySelector('#filter-category') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });

    it('renders category filter with correct options', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const select = container.querySelector('#filter-category') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toContain('any');
      expect(values).toContain('animals');
      expect(values).toContain('food');
      expect(values).toContain('science');
      expect(values).toContain('sports');
      expect(values).toContain('countries');
    });

    it('renders the difficulty filter select', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const select = container.querySelector('#filter-difficulty') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });

    it('renders difficulty filter with correct options', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const select = container.querySelector('#filter-difficulty') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toContain('any');
      expect(values).toContain('easy');
      expect(values).toContain('medium');
      expect(values).toContain('hard');
    });

    it('renders the rooms list container', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList).toBeTruthy();
    });

    it('shows "Loading rooms..." initially', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Loading rooms');
    });

    it('renders create room modal with correct elements', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      expect(container.querySelector('#create-modal')).toBeTruthy();
      expect(container.querySelector('#room-name')).toBeTruthy();
      expect(container.querySelector('#room-visibility')).toBeTruthy();
      expect(container.querySelector('#room-category')).toBeTruthy();
      expect(container.querySelector('#room-difficulty')).toBeTruthy();
      expect(container.querySelector('#room-max-players')).toBeTruthy();
      expect(container.querySelector('#room-max-rounds')).toBeTruthy();
    });

    it('renders create and cancel buttons', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      expect(container.querySelector('#create-submit')).toBeTruthy();
      expect(container.querySelector('#create-cancel')).toBeTruthy();
    });

    it('create modal is initially hidden', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal).toBeTruthy();
      expect(modal.getAttribute('style')).toContain('display: none');
    });

    it('default max players is 8', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const maxPlayersSelect = container.querySelector('#room-max-players') as HTMLSelectElement;
      expect(maxPlayersSelect.value).toBe('8');
    });

    it('default max rounds is 5', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const maxRoundsSelect = container.querySelector('#room-max-rounds') as HTMLSelectElement;
      expect(maxRoundsSelect.value).toBe('5');
    });
  });

  // ---------------------------------------------------------------------------
  // loadRooms – data-driven rendering
  // ---------------------------------------------------------------------------

  describe('loadRooms – room list rendering', () => {
    it('shows empty state when no rooms available', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(makeRoomsResponse([]));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('No public rooms available');
      expect(roomsList!.textContent).toContain('Create one to get started');
    });

    it('renders room entries with name and details', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Fun Room');
      expect(roomsList!.textContent).toContain('Pro Game');
      expect(roomsList!.textContent).toContain('Alice');
      expect(roomsList!.textContent).toContain('Bob');
      expect(roomsList!.textContent).toContain('animals');
      expect(roomsList!.textContent).toContain('science');
      expect(roomsList!.textContent).toContain('easy');
      expect(roomsList!.textContent).toContain('hard');
    });

    it('renders player count for each room', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('2/4');
      expect(roomsList!.textContent).toContain('1/2');
    });

    it('renders Join buttons for each room', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      expect(joinButtons.length).toBe(2);
    });

    it('join buttons have data-code attribute', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      expect((joinButtons[0] as HTMLElement).dataset.code).toBe('ABC123');
      expect((joinButtons[1] as HTMLElement).dataset.code).toBe('DEF456');
    });

    it('renders visibility badges', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('public');
      expect(roomsList!.textContent).toContain('private');
    });

    it('shows "Failed to load rooms" when response is not ok', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Failed to load rooms');
    });

    it('shows "Connection error" on fetch failure', async () => {
      seedLocalStorage();
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Connection error');
    });

    it('sends Authorization header with token', async () => {
      seedLocalStorage({}, 'lobby-token');
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const lobbyCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms');
      });
      expect(lobbyCall).toBeTruthy();
      const headers = (lobbyCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer lobby-token');
    });

    it('calls /api/lobby/rooms endpoint', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const lobbyCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms');
      });
      expect(lobbyCall).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Join room interaction
  // ---------------------------------------------------------------------------

  describe('Join room', () => {
    it('navigates to game on successful join', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('game');
    });

    it('does not navigate when join fails', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('sends POST to /api/lobby/rooms/{code}/join', async () => {
      seedLocalStorage();
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const joinCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms/ABC123/join');
      });
      expect(joinCall).toBeTruthy();
      const init = joinCall![1] as RequestInit;
      expect(init.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // Create Room modal
  // ---------------------------------------------------------------------------

  describe('Create Room modal', () => {
    it('shows modal when Create Room button is clicked', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      const btn = container.querySelector('#create-room-btn') as HTMLButtonElement;
      btn.dispatchEvent(new MouseEvent('click'));

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('flex');
    });

    it('hides modal when Cancel button is clicked', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-cancel')!.dispatchEvent(new MouseEvent('click'));

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');
    });

    it('sends POST to /api/lobby/rooms with form data', async () => {
      seedLocalStorage({ username: 'hostUser' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      // Open modal
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      // Fill in room name
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = 'My Test Room';

      // Set other values
      const visibilitySelect = container.querySelector('#room-visibility') as HTMLSelectElement;
      visibilitySelect.value = 'private';

      const categorySelect = container.querySelector('#room-category') as HTMLSelectElement;
      categorySelect.value = 'science';

      const difficultySelect = container.querySelector('#room-difficulty') as HTMLSelectElement;
      difficultySelect.value = 'hard';

      // Submit
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        const init = c[1] as RequestInit;
        return u.includes('/api/lobby/rooms') && init?.method === 'POST';
      });
      expect(createCall).toBeTruthy();
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body.name).toBe('My Test Room');
      expect(body.visibility).toBe('private');
      expect(body.category).toBe('science');
      expect(body.difficulty).toBe('hard');
      expect(body.maxPlayers).toBe(8);
      expect(body.maxRounds).toBe(5);
    });

    it('sends Authorization header on create room request', async () => {
      seedLocalStorage({ username: 'test' }, 'create-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        const init = c[1] as RequestInit;
        return u.includes('/api/lobby/rooms') && init?.method === 'POST';
      });
      const headers = (createCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer create-token');
    });

    it('hides modal and reloads rooms after successful creation', async () => {
      seedLocalStorage({ username: 'test' });
      let callCount = 0;
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        callCount++;
        return Promise.resolve(makeRoomsResponse([]));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');

      // rooms endpoint was called at least twice (initial load + reload after create)
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('uses username as default room name when input is empty', async () => {
      seedLocalStorage({ username: 'defaultUser' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      // Leave room name empty
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = '';

      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        const init = c[1] as RequestInit;
        return u.includes('/api/lobby/rooms') && init?.method === 'POST';
      });
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body.name).toBe("defaultUser's Game");
    });

    it('does not hide modal when creation fails', async () => {
      seedLocalStorage({ username: 'test' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));

      await flushAsync();

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('flex');
    });
  });

  // ---------------------------------------------------------------------------
  // localStorage interaction
  // ---------------------------------------------------------------------------

  describe('localStorage interaction', () => {
    it('handles empty localStorage with empty user object', async () => {
      seedLocalStorage();
      const { renderLobbyPage } = await import('./lobby-page');
      expect(() => renderLobbyPage(container)).not.toThrow();
    });

    it('reads token from localStorage for API calls', async () => {
      seedLocalStorage({}, 'my-lobby-token');
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const lobbyCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms');
      });
      const headers = (lobbyCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer my-lobby-token');
    });
  });

  // ---------------------------------------------------------------------------
  // Room visibility display
  // ---------------------------------------------------------------------------

  describe('Room visibility display', () => {
    it('renders public rooms with public style', async () => {
      seedLocalStorage();
      const rooms = [
        {
          name: 'Public Room',
          code: 'PUB1',
          hostName: 'Host',
          category: 'animals',
          difficulty: 'easy',
          visibility: 'public',
          players: ['p1'],
          maxPlayers: 4,
        },
      ];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.innerHTML).toContain('rgba(78,205,196,0.2)'); // public style
    });

    it('renders private rooms with private style', async () => {
      seedLocalStorage();
      const rooms = [
        {
          name: 'Private Room',
          code: 'PRI1',
          hostName: 'Host',
          category: 'science',
          difficulty: 'hard',
          visibility: 'private',
          players: ['p1'],
          maxPlayers: 2,
        },
      ];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));

      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);

      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.innerHTML).toContain('rgba(170,150,218,0.2)'); // private style
    });
  });
});
