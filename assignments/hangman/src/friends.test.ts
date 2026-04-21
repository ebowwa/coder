/**
 * Tests for the friends module
 *
 * Validates renderFriendsPage HTML structure, friends list loading,
 * online status display, add/remove friend interactions,
 * pending request handling, challenge flow, and edge cases.
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

function makeFriendsResponse(
  friends: unknown[] = [],
  pending: unknown[] = [],
) {
  return {
    ok: true,
    json: () => Promise.resolve({ friends, pending }),
  };
}

/**
 * Flush all pending microtasks so async loadFriends can complete.
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('friends', () => {
  let container: HTMLDivElement;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    mockNavigate.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeFriendsResponse(),
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
  // renderFriendsPage – HTML structure
  // ---------------------------------------------------------------------------

  describe('renderFriendsPage – HTML structure', () => {
    it('renders the page heading "Friends"', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toBe('Friends');
    });

    it('renders the add-friend input with placeholder', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.placeholder).toContain('Add by username');
    });

    it('renders the add-friend button with text "Add"', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const btn = container.querySelector('#add-friend-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toBe('Add');
    });

    it('renders the pending requests section (initially hidden)', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const pendingSection = container.querySelector('#pending-section') as HTMLDivElement;
      expect(pendingSection).toBeTruthy();
      // Initially hidden via inline style
      expect(pendingSection.getAttribute('style')).toContain('display: none');
    });

    it('renders the pending list container', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const pendingList = container.querySelector('#pending-list');
      expect(pendingList).toBeTruthy();
    });

    it('renders "Your Friends" heading', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const h3s = container.querySelectorAll('h3');
      const friendsHeading = Array.from(h3s).find((h) => h.textContent === 'Your Friends');
      expect(friendsHeading).toBeTruthy();
    });

    it('shows "Loading friends..." initially in friends-list', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const friendsList = container.querySelector('#friends-list');
      expect(friendsList).toBeTruthy();
      expect(friendsList!.innerHTML).toContain('Loading friends...');
    });
  });

  // ---------------------------------------------------------------------------
  // loadFriends – friends list rendering
  // ---------------------------------------------------------------------------

  describe('loadFriends – friends list rendering', () => {
    it('calls GET /api/friends with Authorization header', async () => {
      seedLocalStorage({}, 'friends-token');
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends') && !u.includes('/friends/');
      });
      expect(friendsCall).toBeTruthy();
      const headers = (friendsCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer friends-token');
    });

    it('shows "No friends yet" when friends list is empty', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('No friends yet');
      expect(friendsList.textContent).toContain('Add someone by their username');
    });

    it('renders friend entries with displayName and username', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'alice', displayName: 'AliceWonder', avatar: '#ff6b6b', online: true },
          { username: 'bob', displayName: 'BobBuilder', avatar: '#4ecdc4', online: false },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('AliceWonder');
      expect(friendsList.textContent).toContain('BobBuilder');
      expect(friendsList.textContent).toContain('@alice');
      expect(friendsList.textContent).toContain('@bob');
    });

    it('renders avatar circle with first letter of displayName', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'alice', displayName: 'AliceWonder', avatar: '#ff6b6b', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      // The avatar shows the first character
      expect(friendsList.innerHTML).toContain('>A<');
    });

    it('renders "?" for avatar when displayName is missing', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'xuser', avatar: '#666', online: false },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.innerHTML).toContain('>?<');
    });
  });

  // ---------------------------------------------------------------------------
  // loadFriends – online status tracking
  // ---------------------------------------------------------------------------

  describe('loadFriends – online status tracking', () => {
    it('shows "Online" text for online friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('Online');
    });

    it('shows "Offline" text for offline friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('Offline');
    });

    it('enables Challenge button for online friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const challengeBtn = container.querySelector('.challenge-btn') as HTMLButtonElement;
      expect(challengeBtn).toBeTruthy();
      expect(challengeBtn.disabled).toBe(false);
      expect(challengeBtn.getAttribute('style')).not.toContain('opacity: 0.4');
    });

    it('disables Challenge button for offline friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const challengeBtn = container.querySelector('.challenge-btn') as HTMLButtonElement;
      expect(challengeBtn).toBeTruthy();
      expect(challengeBtn.disabled).toBe(true);
      expect(challengeBtn.getAttribute('style')).toContain('opacity: 0.4');
    });

    it('renders green online indicator dot for online friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      // Online dot has green background #4caf50
      expect(friendsList.innerHTML).toContain('#4caf50');
    });

    it('renders gray indicator dot for offline friends', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      // Offline dot has gray background #666
      expect(friendsList.innerHTML).toContain('background: #666');
    });
  });

  // ---------------------------------------------------------------------------
  // loadFriends – pending requests
  // ---------------------------------------------------------------------------

  describe('loadFriends – pending requests', () => {
    it('shows pending section when there are pending requests', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([], [
          { username: 'pending1', displayName: 'PendingUser', avatar: '#ffe66d' },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const pendingSection = container.querySelector('#pending-section') as HTMLDivElement;
      expect(pendingSection).toBeTruthy();
      expect(pendingSection.style.display).toBe('block');
    });

    it('hides pending section when there are no pending requests', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(makeFriendsResponse([], []));

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const pendingSection = container.querySelector('#pending-section') as HTMLDivElement;
      expect(pendingSection.style.display).toBe('none');
    });

    it('hides pending section when pending is undefined', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ friends: [] }),
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const pendingSection = container.querySelector('#pending-section') as HTMLDivElement;
      expect(pendingSection.style.display).toBe('none');
    });

    it('renders pending request with displayName and username', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([], [
          { username: 'req1', displayName: 'RequestUser', avatar: '#ffe66d' },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const pendingList = container.querySelector('#pending-list')!;
      expect(pendingList.textContent).toContain('RequestUser');
      expect(pendingList.textContent).toContain('@req1');
    });

    it('renders Accept and Decline buttons for each pending request', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([], [
          { username: 'req1', displayName: 'Req', avatar: '#ffe66d' },
          { username: 'req2', displayName: 'Req2', avatar: '#666' },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const acceptBtns = container.querySelectorAll('.accept-btn');
      const declineBtns = container.querySelectorAll('.decline-btn');
      expect(acceptBtns.length).toBe(2);
      expect(declineBtns.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Accept / Decline friend requests
  // ---------------------------------------------------------------------------

  describe('accept/decline friend requests', () => {
    it('sends POST /api/friends/accept when Accept is clicked', async () => {
      seedLocalStorage({}, 'accept-token');
      let friendsCallCount = 0;
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/accept')) {
          return Promise.resolve({ ok: true } as Response);
        }
        // First call returns pending, subsequent calls return no pending
        friendsCallCount++;
        if (friendsCallCount === 1) {
          return Promise.resolve(
            makeFriendsResponse(
              [],
              [{ username: 'req1', displayName: 'Req', avatar: '#ffe66d' }],
            ),
          );
        }
        return Promise.resolve(
          makeFriendsResponse(
            [{ username: 'req1', displayName: 'Req', avatar: '#ffe66d', online: true }],
            [],
          ),
        );
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const acceptBtn = container.querySelector('.accept-btn') as HTMLButtonElement;
      expect(acceptBtn).toBeTruthy();
      acceptBtn.click();

      await flushAsync();

      const acceptCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/accept');
      });
      expect(acceptCall).toBeTruthy();
      const init = acceptCall![1] as RequestInit;
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer accept-token');
      const body = JSON.parse(init.body as string);
      expect(body.friendUsername).toBe('req1');
    });

    it('sends DELETE /api/friends/remove when Decline is clicked', async () => {
      seedLocalStorage({}, 'decline-token');
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/remove')) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([], [
            { username: 'req1', displayName: 'Req', avatar: '#ffe66d' },
          ]),
        );
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const declineBtn = container.querySelector('.decline-btn') as HTMLButtonElement;
      expect(declineBtn).toBeTruthy();
      declineBtn.click();

      await flushAsync();

      const declineCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/remove');
      });
      expect(declineCall).toBeTruthy();
      const init = declineCall![1] as RequestInit;
      expect(init.method).toBe('DELETE');
      const body = JSON.parse(init.body as string);
      expect(body.friendUsername).toBe('req1');
    });
  });

  // ---------------------------------------------------------------------------
  // Add friend
  // ---------------------------------------------------------------------------

  describe('add friend', () => {
    it('sends POST /api/friends/add when Add button is clicked with username', async () => {
      seedLocalStorage({}, 'add-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'newbuddy';

      const addBtn = container.querySelector('#add-friend-btn') as HTMLButtonElement;
      addBtn.click();

      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeTruthy();
      const init = addCall![1] as RequestInit;
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer add-token');
      const body = JSON.parse(init.body as string);
      expect(body.friendUsername).toBe('newbuddy');
    });

    it('clears input field after successful add', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'someone';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      expect(input.value).toBe('');
    });

    it('shows alert "Friend request sent!" on success', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'pal';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      expect(mockAlert).toHaveBeenCalledWith('Friend request sent!');
    });

    it('shows error alert when add fails', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'User not found' }),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'nobody';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      expect(mockAlert).toHaveBeenCalledWith('User not found');
    });

    it('shows default error when add fails without error message', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'who';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      expect(mockAlert).toHaveBeenCalledWith('Failed to add friend');
    });

    it('does not call API when input is empty', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = '';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeUndefined();
    });

    it('does not call API when input is whitespace-only', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = '   ';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeUndefined();
    });

    it('sends add friend request on Enter key in input', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'enteruser';

      input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeTruthy();
      const body = JSON.parse((addCall![1] as RequestInit).body as string);
      expect(body.friendUsername).toBe('enteruser');
    });

    it('does not send add friend request on non-Enter key', async () => {
      seedLocalStorage();
      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'someone';

      input.dispatchEvent(new KeyboardEvent('keypress', { key: 'a', bubbles: true }));
      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeUndefined();
    });

    it('shows "Connection error" alert on network failure', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.reject(new Error('Network failure'));
        }
        return Promise.resolve(makeFriendsResponse());
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = 'offlineuser';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      expect(mockAlert).toHaveBeenCalledWith('Connection error');
    });
  });

  // ---------------------------------------------------------------------------
  // Challenge friend
  // ---------------------------------------------------------------------------

  describe('challenge friend', () => {
    it('sends POST /api/challenge when Challenge button is clicked', async () => {
      seedLocalStorage({}, 'challenge-token');
      fetchSpy.mockImplementation((url: string | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/challenge')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              challenged: 'alice',
              room: { code: 'ABCD' },
            }),
          } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
          ]),
        );
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const challengeBtn = container.querySelector('.challenge-btn') as HTMLButtonElement;
      expect(challengeBtn).toBeTruthy();
      challengeBtn.click();

      await flushAsync();

      const challengeCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/challenge');
      });
      expect(challengeCall).toBeTruthy();
      const init = challengeCall![1] as RequestInit;
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer challenge-token');
      const body = JSON.parse(init.body as string);
      expect(body.friendUsername).toBe('alice');
    });

    it('alerts with room code on successful challenge', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/challenge')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              challenged: 'alice',
              room: { code: 'XYZ123' },
            }),
          } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
          ]),
        );
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      container.querySelector('.challenge-btn')!.click();
      await flushAsync();

      expect(mockAlert).toHaveBeenCalledWith('Challenge sent to alice! Room code: XYZ123');
    });

    it('navigates to lobby after successful challenge', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/challenge')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              challenged: 'alice',
              room: { code: 'XYZ' },
            }),
          } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
          ]),
        );
      });

      globalThis.alert = vi.fn();

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      container.querySelector('.challenge-btn')!.click();
      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('lobby');
    });

    it('does not alert or navigate on challenge failure', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/challenge')) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'alice', displayName: 'Alice', avatar: '#ff6b6b', online: true },
          ]),
        );
      });

      const mockAlert = vi.fn();
      globalThis.alert = mockAlert;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      container.querySelector('.challenge-btn')!.click();
      await flushAsync();

      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('lobby');
    });
  });

  // ---------------------------------------------------------------------------
  // Remove friend
  // ---------------------------------------------------------------------------

  describe('remove friend', () => {
    it('sends DELETE /api/friends/remove when confirmed', async () => {
      seedLocalStorage({}, 'remove-token');
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/remove')) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
          ]),
        );
      });

      globalThis.confirm = vi.fn(() => true);

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const removeBtn = container.querySelector('.remove-btn') as HTMLButtonElement;
      expect(removeBtn).toBeTruthy();
      removeBtn.click();

      await flushAsync();

      const removeCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/remove');
      });
      expect(removeCall).toBeTruthy();
      const init = removeCall![1] as RequestInit;
      expect(init.method).toBe('DELETE');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer remove-token');
      const body = JSON.parse(init.body as string);
      expect(body.friendUsername).toBe('bob');
    });

    it('does not send DELETE when confirm is cancelled', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
        ]),
      );

      globalThis.confirm = vi.fn(() => false);

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const removeBtn = container.querySelector('.remove-btn') as HTMLButtonElement;
      removeBtn.click();

      await flushAsync();

      const removeCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/remove');
      });
      expect(removeCall).toBeUndefined();
    });

    it('shows confirm dialog with username', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
        ]),
      );

      const mockConfirm = vi.fn(() => false);
      globalThis.confirm = mockConfirm;

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      container.querySelector('.remove-btn')!.click();

      expect(mockConfirm).toHaveBeenCalledWith('Remove bob from friends?');
    });

    it('reloads friends list after successful removal', async () => {
      seedLocalStorage();
      let callCount = 0;
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        callCount++;
        if (u.includes('/api/friends/remove')) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve(
          makeFriendsResponse([
            { username: 'bob', displayName: 'Bob', avatar: '#4ecdc4', online: false },
          ]),
        );
      });

      globalThis.confirm = vi.fn(() => true);

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const initialCallCount = fetchSpy.mock.calls.length;

      container.querySelector('.remove-btn')!.click();
      await flushAsync();

      // After removal, loadFriends is called again
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('shows "Connection error" when fetch fails', async () => {
      seedLocalStorage();
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('Connection error');
    });

    it('does nothing when response is not ok (non-error)', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({ ok: false, status: 403 } as Response);

      const { renderFriendsPage } = await import('./friends');
      expect(() => renderFriendsPage(container)).not.toThrow();

      await flushAsync();

      // Should still show loading text since loadFriends returns early on !res.ok
      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('Loading friends...');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles missing user data in localStorage gracefully', async () => {
      // No hm_user in localStorage
      localStorage.setItem('hm_token', 'token');

      const { renderFriendsPage } = await import('./friends');
      expect(() => renderFriendsPage(container)).not.toThrow();
    });

    it('handles missing token in localStorage gracefully', async () => {
      localStorage.setItem('hm_user', JSON.stringify({ username: 'test' }));
      // No hm_token

      const { renderFriendsPage } = await import('./friends');
      expect(() => renderFriendsPage(container)).not.toThrow();

      await flushAsync();

      // Token should be null in the request header
      const friendsCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends');
      });
      expect(friendsCall).toBeTruthy();
      const headers = (friendsCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer null');
    });

    it('handles friends list with undefined friends array', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ friends: undefined, pending: [] }),
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('No friends yet');
    });

    it('handles friends list with null friends array', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ friends: null, pending: [] }),
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('No friends yet');
    });

    it('handles friends list with missing friends property', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      expect(friendsList.textContent).toContain('No friends yet');
    });

    it('handles friend with missing displayName gracefully', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'noname', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      // Avatar should show "?" for missing displayName
      expect(friendsList.innerHTML).toContain('>?<');
    });

    it('handles friend with missing avatar gracefully', async () => {
      seedLocalStorage();
      fetchSpy.mockResolvedValue(
        makeFriendsResponse([
          { username: 'noavatar', displayName: 'NoAvatar', online: true },
        ]),
      );

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      await flushAsync();

      const friendsList = container.querySelector('#friends-list')!;
      // Default avatar color #666 should be used
      expect(friendsList.innerHTML).toContain('#666');
    });

    it('trims whitespace from add-friend input', async () => {
      seedLocalStorage();
      fetchSpy.mockImplementation((url: string | Request) => {
        const u = typeof url === 'string' ? url : url.url;
        if (u.includes('/api/friends/add')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve(makeFriendsResponse());
      });

      globalThis.alert = vi.fn();

      const { renderFriendsPage } = await import('./friends');
      renderFriendsPage(container);

      const input = container.querySelector('#add-friend-input') as HTMLInputElement;
      input.value = '  spaceduser  ';

      container.querySelector('#add-friend-btn')!.click();
      await flushAsync();

      const addCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/friends/add');
      });
      expect(addCall).toBeTruthy();
      const body = JSON.parse((addCall![1] as RequestInit).body as string);
      expect(body.friendUsername).toBe('spaceduser');
    });
  });
});
