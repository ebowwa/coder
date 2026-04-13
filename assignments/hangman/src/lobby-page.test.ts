/**
 * Tests for the lobby-page module
 *
 * Validates renderLobbyPage HTML structure, room list loading,
 * create room modal interaction, join room behavior, filter elements,
 * settings controls, input validation, localStorage-based user resolution,
 * accessibility, and edge cases.
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

/**
 * Render the lobby page and return the import for further use.
 */
async function renderLobby(
  container: HTMLDivElement,
  user: Record<string, unknown> = {},
  token = 'test-token',
) {
  seedLocalStorage(user, token);
  const mod = await import('./lobby-page');
  mod.renderLobbyPage(container);
  return mod;
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
      await renderLobby(container);
      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toContain('Game Lobby');
    });

    it('renders the Create Room button', async () => {
      await renderLobby(container);
      const btn = container.querySelector('#create-room-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Create Room');
    });

    it('renders the category filter select', async () => {
      await renderLobby(container);
      const select = container.querySelector('#filter-category') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });

    it('renders category filter with correct options', async () => {
      await renderLobby(container);
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
      await renderLobby(container);
      const select = container.querySelector('#filter-difficulty') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });

    it('renders difficulty filter with correct options', async () => {
      await renderLobby(container);
      const select = container.querySelector('#filter-difficulty') as HTMLSelectElement;
      const options = select.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toContain('any');
      expect(values).toContain('easy');
      expect(values).toContain('medium');
      expect(values).toContain('hard');
    });

    it('renders the rooms list container', async () => {
      await renderLobby(container);
      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList).toBeTruthy();
    });

    it('shows "Loading rooms..." initially', async () => {
      await renderLobby(container);
      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Loading rooms');
    });

    it('renders create room modal with correct elements', async () => {
      await renderLobby(container);
      expect(container.querySelector('#create-modal')).toBeTruthy();
      expect(container.querySelector('#room-name')).toBeTruthy();
      expect(container.querySelector('#room-visibility')).toBeTruthy();
      expect(container.querySelector('#room-category')).toBeTruthy();
      expect(container.querySelector('#room-difficulty')).toBeTruthy();
      expect(container.querySelector('#room-max-players')).toBeTruthy();
      expect(container.querySelector('#room-max-rounds')).toBeTruthy();
    });

    it('renders create and cancel buttons', async () => {
      await renderLobby(container);
      expect(container.querySelector('#create-submit')).toBeTruthy();
      expect(container.querySelector('#create-cancel')).toBeTruthy();
    });

    it('create modal is initially hidden', async () => {
      await renderLobby(container);
      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal).toBeTruthy();
      expect(modal.getAttribute('style')).toContain('display: none');
    });

    it('default max players is 8', async () => {
      await renderLobby(container);
      const maxPlayersSelect = container.querySelector('#room-max-players') as HTMLSelectElement;
      expect(maxPlayersSelect.value).toBe('8');
    });

    it('default max rounds is 5', async () => {
      await renderLobby(container);
      const maxRoundsSelect = container.querySelector('#room-max-rounds') as HTMLSelectElement;
      expect(maxRoundsSelect.value).toBe('5');
    });
  });

  // ---------------------------------------------------------------------------
  // Modal form controls and settings
  // ---------------------------------------------------------------------------

  describe('Create Room modal – settings controls', () => {
    it('visibility select has public and private options', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-visibility') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(values).toEqual(['public', 'private']);
    });

    it('default visibility is public', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-visibility') as HTMLSelectElement;
      expect(select.value).toBe('public');
    });

    it('category select in modal has same options as filter', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-category') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(values).toContain('any');
      expect(values).toContain('animals');
      expect(values).toContain('food');
      expect(values).toContain('science');
      expect(values).toContain('sports');
      expect(values).toContain('countries');
    });

    it('difficulty select in modal has same options as filter', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-difficulty') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(values).toContain('any');
      expect(values).toContain('easy');
      expect(values).toContain('medium');
      expect(values).toContain('hard');
    });

    it('max players select has 2, 4, 6, 8 options', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-max-players') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(values).toEqual(['2', '4', '6', '8']);
    });

    it('max rounds select has 1, 3, 5, 10 options', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-max-rounds') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(values).toEqual(['1', '3', '5', '10']);
    });

    it('can change max players to 2', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-max-players') as HTMLSelectElement;
      select.value = '2';
      expect(select.value).toBe('2');
    });

    it('can change max rounds to 10', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-max-rounds') as HTMLSelectElement;
      select.value = '10';
      expect(select.value).toBe('10');
    });

    it('can change visibility to private', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-visibility') as HTMLSelectElement;
      select.value = 'private';
      expect(select.value).toBe('private');
    });

    it('can change category to food', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-category') as HTMLSelectElement;
      select.value = 'food';
      expect(select.value).toBe('food');
    });

    it('can change difficulty to medium', async () => {
      await renderLobby(container);
      const select = container.querySelector('#room-difficulty') as HTMLSelectElement;
      select.value = 'medium';
      expect(select.value).toBe('medium');
    });

    it('sends changed settings when creating a room', async () => {
      await renderLobby(container, { username: 'tester' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = 'Test Room';
      (container.querySelector('#room-visibility') as HTMLSelectElement).value = 'private';
      (container.querySelector('#room-category') as HTMLSelectElement).value = 'food';
      (container.querySelector('#room-difficulty') as HTMLSelectElement).value = 'medium';
      (container.querySelector('#room-max-players') as HTMLSelectElement).value = '4';
      (container.querySelector('#room-max-rounds') as HTMLSelectElement).value = '3';

      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      expect(createCall).toBeTruthy();
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body).toEqual({
        name: 'Test Room',
        visibility: 'private',
        category: 'food',
        difficulty: 'medium',
        maxPlayers: 4,
        maxRounds: 3,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // loadRooms – data-driven rendering
  // ---------------------------------------------------------------------------

  describe('loadRooms – room list rendering', () => {
    it('shows empty state when no rooms available', async () => {
      fetchSpy.mockResolvedValue(makeRoomsResponse([]));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('No public rooms available');
      expect(roomsList!.textContent).toContain('Create one to get started');
    });

    it('renders room entries with name and details', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
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
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('2/4');
      expect(roomsList!.textContent).toContain('1/2');
    });

    it('renders Join buttons for each room', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      expect(joinButtons.length).toBe(2);
    });

    it('join buttons have data-code attribute', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      expect((joinButtons[0] as HTMLElement).dataset.code).toBe('ABC123');
      expect((joinButtons[1] as HTMLElement).dataset.code).toBe('DEF456');
    });

    it('renders visibility badges', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('public');
      expect(roomsList!.textContent).toContain('private');
    });

    it('shows "Failed to load rooms" when response is not ok', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Failed to load rooms');
    });

    it('shows "Connection error" on fetch failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network failure'));
      await renderLobby(container);
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
      await renderLobby(container);
      await flushAsync();

      const lobbyCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms');
      });
      expect(lobbyCall).toBeTruthy();
    });

    it('renders a room with zero players correctly', async () => {
      const rooms = [{
        name: 'Empty Room',
        code: 'EMP1',
        hostName: 'Host',
        category: 'any',
        difficulty: 'any',
        visibility: 'public',
        players: [],
        maxPlayers: 8,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('0/8');
    });

    it('renders a room at full capacity', async () => {
      const rooms = [{
        name: 'Full Room',
        code: 'FULL',
        hostName: 'Host',
        category: 'sports',
        difficulty: 'hard',
        visibility: 'public',
        players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        maxPlayers: 6,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('6/6');
    });

    it('renders many rooms correctly', async () => {
      const rooms = Array.from({ length: 20 }, (_, i) => ({
        name: `Room ${i}`,
        code: `CODE${i}`,
        hostName: `Host${i}`,
        category: 'any',
        difficulty: 'easy',
        visibility: 'public',
        players: ['p1'],
        maxPlayers: 4,
      }));
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      expect(joinButtons.length).toBe(20);
    });

    it('renders room host name', async () => {
      const rooms = [{
        name: 'Test',
        code: 'T1',
        hostName: 'SuperHost',
        category: 'any',
        difficulty: 'any',
        visibility: 'public',
        players: [],
        maxPlayers: 4,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('Host: SuperHost');
    });
  });

  // ---------------------------------------------------------------------------
  // Join room interaction
  // ---------------------------------------------------------------------------

  describe('Join room', () => {
    it('navigates to game on successful join', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container);
      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('game');
    });

    it('does not navigate when join fails', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container);
      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('sends POST to /api/lobby/rooms/{code}/join', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container);
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

    it('sends auth header when joining a room', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container, { username: 'joiner' }, 'join-token');
      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      joinBtn.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const joinCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/join');
      });
      expect(joinCall).toBeTruthy();
      const headers = (joinCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer join-token');
    });

    it('handles network error on join without crashing', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container);
      await flushAsync();

      const joinBtn = container.querySelector('.join-room-btn') as HTMLElement;
      expect(() => joinBtn.dispatchEvent(new MouseEvent('click'))).not.toThrow();
      await flushAsync();

      // Should not navigate on error
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('can join the second room', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms/') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse(rooms));
      });

      await renderLobby(container);
      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      joinButtons[1].dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const joinCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms/DEF456/join');
      });
      expect(joinCall).toBeTruthy();
      expect(mockNavigate).toHaveBeenCalledWith('game');
    });
  });

  // ---------------------------------------------------------------------------
  // Create Room modal – event handlers
  // ---------------------------------------------------------------------------

  describe('Create Room modal', () => {
    it('shows modal when Create Room button is clicked', async () => {
      await renderLobby(container);
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('flex');
    });

    it('hides modal when Cancel button is clicked', async () => {
      await renderLobby(container);
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-cancel')!.dispatchEvent(new MouseEvent('click'));

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');
    });

    it('sends POST to /api/lobby/rooms with form data', async () => {
      await renderLobby(container, { username: 'hostUser' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = 'My Test Room';

      const visibilitySelect = container.querySelector('#room-visibility') as HTMLSelectElement;
      visibilitySelect.value = 'private';

      const categorySelect = container.querySelector('#room-category') as HTMLSelectElement;
      categorySelect.value = 'science';

      const difficultySelect = container.querySelector('#room-difficulty') as HTMLSelectElement;
      difficultySelect.value = 'hard';

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
      await renderLobby(container, { username: 'test' }, 'create-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

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

    it('sends Content-Type json header on create', async () => {
      await renderLobby(container, { username: 'test' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      const headers = (createCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('hides modal and reloads rooms after successful creation', async () => {
      let callCount = 0;
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        callCount++;
        return Promise.resolve(makeRoomsResponse([]));
      });

      await renderLobby(container, { username: 'test' });
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('none');
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('uses username as default room name when input is empty', async () => {
      await renderLobby(container, { username: 'defaultUser' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = '';
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body.name).toBe("defaultUser's Game");
    });

    it('does not hide modal when creation fails', async () => {
      await renderLobby(container, { username: 'test' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      expect(modal.style.display).toBe('flex');
    });

    it('handles network error on create without crashing', async () => {
      await renderLobby(container, { username: 'test' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      expect(() => {
        container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      }).not.toThrow();
      await flushAsync();
    });

    it('trims whitespace from room name', async () => {
      await renderLobby(container, { username: 'test' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = '   Spacious Room   ';
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body.name).toBe('Spacious Room');
    });

    it('uses default name when room name is only whitespace', async () => {
      await renderLobby(container, { username: 'whitespaceUser' });
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = '   ';
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body.name).toBe("whitespaceUser's Game");
    });

    it('falls back to default name when user has no username', async () => {
      seedLocalStorage({});
      const { renderLobbyPage } = await import('./lobby-page');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/lobby/rooms') && init?.method === 'POST') {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(makeRoomsResponse([]));
      });

      renderLobbyPage(container);
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));
      const nameInput = container.querySelector('#room-name') as HTMLInputElement;
      nameInput.value = '';
      container.querySelector('#create-submit')!.dispatchEvent(new MouseEvent('click'));
      await flushAsync();

      const createCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms') && (c[1] as RequestInit)?.method === 'POST';
      });
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      // undefined username → "undefined's Game"
      expect(body.name).toBe("undefined's Game");
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

    it('sends Bearer null when no token in localStorage', async () => {
      localStorage.setItem('hm_user', '{}');
      // No hm_token set
      const { renderLobbyPage } = await import('./lobby-page');
      renderLobbyPage(container);
      await flushAsync();

      const lobbyCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/lobby/rooms');
      });
      const headers = (lobbyCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer null');
    });
  });

  // ---------------------------------------------------------------------------
  // Room visibility display
  // ---------------------------------------------------------------------------

  describe('Room visibility display', () => {
    it('renders public rooms with public style', async () => {
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
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.innerHTML).toContain('rgba(78,205,196,0.2)');
    });

    it('renders private rooms with private style', async () => {
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
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.innerHTML).toContain('rgba(170,150,218,0.2)');
    });
  });

  // ---------------------------------------------------------------------------
  // DOM element types and structure
  // ---------------------------------------------------------------------------

  describe('DOM element types', () => {
    it('Create Room button is a button element', async () => {
      await renderLobby(container);
      const btn = container.querySelector('#create-room-btn');
      expect(btn instanceof HTMLButtonElement).toBe(true);
    });

    it('filter-category is a select element', async () => {
      await renderLobby(container);
      const select = container.querySelector('#filter-category');
      expect(select instanceof HTMLSelectElement).toBe(true);
    });

    it('filter-difficulty is a select element', async () => {
      await renderLobby(container);
      const select = container.querySelector('#filter-difficulty');
      expect(select instanceof HTMLSelectElement).toBe(true);
    });

    it('room-name is a text input', async () => {
      await renderLobby(container);
      const input = container.querySelector('#room-name') as HTMLInputElement;
      expect(input instanceof HTMLInputElement).toBe(true);
      expect(input.type).toBe('text');
    });

    it('room-name has placeholder text', async () => {
      await renderLobby(container);
      const input = container.querySelector('#room-name') as HTMLInputElement;
      expect(input.placeholder).toBeTruthy();
    });

    it('submit and cancel buttons are button elements', async () => {
      await renderLobby(container);
      expect(container.querySelector('#create-submit') instanceof HTMLButtonElement).toBe(true);
      expect(container.querySelector('#create-cancel') instanceof HTMLButtonElement).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility – labels and structure
  // ---------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('room-name input has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const roomNameLabel = Array.from(labels).find(
        (l) => l.textContent?.includes('Room Name'),
      );
      expect(roomNameLabel).toBeTruthy();
    });

    it('visibility select has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const found = Array.from(labels).find(
        (l) => l.textContent?.includes('Visibility'),
      );
      expect(found).toBeTruthy();
    });

    it('category select in modal has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const found = Array.from(labels).filter(
        (l) => l.textContent?.includes('Category'),
      );
      expect(found.length).toBeGreaterThanOrEqual(1);
    });

    it('difficulty select in modal has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const found = Array.from(labels).filter(
        (l) => l.textContent?.includes('Difficulty'),
      );
      expect(found.length).toBeGreaterThanOrEqual(1);
    });

    it('max players select has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const found = Array.from(labels).find(
        (l) => l.textContent?.includes('Max Players'),
      );
      expect(found).toBeTruthy();
    });

    it('rounds select has an associated label', async () => {
      await renderLobby(container);
      const labels = container.querySelectorAll('label');
      const found = Array.from(labels).find(
        (l) => l.textContent?.includes('Rounds'),
      );
      expect(found).toBeTruthy();
    });

    it('create modal has a heading element', async () => {
      await renderLobby(container);
      container.querySelector('#create-room-btn')!.dispatchEvent(new MouseEvent('click'));

      const h3 = container.querySelector('#create-modal h3');
      expect(h3).toBeTruthy();
      expect(h3!.textContent).toContain('Create New Room');
    });

    it('Game Lobby heading uses h2 element', async () => {
      await renderLobby(container);
      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
    });

    it('join buttons are focusable button elements', async () => {
      const rooms = makeSampleRooms();
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const joinButtons = container.querySelectorAll('.join-room-btn');
      joinButtons.forEach((btn) => {
        expect(btn instanceof HTMLButtonElement).toBe(true);
        expect(btn.tagName).toBe('BUTTON');
      });
    });

    it('create room button has visible text content', async () => {
      await renderLobby(container);
      const btn = container.querySelector('#create-room-btn');
      expect(btn!.textContent?.trim()).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Player management via room data rendering
  // ---------------------------------------------------------------------------

  describe('Player management display', () => {
    it('renders player count from room data', async () => {
      const rooms = [
        {
          name: 'Room1',
          code: 'R1',
          hostName: 'Host',
          category: 'any',
          difficulty: 'any',
          visibility: 'public',
          players: ['p1', 'p2', 'p3'],
          maxPlayers: 6,
        },
      ];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.textContent).toContain('3/6');
      expect(roomsList.textContent).toContain('Players');
    });

    it('renders host name for each room', async () => {
      const rooms = [
        {
          name: 'Room1',
          code: 'R1',
          hostName: 'CaptainRex',
          category: 'any',
          difficulty: 'any',
          visibility: 'public',
          players: ['p1'],
          maxPlayers: 4,
        },
      ];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.textContent).toContain('CaptainRex');
    });

    it('renders multiple rooms with different player counts', async () => {
      const rooms = [
        {
          name: 'Small',
          code: 'SM',
          hostName: 'H1',
          category: 'any',
          difficulty: 'any',
          visibility: 'public',
          players: ['p1'],
          maxPlayers: 2,
        },
        {
          name: 'Large',
          code: 'LG',
          hostName: 'H2',
          category: 'any',
          difficulty: 'any',
          visibility: 'public',
          players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
          maxPlayers: 8,
        },
      ];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list')!;
      expect(roomsList.textContent).toContain('1/2');
      expect(roomsList.textContent).toContain('8/8');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases and robustness
  // ---------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('renders rooms with special characters in name', async () => {
      const rooms = [{
        name: 'Test <script>alert("xss")</script>',
        code: 'XSS1',
        hostName: 'Host',
        category: 'any',
        difficulty: 'any',
        visibility: 'public',
        players: [],
        maxPlayers: 4,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      // innerHTML renders the content, but check it doesn't crash
      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList).toBeTruthy();
    });

    it('renders rooms with unicode characters in host name', async () => {
      const rooms = [{
        name: 'Fun',
        code: 'UNI1',
        hostName: '日本太郎',
        category: 'any',
        difficulty: 'any',
        visibility: 'public',
        players: [],
        maxPlayers: 4,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('日本太郎');
    });

    it('renders rooms with emoji in name', async () => {
      const rooms = [{
        name: '🎮 Game Room 🎯',
        code: 'EMO1',
        hostName: 'Host',
        category: 'any',
        difficulty: 'any',
        visibility: 'public',
        players: [],
        maxPlayers: 4,
      }];
      fetchSpy.mockResolvedValue(makeRoomsResponse(rooms));
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('🎮 Game Room 🎯');
    });

    it('handles rooms list response with null data', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });
      await renderLobby(container);
      await flushAsync();

      const roomsList = container.querySelector('#rooms-list');
      expect(roomsList!.textContent).toContain('No public rooms available');
    });

    it('multiple renderLobbyPage calls replace content', async () => {
      const { renderLobbyPage } = await import('./lobby-page');
      seedLocalStorage();

      renderLobbyPage(container);
      const firstContent = container.innerHTML;

      renderLobbyPage(container);
      const secondContent = container.innerHTML;

      // Both renders should produce the same initial HTML
      expect(firstContent).toBe(secondContent);
    });

    it('modal overlay covers full viewport', async () => {
      await renderLobby(container);
      const modal = container.querySelector('#create-modal') as HTMLDivElement;
      const style = modal.getAttribute('style')!;
      expect(style).toContain('position: fixed');
      expect(style).toContain('width: 100%');
      expect(style).toContain('height: 100%');
      expect(style).toContain('z-index: 2000');
    });
  });
});
