import { type FC, createContext, useEffect, useCallback, useRef, useState } from 'react';
import type { LayoutProps, ToastMessage } from '../types/index.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { useClickOutside } from '../hooks/useClickOutside.ts';
import { Navbar } from './Navbar.tsx';
import { Footer } from './Footer.tsx';
import { ToastContainer, type Toast } from './Toast.tsx';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  showToast: () => {},
});

export const Layout: FC<LayoutProps> = ({ children, className = '' }) => {
  const themeValue = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeValue.theme);
  }, [themeValue.theme]);

  // Click outside handler
  useClickOutside(containerRef, useCallback(() => {
    // Handle any global click-outside logic here
  }, []));

  // Toast management
  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose toast API via context
  const layoutContext = {
    showToast,
    theme: themeValue.theme,
    toggleTheme: themeValue.toggleTheme,
    setTheme: themeValue.setTheme,
  };

  return (
    <ThemeContext.Provider value={layoutContext}>
      <div className={`layout ${className}`} ref={containerRef}>
        <Navbar />
        <main className="main-content">
          <div className="container">{children}</div>
        </main>
        <Footer />

        {/* Toast container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </ThemeContext.Provider>
  );
};
