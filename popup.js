
const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const devModeToggle = document.getElementById('dev-mode-toggle');
const devModeText = document.getElementById('dev-mode-text');
const devModeActions = document.getElementById('dev-mode-actions');
const exportRulesBtn = document.getElementById('export-rules-btn');
const clearRulesBtn = document.getElementById('clear-rules-btn');


chrome.storage.sync.get({ enabled: true, devMode: false }, (data) => {
  toggle.checked = data.enabled;
  devModeToggle.checked = data.devMode;
  updateStatusText(data.enabled);
  updateDevModeText(data.devMode);
  populateRulesList();
});

function populateRulesList() {
  const rulesList = document.getElementById('active-rules-list');
  if (!rulesList) return;

  const SITE_INFO = [
    { host: "youtube.com", name: "YouTube", desc: "Shorts, Reels, Recommendations, Ads" },
    { host: "reddit.com", name: "Reddit", desc: "Recommended posts, Ads, Resources" },
    { host: "x.com", name: "X (Twitter)", desc: "Trending, Who to follow, Grok, Ads" },
    { host: "instagram.com", name: "Instagram", desc: "Reels, Explore, Suggested" },
    { host: "facebook.com", name: "Facebook", desc: "Stories, Marketplace, Watch, Ads" },
    { host: "linkedin.com", name: "LinkedIn", desc: "News, Ads, Premium upsells" },
    { host: "twitch.tv", name: "Twitch", desc: "Recommended channels" },
    { host: "tiktok.com", name: "TikTok", desc: "For You, Explore, Suggested" },
    { host: "threads.net", name: "Threads", desc: "Explore, Suggested" },
    { host: "pinterest.com", name: "Pinterest", desc: "Feed, Related pins" },
    { host: "github.com", name: "GitHub", desc: "Explore, Trending, Feed" },
    { host: "discord.com", name: "Discord", desc: "Discovery, Shop" },
    { host: "quora.com", name: "Quora", desc: "Promoted content" }
  ];

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || "";
    
    rulesList.innerHTML = ''; 
  
    SITE_INFO.forEach(site => {
      const isCurrentSite = currentUrl.includes(site.host);
      
      const ruleItem = document.createElement('div');
      ruleItem.className = `rule-item ${isCurrentSite ? 'active-site' : ''}`;
      
      ruleItem.innerHTML = `
        <i class="material-icons rule-icon">${isCurrentSite ? 'check_circle' : 'block'}</i>
        <div class="rule-info">
          <span class="rule-site">${site.name} ${isCurrentSite ? '(Active)' : ''}</span>
          <span class="rule-desc">${site.desc}</span>
        </div>
      `;
      
      if (isCurrentSite) {
        rulesList.prepend(ruleItem);
      } else {
        rulesList.appendChild(ruleItem);
      }
    });
  });
}


toggle.addEventListener('change', () => {
  const isEnabled = toggle.checked;
  chrome.storage.sync.set({ enabled: isEnabled });
  
  updateStatusText(isEnabled);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
});

function updateStatusText(enabled) {
  statusText.textContent = enabled ? 'Blocking enabled' : 'Blocking disabled';
  statusText.style.color = enabled ? 'var(--md-sys-color-on-surface-variant)' : 'rgba(0, 0, 0, 0.38)';
}


devModeToggle.addEventListener('change', () => {
  const isDevMode = devModeToggle.checked;
  chrome.storage.sync.set({ devMode: isDevMode });
  
  updateDevModeText(isDevMode);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'toggleDevMode', 
        enabled: isDevMode 
      });
    }
  });
});

function updateDevModeText(enabled) {
  devModeText.textContent = enabled ? 'Click elements to hide them' : 'Select elements to hide';
  devModeText.style.color = enabled ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)';
  

  devModeActions.style.display = enabled ? 'flex' : 'none';
}



const settingsTrigger = document.getElementById('settings-trigger');
const settingsContent = document.getElementById('settings-content');


chrome.storage.sync.get({ settingsExpanded: false }, (data) => {
  if (data.settingsExpanded) {
    expandSettings();
  }
});


settingsTrigger.addEventListener('click', () => {
  const isExpanded = settingsContent.classList.contains('expanded');
  
  if (isExpanded) {
    collapseSettings();
  } else {
    expandSettings();
  }
  

  chrome.storage.sync.set({ settingsExpanded: !isExpanded });
});

