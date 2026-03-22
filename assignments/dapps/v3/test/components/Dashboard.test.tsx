import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../src/App';

describe('Dashboard', () => {
  it('renders without crashing', () => { expect(() => render(<App />)).not.toThrow(); });
  it('shows title', () => { const { getByText } = render(<App />); expect(getByText('DeFi Dashboard v3')).toBeTruthy(); });
});
