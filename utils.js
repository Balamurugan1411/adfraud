// Check if element is viewable in the viewport
function checkViewability(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // Check if element is in viewport
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
    
    // Check if element is not hidden
    const isNotHidden = (
      getComputedStyle(element).display !== 'none' &&
      getComputedStyle(element).visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
    
    return {
      isInViewport: isVisible,
      isNotHidden: isNotHidden,
      visiblePercentage: calculateVisiblePercentage(rect, windowWidth, windowHeight)
    };
  }
  
  // Calculate what percentage of the element is visible
  function calculateVisiblePercentage(rect, windowWidth, windowHeight) {
    // If completely out of viewport, return 0
    if (
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.top > windowHeight ||
      rect.left > windowWidth
    ) {
      return 0;
    }
    
    // Calculate visible area
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleArea = visibleWidth * visibleHeight;
    
    // Calculate total area
    const totalArea = rect.width * rect.height;
    
    // Return percentage (0-100)
    return totalArea > 0 ? (visibleArea / totalArea) * 100 : 0;
  }
  
  // Extract ad network information from element or its parents
  function extractAdNetworkInfo(element) {
    // Common ad network identifiers in class names, IDs, or data attributes
    const adNetworks = [
      'google_ads', 'googlesyndication', 'doubleclick',
      'adnxs', 'taboola', 'outbrain', 'mgid',
      'criteo', 'adform', 'amazon-ad'
    ];
    
    // Check the element and its parents for ad network identifiers
    let currentElement = element;
    while (currentElement) {
      // Check element ID
      if (currentElement.id) {
        for (const network of adNetworks) {
          if (currentElement.id.toLowerCase().includes(network)) {
            return {network, source: 'id', value: currentElement.id};
          }
        }
      }
      
      // Check element classes
      if (currentElement.className && typeof currentElement.className === 'string') {
        for (const network of adNetworks) {
          if (currentElement.className.toLowerCase().includes(network)) {
            return {network, source: 'class', value: currentElement.className};
          }
        }
      }
      
      // Check data attributes
      for (const attr of currentElement.attributes) {
        if (attr.name.startsWith('data-')) {
          for (const network of adNetworks) {
            if (attr.name.includes(network) || attr.value.includes(network)) {
              return {network, source: attr.name, value: attr.value};
            }
          }
        }
      }
      
      // Move up to parent
      currentElement = currentElement.parentElement;
    }
    
    // If no specific network found
    return {network: 'unknown', source: null, value: null};
  }
  
  // Get iframe content information if possible
  function getIframeInfo(iframe) {
    try {
      // Try to access iframe content (this will throw an error if cross-origin)
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      return {
        canAccess: true,
        url: iframeDoc.URL,
        title: iframeDoc.title,
        elementCount: iframeDoc.body ? iframeDoc.body.childElementCount : 0
      };
    } catch (e) {
      // Cannot access iframe content due to same-origin policy
      return {
        canAccess: false,
        url: iframe.src,
        error: 'cross-origin-iframe'
      };
    }
  }