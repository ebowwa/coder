import { type FC } from 'react';
import type { NavbarProps } from '../types/index.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { WalletConnect } from './WalletConnect.tsx';

export const Navbar: FC<NavbarProps> = ({ className = '' }) => {
  return (
    <nav className={`navbar ${className}`}>
      <div className="container">
        <div className="navbar-content">
          <a href="/" className="navbar-brand">
            <span role="img" aria-label="logo">
              ⚡
            </span>
            CryptoDApp
          </a>

          <ul className="navbar-nav">
            <li>
              <a href="#features" className="nav-link">
                Features
              </a>
            </li>
            <li>
              <a href="#about" className="nav-link">
                About
              </a>
            </li>
            <li>
              <a href="#docs" className="nav-link">
                Docs
              </a>
            </li>
          </ul>

          <div className="navbar-actions">
            <WalletConnect />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};
