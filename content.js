// Track processed elements to avoid duplicate analysis
const processedElements = new WeakSet();

// Main function to scan for ads
function scanForAds() {
  // Find potential ad elements using common selectors
  const adSelectors = [
    'iframe[id*="ad"]', 'iframe[src*="ad"]', 'iframe[id*="banner"]',
    'div[id*="ad"]', 'div[class*="ad"]', 'div[id*="banner"]',
    'a[href*="ad"]', 'a[href*="click"]', 'a[href*="sponsor"]',
    'ins.adsbygoogle', '.ad-unit', '.advertisement',
    '[data-ad]', '[data-ad-unit]', '[data-ad-slot]'
  ];
  
  const potentialAdElements = document.querySelectorAll(adSelectors.join(','));
  
  // Process each potential ad element
  potentialAdElements.forEach(element => {
    // Skip if already processed
    if (processedElements.has(element)) return;
    
    // Mark as processed
    processedElements.add(element);
    
    // Collect metrics and analyze
    collectAdMetrics(element);
  });
}

// Collect metrics for a potential ad element
function collectAdMetrics(element) {
  // Get element type and tag-specific info
  const elementType = element.tagName.toLowerCase();
  let specificInfo = {};
  
  if (elementType === 'iframe') {
    specificInfo = getIframeInfo(element);
  }
  
  // Get element metrics
  const rect = element.getBoundingClientRect();
  const viewability = checkViewability(element);
  const adNetworkInfo = extractAdNetworkInfo(element);
  
  // Collect all metrics
  const metrics = {
    elementType,
    size: {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    position: {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY)
    },
    viewability,
    adNetworkInfo,
    specificInfo,
    url: element.src || element.href || null,
    id: element.id || null,
    classList: Array.from(element.classList) || [],
    loadTime: performance.now(),
    pageUrl: window.location.href,
    pageTitle: document.title
  };
  
  // Send to background script for analysis
  chrome.runtime.sendMessage({
    type: 'AD_DETECTED',
    adData: {
      timestamp: Date.now(),
      metrics
    }
  }, response => {
    // Handle response from background script
    if (response && response.result && response.result.fraudScore > 0.7) {
      highlightFraudulentAd(element, response.result);
    }
  });
}

// Highlight fraudulent ad for visual indication
function highlightFraudulentAd(element, result) {
  // Create border overlay
  const overlay = document.createElement('div');
  const rect = element.getBoundingClientRect();
  
  // Style the overlay
  overlay.style.position = 'absolute';
  overlay.style.left = `${window.scrollX + rect.left}px`;
  overlay.style.top = `${window.scrollY + rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.border = '3px solid red';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  overlay.style.boxSizing = 'border-box';
  
  // Add warning label
  const label = document.createElement('div');
  label.textContent = `⚠️ Fraud Score: ${Math.round(result.fraudScore * 100)}%`;
  label.style.position = 'absolute';
  label.style.top = '-25px';
  label.style.left = '0';
  label.style.backgroundColor = 'red';
  label.style.color = 'white';
  label.style.padding = '3px 6px';
  label.style.fontSize = '12px';
  label.style.fontWeight = 'bold';
  label.style.borderRadius = '3px';
  
  overlay.appendChild(label);
  document.body.appendChild(overlay);
  
  // Remove overlay after 10 seconds
  setTimeout(() => {
    overlay.remove();
  }, 10000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForAds);
} else {
  scanForAds();
}

// Also scan when DOM changes
const observer = new MutationObserver(() => {
  scanForAds();
});

// Start observing document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Scan again on window resize (for viewability changes)
window.addEventListener('resize', scanForAds);

// Scan again on scroll (for viewability changes)
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(scanForAds, 300);
});