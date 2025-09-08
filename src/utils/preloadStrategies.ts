// Preload critical routes
export const preloadCriticalRoutes = () => {
  if (typeof window !== 'undefined') {
    // Preload most commonly accessed routes
    const criticalRoutes = [
      '/dashboard',
      '/feeding', 
      '/manejos'
    ];

    criticalRoutes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  }
};

// Preload critical images
export const preloadCriticalImages = () => {
  if (typeof window !== 'undefined') {
    const criticalImages = [
      '/favicon-shrimp.png',
      '/opengraph-aquahub.png'
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }
};

// Initialize all preload strategies
export const initializePreloadStrategies = () => {
  // Run on idle to avoid blocking initial render
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadCriticalRoutes();
      preloadCriticalImages();
    });
  } else {
    setTimeout(() => {
      preloadCriticalRoutes();
      preloadCriticalImages();
    }, 1000);
  }
};