document.addEventListener('DOMContentLoaded', function() {
  // Existing element references...

  // Add real-time fraud score indicator
  const fraudScoreContainer = document.createElement('div');
  fraudScoreContainer.className = 'fraud-score-container';
  fraudScoreContainer.innerHTML = `
    <div class="score-ring">
      <svg viewBox="0 0 36 36">
        <path d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#eee"
          stroke-width="3"
        />
        <path id="scoreIndicator"
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#4285f4"
          stroke-width="3"
          stroke-dasharray="0, 100"
        />
      </svg>
      <div class="score-value">0%</div>
    </div>
    <div class="score-label">Current Page Safety Score</div>
  `;
  
  document.querySelector('.statistics').insertBefore(
    fraudScoreContainer,
    document.querySelector('.stat-grid')
  );

  // Add advanced statistics tracking
  const stats = {
    dailyScans: new Array(7).fill(0),
    fraudTypes: {},
    topDomains: {}
  };

  // Update statistics with animation
  function updateAdvancedStats() {
    chrome.storage.local.get(['statistics', 'detectedFrauds'], (data) => {
      if (data.detectedFrauds) {
        // Update fraud types distribution
        data.detectedFrauds.forEach(fraud => {
          stats.fraudTypes[fraud.fraudType] = (stats.fraudTypes[fraud.fraudType] || 0) + 1;
          const domain = new URL(fraud.pageUrl).hostname;
          stats.topDomains[domain] = (stats.topDomains[domain] || 0) + 1;
        });

        // Update safety score
        const safetyScore = calculateSafetyScore(data.statistics, data.detectedFrauds);
        updateSafetyScoreRing(safetyScore);
      }
    });
  }

  function calculateSafetyScore(statistics, frauds) {
    if (!statistics || !statistics.scannedAds || statistics.scannedAds === 0) {
      return 100;
    }
    const fraudRate = (statistics.detectedFrauds / statistics.scannedAds) * 100;
    return Math.max(0, Math.round(100 - fraudRate));
  }

  function updateSafetyScoreRing(score) {
    const indicator = document.getElementById('scoreIndicator');
    const scoreValue = document.querySelector('.score-value');
    const dashArray = (score * 100) / 100;
    
    indicator.style.strokeDasharray = `${dashArray}, 100`;
    scoreValue.textContent = `${score}%`;
    
    // Update color based on score
    if (score >= 80) {
      indicator.style.stroke = '#34a853'; // Green
    } else if (score >= 60) {
      indicator.style.stroke = '#fbbc05'; // Yellow
    } else {
      indicator.style.stroke = '#ea4335'; // Red
    }
  }

  // Add quick actions menu
  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';
  quickActions.innerHTML = `
    <button class="quick-action" data-action="whitelist">
      <i class="fas fa-shield"></i>
      Whitelist Site
    </button>
    <button class="quick-action" data-action="report">
      <i class="fas fa-flag"></i>
      Report Issue
    </button>
    <button class="quick-action" data-action="share">
      <i class="fas fa-share"></i>
      Share Stats
    </button>
  `;

  document.querySelector('.actions').appendChild(quickActions);

  // Handle quick actions
  quickActions.addEventListener('click', (e) => {
    const action = e.target.closest('.quick-action')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'whitelist':
        handleWhitelist();
        break;
      case 'report':
        handleReport();
        break;
      case 'share':
        handleShare();
        break;
    }
  });

  // Initialize features
  updateAdvancedStats();
  setInterval(updateAdvancedStats, 30000); // Update every 30 seconds

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          scanPageBtn.click();
          break;
        case 'r':
          e.preventDefault();
          viewReportBtn.click();
          break;
        case ',':
          e.preventDefault();
          optionsBtn.click();
          break;
      }
    }
  });
});