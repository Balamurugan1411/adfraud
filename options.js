document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const fraudThresholdInput = document.getElementById('fraudThreshold');
  const thresholdValueDisplay = document.getElementById('thresholdValue');
  const mlEndpointInput = document.getElementById('mlEndpoint');
  const showNotificationsCheckbox = document.getElementById('showNotifications');
  const highlightAdsCheckbox = document.getElementById('highlightAds');
  const sendAnonymousStatsCheckbox = document.getElementById('sendAnonymousStats');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const resetBtn = document.getElementById('resetBtn');
  const saveBtn = document.getElementById('saveBtn');
  const generateReportBtn = document.getElementById('generateReportBtn');
  const reportWebsiteBtn = document.getElementById('reportWebsiteBtn');

  // Load saved settings
  loadSettings();

  // Add event listeners
  fraudThresholdInput?.addEventListener('input', () => {
    thresholdValueDisplay.textContent = fraudThresholdInput.value;
  });

  saveBtn?.addEventListener('click', saveSettings);
  resetBtn?.addEventListener('click', resetSettings);
  clearDataBtn?.addEventListener('click', clearAllData);
  generateReportBtn?.addEventListener('click', generatePDFReport);
  reportWebsiteBtn?.addEventListener('click', () => {
    window.open('https://adfrauddetector.com/report', '_blank');
  });

  // Settings management functions
  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'fraudDetectionThreshold',
      'mlServiceEndpoint',
      'showNotifications',
      'highlightAds',
      'sendAnonymousStats'
    ]);

    fraudThresholdInput.value = settings.fraudDetectionThreshold || 0.7;
    thresholdValueDisplay.textContent = fraudThresholdInput.value;
    mlEndpointInput.value = settings.mlServiceEndpoint || 'https://api.adfrauddetector.com/analyze';
    showNotificationsCheckbox.checked = settings.showNotifications !== false;
    highlightAdsCheckbox.checked = settings.highlightAds !== false;
    sendAnonymousStatsCheckbox.checked = settings.sendAnonymousStats !== false;
  }

  async function saveSettings() {
    const settings = {
      fraudDetectionThreshold: parseFloat(fraudThresholdInput.value),
      mlServiceEndpoint: mlEndpointInput.value,
      showNotifications: showNotificationsCheckbox.checked,
      highlightAds: highlightAdsCheckbox.checked,
      sendAnonymousStats: sendAnonymousStatsCheckbox.checked
    };

    await chrome.storage.local.set(settings);
    showStatus('Settings saved successfully!', 'success');
  }

  async function resetSettings() {
    const defaultSettings = {
      fraudDetectionThreshold: 0.7,
      mlServiceEndpoint: 'https://api.adfrauddetector.com/analyze',
      showNotifications: true,
      highlightAds: true,
      sendAnonymousStats: true
    };

    await chrome.storage.local.set(defaultSettings);
    await loadSettings();
    showStatus('Settings reset to defaults', 'success');
  }

  async function clearAllData() {
    if (confirm('Are you sure you want to clear all stored data? This action cannot be undone.')) {
      await chrome.storage.local.clear();
      await loadSettings();
      showStatus('All data cleared successfully', 'success');
    }
  }

  // Report generation functions
  async function generatePDFReport() {
    try {
      const data = await chrome.storage.local.get(['detectedFrauds', 'statistics']);
      
      const docDefinition = {
        content: [
          {
            text: 'Ad Fraud Detection Report',
            style: 'header',
            margin: [0, 0, 0, 20]
          },
          {
            text: `Generated on ${new Date().toLocaleString()}`,
            style: 'date',
            margin: [0, 0, 0, 20]
          },
          {
            text: 'Summary Statistics',
            style: 'subheader'
          },
          {
            ul: [
              `Total Ads Scanned: ${data.statistics?.scannedAds || 0}`,
              `Fraudulent Ads Detected: ${data.statistics?.detectedFrauds || 0}`,
              `Detection Rate: ${calculateDetectionRate(data.statistics)}%`,
              `Last Scan: ${data.statistics?.lastScan ? new Date(data.statistics.lastScan).toLocaleString() : 'Never'}`
            ],
            margin: [0, 0, 0, 20]
          },
          {
            text: 'Fraud Type Analysis',
            style: 'subheader'
          },
          generateFraudTypeAnalysis(data.detectedFrauds || []),
          {
            text: 'Recent Detections',
            style: 'subheader',
            margin: [0, 20, 0, 10]
          },
          generateRecentDetectionsTable(data.detectedFrauds || [])
        ],
        styles: {
          header: {
            fontSize: 22,
            bold: true,
            color: '#2c3e50'
          },
          subheader: {
            fontSize: 16,
            bold: true,
            color: '#34495e',
            margin: [0, 10, 0, 5]
          },
          date: {
            fontSize: 12,
            color: '#7f8c8d'
          }
        }
      };

      pdfMake.createPdf(docDefinition).download('ad-fraud-report.pdf');
      showStatus('PDF report generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showStatus('Error generating PDF report', 'error');
    }
  }

  // Helper functions
  function calculateDetectionRate(statistics) {
    if (!statistics?.scannedAds || statistics.scannedAds === 0) return 0;
    return ((statistics.detectedFrauds || 0) / statistics.scannedAds * 100).toFixed(1);
  }

  function generateFraudTypeAnalysis(frauds) {
    const types = frauds.reduce((acc, fraud) => {
      acc[fraud.fraudType] = (acc[fraud.fraudType] || 0) + 1;
      return acc;
    }, {});

    return {
      ul: Object.entries(types).map(([type, count]) => 
        `${type}: ${count} detection${count !== 1 ? 's' : ''}`
      )
    };
  }

  function generateRecentDetectionsTable(frauds) {
    const recentFrauds = frauds.slice(-10).reverse();

    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body: [
          [
            { text: 'Date', style: 'tableHeader' },
            { text: 'URL', style: 'tableHeader' },
            { text: 'Type', style: 'tableHeader' },
            { text: 'Score', style: 'tableHeader' }
          ],
          ...recentFrauds.map(fraud => [
            new Date(fraud.timestamp).toLocaleDateString(),
            fraud.pageUrl,
            fraud.fraudType,
            `${(fraud.fraudScore * 100).toFixed(1)}%`
          ])
        ]
      }
    };
  }

  function showStatus(message, type = 'success') {
    const statusElement = document.getElementById('saveConfirmation');
    statusElement.textContent = message;
    statusElement.className = `status-message show ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
      statusElement.style.display = 'none';
      statusElement.className = 'status-message';
    }, 3000);
  }

  // Add button animations
  function addButtonAnimation(button) {
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1)';
      button.style.transition = 'transform 0.2s';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
  }

  // Apply animations to all buttons
  document.querySelectorAll('button').forEach(addButtonAnimation);
});