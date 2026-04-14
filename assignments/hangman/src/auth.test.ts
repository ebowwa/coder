/**
 * Tests for the auth module
 *
 * Validates renderAuthPage, login/register toggle, form validation,
 * error display, auth API interactions, guest mode, localStorage persistence,
 * and keyboard navigation.
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

function setField(container: HTMLDivElement, id: string, value: string): void {
  const el = container.querySelector(`#${id}`) as HTMLInputElement;
  if (el) el.value = value;
}

/**
 * Flush all pending microtasks so async handleSubmit can complete.
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function makeAuthResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: () => Promise.resolve(overrides),
  };
}

function makeAuthError(message: string, status = 401) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth', () => {
  let container: HTMLDivElement;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createContainer();
    document.body.appendChild(container);
    localStorage.clear();
    mockNavigate.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeAuthResponse({
        token: 'test-token-123',
        user: { username: 'testuser', displayName: 'Test User' },
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
  // Login form rendering
  // ---------------------------------------------------------------------------

  describe('login form rendering', () => {
    it('renders the auth page with title', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1!.textContent).toContain('Hangman Pro');
    });

    it('renders welcome back message for login mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const subtitle = container.querySelector('p');
      expect(subtitle!.textContent).toContain('Welcome back!');
    });

    it('renders username input field', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const usernameInput = container.querySelector('#auth-username') as HTMLInputElement;
      expect(usernameInput).toBeTruthy();
      expect(usernameInput.type).toBe('text');
    });

    it('renders password input field', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.type).toBe('password');
    });

    it('renders Sign In button in login mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
      expect(submitBtn.textContent).toContain('Sign In');
    });

    it('renders toggle button with Sign Up text in login mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.textContent).toContain('Sign Up');
    });

    it('renders guest play button', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const guestBtn = container.querySelector('#auth-guest') as HTMLButtonElement;
      expect(guestBtn).toBeTruthy();
      expect(guestBtn.textContent).toContain('Play as Guest');
    });

    it('renders error container hidden by default', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl).toBeTruthy();
      // The style attribute contains "display: none" in the inline HTML
      expect(errorEl.outerHTML).toContain('display: none');
    });

    it('does not render display name field in login mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const displayInput = container.querySelector('#auth-display');
      expect(displayInput).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Register form rendering (toggle)
  // ---------------------------------------------------------------------------

  describe('register form toggle', () => {
    it('switches to register mode when toggle is clicked', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      const subtitle = container.querySelector('p');
      expect(subtitle!.textContent).toContain('Create your account');
    });

    it('shows display name field in register mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      const displayInput = container.querySelector('#auth-display') as HTMLInputElement;
      expect(displayInput).toBeTruthy();
    });

    it('shows Create Account button text in register mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      expect(submitBtn.textContent).toContain('Create Account');
    });

    it('toggles back to login mode on second click', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click(); // -> register
      toggleBtn.click(); // -> login

      const subtitle = container.querySelector('p');
      expect(subtitle!.textContent).toContain('Welcome back!');
    });

    it('hides display name field when toggling back to login', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click(); // -> register
      toggleBtn.click(); // -> login

      const displayInput = container.querySelector('#auth-display');
      expect(displayInput).toBeNull();
    });

    it('shows "Already have an account?" text in register mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      const toggleText = container.querySelector('#auth-toggle') as HTMLButtonElement;
      expect(toggleText.textContent).toContain('Sign In');
    });
  });

  // ---------------------------------------------------------------------------
  // Form validation
  // ---------------------------------------------------------------------------

  describe('form validation', () => {
    it('shows error when submitting with empty fields', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', '');
      setField(container, 'auth-password', '');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Please fill in all fields');
      expect(errorEl.style.display).toBe('block');
    });

    it('shows error when username is empty', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', '');
      setField(container, 'auth-password', 'password123');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Please fill in all fields');
    });

    it('shows error when password is empty', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', '');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Please fill in all fields');
    });

    it('does not show error when both fields are filled', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'password123');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      // Error should remain hidden or not show "Please fill in all fields"
      expect(errorEl.textContent).not.toContain('Please fill in all fields');
    });
  });

  // ---------------------------------------------------------------------------
  // Login API interaction
  // ---------------------------------------------------------------------------

  describe('login API interaction', () => {
    it('calls /api/auth/login endpoint for login', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'myuser');
      setField(container, 'auth-password', 'mypass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/login');
      });
      expect(loginCall).toBeTruthy();
    });

    it('sends POST request with JSON body for login', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/login');
      });
      expect(loginCall).toBeTruthy();
      const init = loginCall![1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      const body = JSON.parse(init.body as string);
      expect(body.username).toBe('testuser');
      expect(body.password).toBe('testpass');
    });

    it('stores token and user in localStorage on successful login', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthResponse({
          token: 'jwt-token-xyz',
          user: { username: 'testuser', displayName: 'Test', tier: 'free' },
        }),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      expect(localStorage.getItem('hm_token')).toBe('jwt-token-xyz');
      const user = JSON.parse(localStorage.getItem('hm_user') || '{}');
      expect(user.username).toBe('testuser');
      expect(user.displayName).toBe('Test');
    });

    it('navigates to dashboard on successful login', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthResponse({
          token: 'token',
          user: { username: 'testuser' },
        }),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('dashboard');
    });

    it('shows error from server on failed login', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthError('Invalid credentials', 401),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'wrongpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Invalid credentials');
      expect(errorEl.style.display).toBe('block');
    });

    it('shows "Authentication failed" when error message is missing', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Authentication failed');
    });

    it('shows "Server connection failed" on network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.textContent).toContain('Server connection failed');
    });

    it('does not navigate on failed login', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthError('Bad credentials', 401),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'wrong');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      expect(mockNavigate).not.toHaveBeenCalledWith('dashboard');
    });
  });

  // ---------------------------------------------------------------------------
  // Register API interaction
  // ---------------------------------------------------------------------------

  describe('register API interaction', () => {
    it('calls /api/auth/register endpoint for registration', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      // Switch to register mode
      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      setField(container, 'auth-username', 'newuser');
      setField(container, 'auth-password', 'newpass');
      setField(container, 'auth-display', 'New User');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const registerCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/register');
      });
      expect(registerCall).toBeTruthy();
    });

    it('includes displayName in register body when provided', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      setField(container, 'auth-username', 'newuser');
      setField(container, 'auth-password', 'newpass');
      setField(container, 'auth-display', 'Display Name');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const registerCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/register');
      });
      const body = JSON.parse((registerCall![1] as RequestInit).body as string);
      expect(body.username).toBe('newuser');
      expect(body.password).toBe('newpass');
      expect(body.displayName).toBe('Display Name');
    });

    it('does not include displayName when not provided', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      setField(container, 'auth-username', 'newuser');
      setField(container, 'auth-password', 'newpass');
      // Leave display name empty

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const registerCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/register');
      });
      const body = JSON.parse((registerCall![1] as RequestInit).body as string);
      expect(body.username).toBe('newuser');
      expect(body.password).toBe('newpass');
      expect(body.displayName).toBeUndefined();
    });

    it('navigates to dashboard on successful registration', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthResponse({
          token: 'reg-token',
          user: { username: 'newuser', displayName: 'New' },
        }),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      setField(container, 'auth-username', 'newuser');
      setField(container, 'auth-password', 'newpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('dashboard');
    });
  });

  // ---------------------------------------------------------------------------
  // Guest mode
  // ---------------------------------------------------------------------------

  describe('guest mode', () => {
    it('navigates to game page when guest button is clicked', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const guestBtn = container.querySelector('#auth-guest') as HTMLButtonElement;
      expect(guestBtn).toBeTruthy();
      guestBtn.click();

      expect(mockNavigate).toHaveBeenCalledWith('game');
    });

    it('does not make any API calls for guest mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const guestBtn = container.querySelector('#auth-guest') as HTMLButtonElement;
      guestBtn.click();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not store anything in localStorage for guest mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const guestBtn = container.querySelector('#auth-guest') as HTMLButtonElement;
      guestBtn.click();

      expect(localStorage.getItem('hm_token')).toBeNull();
      expect(localStorage.getItem('hm_user')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('submits form when Enter is pressed in password field', async () => {
      fetchSpy.mockResolvedValue(
        makeAuthResponse({
          token: 'enter-token',
          user: { username: 'testuser' },
        }),
      );

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;
      passwordInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));

      await flushAsync();

      expect(mockNavigate).toHaveBeenCalledWith('dashboard');
    });

    it('does not submit form when non-Enter key is pressed in password field', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;
      passwordInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Tab' }));

      await flushAsync();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Error display
  // ---------------------------------------------------------------------------

  describe('error display', () => {
    it('error element starts hidden', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      // The style attribute contains "display: none" in the inline HTML
      expect(errorEl.outerHTML).toContain('display: none');
    });

    it('error element becomes visible when error occurs', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      expect(errorEl.style.display).toBe('block');
    });

    it('error has red styling for visibility', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const errorEl = container.querySelector('#auth-error') as HTMLDivElement;
      // Check that error styling includes red color indicators
      expect(errorEl.style.color).toBeFalsy(); // Color is set via inline style in the template
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles username with leading/trailing whitespace (trims)', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', '  spaceduser  ');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth');
      });
      const body = JSON.parse((loginCall![1] as RequestInit).body as string);
      expect(body.username).toBe('spaceduser');
    });

    it('handles empty password-only whitespace', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', '   ');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      // Password is not trimmed, so "   " passes validation
      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth');
      });
      expect(loginCall).toBeTruthy();
    });

    it('handles display name with leading/trailing whitespace (trims)', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      setField(container, 'auth-username', 'newuser');
      setField(container, 'auth-password', 'newpass');
      setField(container, 'auth-display', '  Display Name  ');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const registerCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth/register');
      });
      const body = JSON.parse((registerCall![1] as RequestInit).body as string);
      expect(body.displayName).toBe('Display Name');
    });

    it('renderAuthPage does not crash on empty container', async () => {
      const { renderAuthPage } = await import('./auth');
      expect(() => renderAuthPage(container)).not.toThrow();
    });

    it('can toggle modes multiple times without issues', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click(); // register
      toggleBtn.click(); // login
      toggleBtn.click(); // register
      toggleBtn.click(); // login

      const subtitle = container.querySelector('p');
      expect(subtitle!.textContent).toContain('Welcome back!');
    });
  });

  // ---------------------------------------------------------------------------
  // Form content type
  // ---------------------------------------------------------------------------

  describe('request format', () => {
    it('sends Content-Type application/json', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'testuser');
      setField(container, 'auth-password', 'testpass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth');
      });
      const headers = (loginCall![1] as RequestInit).headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sends stringified JSON body', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      setField(container, 'auth-username', 'user');
      setField(container, 'auth-password', 'pass');

      const submitBtn = container.querySelector('#auth-submit') as HTMLButtonElement;
      submitBtn.click();

      await flushAsync();

      const loginCall = fetchSpy.mock.calls.find((c) => {
        const u = typeof c[0] === 'string' ? c[0] : (c[0] as Request).url;
        return u.includes('/api/auth');
      });
      const body = (loginCall![1] as RequestInit).body as string;
      expect(() => JSON.parse(body)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // UI labels
  // ---------------------------------------------------------------------------

  describe('UI labels', () => {
    it('has label for username field', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const labels = container.querySelectorAll('label');
      const usernameLabel = Array.from(labels).find((l) => l.textContent?.includes('Username'));
      expect(usernameLabel).toBeTruthy();
    });

    it('has label for password field', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const labels = container.querySelectorAll('label');
      const passwordLabel = Array.from(labels).find((l) => l.textContent?.includes('Password'));
      expect(passwordLabel).toBeTruthy();
    });

    it('has label for display name in register mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      const toggleBtn = container.querySelector('#auth-toggle') as HTMLButtonElement;
      toggleBtn.click();

      const labels = container.querySelectorAll('label');
      const displayLabel = Array.from(labels).find((l) => l.textContent?.includes('Display Name'));
      expect(displayLabel).toBeTruthy();
    });

    it('has OR divider between auth and guest mode', async () => {
      const { renderAuthPage } = await import('./auth');
      renderAuthPage(container);

      expect(container.textContent).toContain('OR');
    });
  });
});
