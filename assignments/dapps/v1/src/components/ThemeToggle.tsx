import { type FC, useContext } from 'react';
import type { ThemeToggleProps } from '../types/index.ts';
import { ThemeContext } from './Layout.tsx';

export const ThemeToggle: FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className="theme-toggle-icon">
        {theme === 'light' ? '\u{1F319}' : '\u{2600}'}
      </span>
    </button>
  );
};
