// Initialize global variables
let mlServiceEndpoint = 'https://api.adfrauddetector.com/analyze';
let fraudDetectionThreshold = 0.7;
let isEnabled = true;

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ad Fraud Detector installed');
  
  // Initialize storage with default settings
  chrome.storage.local.set({
    isEnabled: true,
    fraudDetectionThreshold: 0.7,
    mlServiceEndpoint: 'https://api.adfrauddetector.com/analyze',
    detectedFrauds: [],
    statistics: {
      scannedAds: 0,
      detectedFrauds: 0,
      lastScan: null
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Load current settings before processing message
  chrome.storage.local.get(['isEnabled', 'fraudDetectionThreshold', 'mlServiceEndpoint'], (data) => {
    isEnabled = data.isEnabled;
    fraudDetectionThreshold = data.fraudDetectionThreshold;
    mlServiceEndpoint = data.mlServiceEndpoint;
    
    // Process message based on type
    if (message.type === 'AD_DETECTED' && isEnabled) {
      analyzeAd(message.adData).then(result => {
        updateStatistics(result);
        if (result.fraudScore > fraudDetectionThreshold) {
          notifyUser(sender.tab.id, result);
          logFraudulentAd(result);
        }
        sendResponse({status: 'analyzed', result});
      }).catch(error => {
        console.error('Error analyzing ad:', error);
        sendResponse({status: 'error', error: error.message});
      });
      return true; // Indicates async response
    } else if (message.type === 'GET_STATISTICS') {
      chrome.storage.local.get('statistics', (data) => {
        sendResponse({statistics: data.statistics});
      });
      return true;
    } else if (message.type === 'GET_FRAUD_LIST') {
      chrome.storage.local.get('detectedFrauds', (data) => {
        sendResponse({frauds: data.detectedFrauds});
      });
      return true;
    }
  });
});

// Analyze ad data using ML service
async function analyzeAd(adData) {
  try {
    const response = await fetch(mlServiceEndpoint, {
      method: 'POST',
      body: JSON.stringify(adData),
      headers: {'Content-Type': 'application/json'}
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling ML service:', error);
    // Return default result with low fraud score if service is unavailable
    return {
      fraudScore: 0.1,
      confidence: 0.5,
      fraudType: 'unknown',
      error: error.message
    };
  }
}

// Update statistics after analyzing an ad
function updateStatistics(result) {
  chrome.storage.local.get('statistics', (data) => {
    const stats = data.statistics || {
      scannedAds: 0,
      detectedFrauds: 0,
      lastScan: null
    };
    
    stats.scannedAds++;
    if (result.fraudScore > fraudDetectionThreshold) {
      stats.detectedFrauds++;
    }
    stats.lastScan = new Date().toISOString();
    
    chrome.storage.local.set({statistics: stats});
  });
}

// Notify user about detected fraud
function notifyUser(tabId, result) {
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    function: (result) => {
      // Create and show notification
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '10px';
      notification.style.right = '10px';
      notification.style.backgroundColor = '#ff4444';
      notification.style.color = 'white';
      notification.style.padding = '10px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = '10000';
      notification.style.maxWidth = '300px';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      
      notification.innerHTML = `
        <h4 style="margin: 0 0 5px 0;">⚠️ Ad Fraud Detected</h4>
        <p style="margin: 0;">Type: ${result.fraudType || 'Unknown'}</p>
        <p style="margin: 0;">Confidence: ${Math.round(result.confidence * 100)}%</p>
      `;
      
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    },
    args: [result]
  });
}

// Log fraudulent ad to storage
function logFraudulentAd(result) {
  chrome.storage.local.get('detectedFrauds', (data) => {
    const frauds = data.detectedFrauds || [];
    
    // Add new fraud with timestamp
    frauds.push({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the last 100 detected frauds
    if (frauds.length > 100) {
      frauds.shift();
    }
    
    chrome.storage.local.set({detectedFrauds: frauds});
  });
}