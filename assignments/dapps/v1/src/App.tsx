/**
 * Main App Component
 * Full landing page with Web3 wallet integration
 */

import { WalletButton } from './components/WalletButton.tsx';
import { NetworkSwitcher } from './components/NetworkSwitcher.tsx';
import { useWeb3 } from './providers/Web3Provider.tsx';
import './styles/globals.css';
import './App.css';

export function App() {
  const { address, isConnected } = useWeb3();

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="logo">Web3 DApp</a>
          <ul className="nav-menu">
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <div className="nav-wallet">
            <NetworkSwitcher />
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <h1>Welcome to the Future of Web3</h1>
        <p>Build amazing decentralized experiences with modern blockchain technologies. Simple, fast, and beautifully designed for everyone.</p>
        {isConnected ? (
          <div className="connected-info">
            <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <a href="#features" className="cta-button">Explore Features</a>
          </div>
        ) : (
          <a href="#features" className="cta-button">Get Started</a>
        )}
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <div className="about-container">
          <div className="about-content">
            <h2>About Our DApp</h2>
            <p>We are building the next generation of decentralized applications. Our mission is to make blockchain technology accessible, secure, and user-friendly for everyone.</p>
            <p>With cutting-edge smart contracts and seamless wallet integration, we're bridging the gap between traditional web and the decentralized future.</p>
          </div>
          <div className="about-image">🚀</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <h2>Why Choose Us?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Optimized smart contracts and transactions that execute in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure by Design</h3>
              <p>Built with security best practices and audited smart contracts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Multi-Chain</h3>
              <p>Support for Ethereum, Polygon, Arbitrum, Optimism, and more.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>NFT Support</h3>
              <p>Create, trade, and manage your NFT collections seamlessly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Token Swaps</h3>
              <p>Swap tokens instantly with the best rates across DEXs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics</h3>
              <p>Real-time portfolio tracking and transaction history.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <div className="pricing-container">
          <h2>Choose Your Plan</h2>
          <p className="pricing-subtitle">Simple, transparent pricing that grows with you</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Basic</h3>
                <div className="price">$0<span>/month</span></div>
                <p>Perfect for getting started</p>
              </div>
              <ul className="pricing-features">
                <li>5 Transactions/day</li>
                <li>Basic Support</li>
                <li>1 Network</li>
              </ul>
              <button className="pricing-button">Get Started</button>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-header">
                <h3>Pro</h3>
                <div className="price">$29<span>/month</span></div>
                <p>Best for power users</p>
              </div>
              <ul className="pricing-features">
                <li>Unlimited Transactions</li>
                <li>Priority Support</li>
                <li>All Networks</li>
                <li>Advanced Analytics</li>
              </ul>
              <button className="pricing-button">Get Started</button>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <div className="price">$99<span>/month</span></div>
                <p>For large organizations</p>
              </div>
              <ul className="pricing-features">
                <li>Everything in Pro</li>
                <li>Dedicated Support</li>
                <li>Custom Solutions</li>
                <li>SLA Guarantee</li>
              </ul>
              <button className="pricing-button">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact" id="contact">
        <div className="contact-container">
          <h2>Get In Touch</h2>
          <p>Have a question or want to work together? We'd love to hear from you!</p>
          <form className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input type="text" id="name" name="name" placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" placeholder="john@example.com" required />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" placeholder="Tell us about your project..." required></textarea>
            </div>
            <button type="submit" className="submit-button">Send Message</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-content">
          <div className="footer-links">
            <a href="#" className="footer-link">Home</a>
            <a href="#" className="footer-link">About</a>
            <a href="#" className="footer-link">Services</a>
            <a href="#" className="footer-link">Contact</a>
            <a href="#" className="footer-link">Privacy</a>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Web3 DApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