function expandSettings() {
  settingsTrigger.classList.add('expanded');
  settingsContent.classList.add('expanded');
}

function collapseSettings() {
  settingsTrigger.classList.remove('expanded');
  settingsContent.classList.remove('expanded');
}




chrome.storage.sync.get({ theme: 'purple' }, (data) => {
  applyTheme(data.theme);
  updateActiveThemeCard(data.theme);
});


const themeCards = document.querySelectorAll('.theme-card');
themeCards.forEach(card => {
  card.addEventListener('click', () => {
    const theme = card.dataset.theme;
    applyTheme(theme);
    updateActiveThemeCard(theme);
    

    chrome.storage.sync.set({ theme: theme });
  });
});

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}

function updateActiveThemeCard(theme) {
  themeCards.forEach(card => {
    if (card.dataset.theme === theme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

exportRulesBtn.addEventListener('click', () => {
  
  chrome.storage.local.get({ elementFingerprints: [] }, (data) => {
    if (data.elementFingerprints.length === 0) {
      alert('No fingerprints to export. Hide some elements using dev mode first!');
      return;
    }
    
  
    const codeOutput = generateContentJSCode(data.elementFingerprints);
    
  
    const blob = new Blob([codeOutput], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    
  
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cortex-fingerprint-rules.js';
    a.click();
    
    URL.revokeObjectURL(url);
  });
});

clearRulesBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all fingerprints?')) {
    chrome.storage.local.set({ elementFingerprints: [] }, () => {
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'clearCustomRules' 
          });
        }
      });
      
      alert('All fingerprints cleared!');
    });
  }
});

function generateContentJSCode(fingerprints) {
  
  const siteGroups = {};
  fingerprints.forEach(fp => {
    if (!siteGroups[fp.site]) {
      siteGroups[fp.site] = [];
    }
    siteGroups[fp.site].push(fp);
  });
  
  
  let code = `// ============================================
// CORTEX DEV MODE - AUTO GENERATED RULES
// ============================================
// Copy this code to your content.js file or use as reference
// Generated on: ${new Date().toLocaleString()}

// Method 1: Add to BLOCK_RULES array (simple selectors)
const ADDITIONAL_BLOCK_RULES = [
`;

  // Generate simple selector rules
  Object.entries(siteGroups).forEach(([site, fps]) => {
    code += `  {\n    site: "${site}",\n    elements: [\n`;
    
    fps.forEach(fp => {
      const bestSelector = fp.selectors && fp.selectors.length > 0 ? fp.selectors[0] : fp.tagName;
      code += `      "${bestSelector.replace(/"/g, '\\"')}", // ${fp.preview}\n`;
    });
    
    code += `    ]\n  },\n`;
  });
  
  code += `];

// Method 2: Fingerprint-based hiding (recommended for complex elements)
const ELEMENT_FINGERPRINTS = ${JSON.stringify(fingerprints, null, 2)};

// Method 3: Integration functions
function applyFingerprintRules() {
  const currentSite = getCurrentHost();
  const relevantFingerprints = ELEMENT_FINGERPRINTS.filter(fp => 
    fp.site === currentSite || 
    currentSite.endsWith(fp.site) || 
    fp.site.endsWith(currentSite)
  );
  
  relevantFingerprints.forEach(fingerprint => {
    setTimeout(() => hideElementByFingerprint(fingerprint), 100);
  });
}

// Call this in your content script initialization:
// setTimeout(() => applyFingerprintRules(), 1000);

// ============================================
// USAGE INSTRUCTIONS:
// ============================================
/*
1. SIMPLE METHOD:
   - Copy the ADDITIONAL_BLOCK_RULES array
   - Merge with your existing BLOCK_RULES array
   - This works for basic CSS selectors

2. ADVANCED METHOD (Recommended):
   - Copy the ELEMENT_FINGERPRINTS array and functions
   - This handles dynamic content and layout changes
   - More reliable across website updates

3. HYBRID METHOD:
   - Use both methods for maximum coverage
   - Simple rules for stable elements
   - Fingerprints for complex/dynamic elements

Generated ${fingerprints.length} fingerprint(s) for ${Object.keys(siteGroups).length} site(s).
*/`;

  return code;
}

