// Analytics stub
// Replace with your analytics implementation
(function() {
  console.log('Analytics initialized');

  // Example: Plausible, Google Analytics, or custom analytics
  // window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) };

  // Page view tracking
  function trackPageView() {
    const path = window.location.pathname;
    console.log('Page view:', path);
    // Send to analytics service
  }

  // Track navigation changes for SPA
  let lastPath = window.location.pathname;
  new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      trackPageView();
    }
  }).observe(document.body, { childList: true, subtree: true });

  trackPageView();
})();
