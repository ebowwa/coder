import { type FC } from 'react';
import type { FooterProps } from '../types/index.ts';

export const Footer: FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`footer ${className}`}>
      <div className="container">
        <div className="footer-content">
          <ul className="footer-links">
            <li>
              <a href="#privacy" className="footer-link">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#terms" className="footer-link">
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Twitter
              </a>
            </li>
          </ul>
          <p className="footer-copyright">
            © {currentYear} CryptoDApp. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
