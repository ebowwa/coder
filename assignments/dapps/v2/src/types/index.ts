/**
 * Types Index
 * Export all types
 */

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Component prop types
export interface NavbarProps {
  className?: string;
}

export interface FooterProps {
  className?: string;
}

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface WalletConnectProps {
  className?: string;
}

export interface ThemeToggleProps {
  className?: string;
}

// Web3 types - re-export from web3.ts
export * from './web3.ts';
