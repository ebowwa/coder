/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../src/App';

describe('Dashboard', () => {
  it('renders without crashing', () => { expect(() => render(<App />)).not.toThrow(); });
  it('shows title', () => { const { container } = render(<App />); expect(container.textContent).toMatch(/NexusFi/i); });
});
