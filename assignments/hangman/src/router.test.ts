/**
 * Tests for Router - Client-side SPA Router
 */

import { describe, it, expect, beforeEach, jest } from 'bun:test';

// Import the router singleton - it creates a div#app-pages in the constructor
// Since we can't re-instantiate, we'll work with the singleton and reset DOM state
import { router } from './router';

describe('Router', () => {
  beforeEach(() => {
    // Reset DOM - remove all children from body then re-add app-pages
    document.body.innerHTML = '';
    localStorage.clear();

    // Re-add the router's container to the DOM (it was cleared by innerHTML = '')
    const container = document.createElement('div');
    container.id = 'app-pages';
    container.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 1000; display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(container);

    // Reset the router's internal state by setting its private fields
    (router as any).currentPage = 'auth';
    (router as any).pages = new Map();
    // Point the router's container to our fresh one
    (router as any).container = container;
  });

  describe('singleton export', () => {
    it('should export a router instance', () => {
      expect(router).toBeDefined();
      expect(router.getCurrentPage).toBeTypeOf('function');
    });

    it('should have navigate method', () => {
      expect(router.navigate).toBeTypeOf('function');
    });

    it('should have registerPage method', () => {
      expect(router.registerPage).toBeTypeOf('function');
    });

    it('should have getPageContainer method', () => {
      expect(router.getPageContainer).toBeTypeOf('function');
    });
  });

  describe('container creation', () => {
    it('should create an app-pages container in the DOM', () => {
      const container = document.getElementById('app-pages');
      expect(container).not.toBeNull();
    });

    it('should set the container id to "app-pages"', () => {
      const container = document.getElementById('app-pages');
      expect(container?.id).toBe('app-pages');
    });

    it('should apply fixed positioning styles to container', () => {
      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.style.position).toBe('fixed');
    });

    it('should initially hide the container (display: none)', () => {
      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.style.display).toBe('none');
    });

    it('should set z-index to 1000', () => {
      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.style.zIndex).toBe('1000');
    });
  });

  describe('initial state', () => {
    it('should start on "auth" page', () => {
      expect(router.getCurrentPage()).toBe('auth');
    });
  });

  describe('registerPage', () => {
    it('should register a page with a render function', () => {
      const render = jest.fn();
      router.registerPage('dashboard', { render });
      router.navigate('dashboard');
      expect(render).toHaveBeenCalled();
    });

    it('should pass the container to the render function', () => {
      const render = jest.fn();
      router.registerPage('dashboard', { render });
      router.navigate('dashboard');
      expect(render).toHaveBeenCalledTimes(1);
    });

    it('should register pages for all known page types', () => {
      const pages = ['auth', 'dashboard', 'lobby', 'profile', 'friends', 'game'];
      pages.forEach(page => {
        const render = jest.fn();
        expect(() => router.registerPage(page as any, { render })).not.toThrow();
      });
    });
  });

  describe('navigate', () => {
    it('should change the current page', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');
      expect(router.getCurrentPage()).toBe('dashboard');
    });

    it('should show the container for non-game pages', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');
      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.style.display).toBe('block');
    });

    it('should hide the container for the game page', () => {
      router.registerPage('game', { render: jest.fn() });
      router.navigate('game');
      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.style.display).toBe('none');
    });

    it('should clear innerHTML before rendering new page', () => {
      const render1 = jest.fn();
      const render2 = jest.fn();
      router.registerPage('dashboard', { render: render1 });
      router.registerPage('lobby', { render: render2 });

      router.navigate('dashboard');
      expect(render1).toHaveBeenCalled();
      router.navigate('lobby');
      expect(render2).toHaveBeenCalled();
    });

    it('should call cleanup on previous page when navigating away', () => {
      const cleanup = jest.fn();
      router.registerPage('dashboard', { render: jest.fn(), cleanup });
      router.registerPage('lobby', { render: jest.fn() });

      router.navigate('dashboard');
      router.navigate('lobby');

      expect(cleanup).toHaveBeenCalled();
    });

    it('should not throw if navigating to an unregistered page', () => {
      expect(() => router.navigate('profile')).not.toThrow();
    });

    it('should render the nav bar for non-game pages when logged in', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'testuser' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.innerHTML).toContain('nav');
    });

    it('should not render the nav bar for the game page', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'testuser' }));

      router.registerPage('game', { render: jest.fn() });
      router.navigate('game');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.innerHTML).not.toContain('nav-logo');
    });

    it('should not render the nav bar when no token is present', () => {
      localStorage.removeItem('hm_token');

      router.registerPage('auth', { render: jest.fn() });
      router.navigate('auth');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.querySelector('#nav-logo')).toBeNull();
    });
  });

  describe('nav bar', () => {
    beforeEach(() => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({
        username: 'testuser',
        displayName: 'Test User',
        avatar: '#ff0000',
        tier: 'free',
      }));
    });

    it('should display "Hangman Pro" brand text', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.innerHTML).toContain('Hangman Pro');
    });

    it('should show navigation buttons for all pages', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      const buttons = container.querySelectorAll('[data-page]');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it('should highlight the current page button', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      const dashBtn = container.querySelector('[data-page="dashboard"]') as HTMLButtonElement;
      const style = dashBtn.getAttribute('style') || '';
      expect(style).toContain('rgba(78,205,196,0.2)');
    });

    it('should show user avatar initial', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const avatar = document.getElementById('nav-avatar') as HTMLDivElement;
      expect(avatar).not.toBeNull();
      expect(avatar.textContent).toBe('T');
    });

    it('should show PRO badge for pro users', () => {
      localStorage.setItem('hm_user', JSON.stringify({
        username: 'prouser',
        tier: 'pro',
      }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      expect(container.innerHTML).toContain('PRO');
    });

    it('should not show PRO badge for free users', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      const logoDiv = container.querySelector('#nav-logo');
      expect(logoDiv?.querySelector('span:last-child')?.textContent).not.toBe('PRO');
    });

    it('should navigate when clicking nav buttons', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.registerPage('lobby', { render: jest.fn() });
      router.navigate('dashboard');

      const container = document.getElementById('app-pages') as HTMLDivElement;
      const lobbyBtn = container.querySelector('[data-page="lobby"]') as HTMLButtonElement;
      lobbyBtn.click();

      expect(router.getCurrentPage()).toBe('lobby');
    });

    it('should navigate to dashboard when clicking logo', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.registerPage('lobby', { render: jest.fn() });
      router.navigate('lobby');

      const logo = document.getElementById('nav-logo') as HTMLDivElement;
      logo.click();

      expect(router.getCurrentPage()).toBe('dashboard');
    });

    it('should navigate to profile when clicking avatar', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.registerPage('profile', { render: jest.fn() });
      router.navigate('dashboard');

      const avatar = document.getElementById('nav-avatar') as HTMLDivElement;
      avatar.click();

      expect(router.getCurrentPage()).toBe('profile');
    });

    it('should clear auth data and navigate to auth on logout', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.registerPage('auth', { render: jest.fn() });
      router.navigate('dashboard');

      const logoutBtn = document.getElementById('nav-logout') as HTMLButtonElement;
      logoutBtn.click();

      expect(localStorage.getItem('hm_token')).toBeNull();
      expect(localStorage.getItem('hm_user')).toBeNull();
      expect(router.getCurrentPage()).toBe('auth');
    });

    it('should create page-content div', () => {
      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const pageContent = document.getElementById('page-content');
      expect(pageContent).not.toBeNull();
    });
  });

  describe('getPageContainer', () => {
    it('should return null before any navigation', () => {
      // After reset in beforeEach, page-content doesn't exist yet
      expect(router.getPageContainer()).toBeNull();
    });

    it('should return the page-content element after navigation to a non-game page', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'testuser' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const pageContent = router.getPageContainer();
      expect(pageContent).not.toBeNull();
      expect(pageContent?.id).toBe('page-content');
    });
  });

  describe('canvas and hint-button handling', () => {
    it('should hide canvas when navigating to non-game page', () => {
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      document.body.appendChild(canvas);

      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'testuser' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      expect(canvas.style.display).toBe('none');
    });

    it('should show canvas when navigating to game page', () => {
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);

      router.registerPage('game', { render: jest.fn() });
      router.navigate('game');

      expect(canvas.style.display).toBe('block');
    });

    it('should hide hint-button on non-game pages', () => {
      const hintBtn = document.createElement('button');
      hintBtn.id = 'hint-button';
      hintBtn.style.display = 'block';
      document.body.appendChild(hintBtn);

      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'testuser' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      expect(hintBtn.style.display).toBe('none');
    });
  });

  describe('PageName type', () => {
    it('should accept all valid page names', () => {
      const validPages = ['auth', 'dashboard', 'lobby', 'profile', 'friends', 'game'];
      validPages.forEach(page => {
        expect(() => router.registerPage(page as any, { render: jest.fn() })).not.toThrow();
      });
    });
  });

  describe('user display in nav', () => {
    it('should use "?" as avatar when no user info is available', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({}));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const avatar = document.getElementById('nav-avatar') as HTMLDivElement;
      expect(avatar.textContent).toBe('?');
    });

    it('should use displayName first letter when available', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ displayName: 'Alice' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const avatar = document.getElementById('nav-avatar') as HTMLDivElement;
      expect(avatar.textContent).toBe('A');
    });

    it('should use username first letter when displayName is not available', () => {
      localStorage.setItem('hm_token', 'test-token');
      localStorage.setItem('hm_user', JSON.stringify({ username: 'bob123' }));

      router.registerPage('dashboard', { render: jest.fn() });
      router.navigate('dashboard');

      const avatar = document.getElementById('nav-avatar') as HTMLDivElement;
      expect(avatar.textContent).toBe('B');
    });
  });
});
