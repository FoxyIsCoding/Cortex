const BLOCK_RULES = [
  {
    site: "youtube.com",
    elements: [
      "ytd-shorts-shelf-renderer",
      "ytd-reel-shelf-renderer",
      "ytd-rich-shelf-renderer[is-shorts]",
      "ytd-guide-entry-renderer[aria-label='Shorts']",
      "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
      "ytd-ad-slot-renderer",
      "ytd-promoted-sparkles-web-renderer"
    ]
  },
  {
    site: "threads.net",
    elements: [
      "a[href='/explore/']",
      "div:has(> svg[aria-label='Explore'])"
    ]
  },
  {
    site: "reddit.com",
    elements: [
      "[data-testid='recommended-bar']",
      "shreddit-ad-post",
      "games-section-badge-controller"
    ]
  },
  {
    site: "x.com",
    elements: [
      "[data-testid='sidebarColumn']",
      "[aria-label='Trending']",
      "[aria-label='Who to follow']",
      "[aria-label='Grok']"
    ]
  },
  {
    site: "instagram.com",
    elements: [
      "a[href='/reels/']",
      "a[href='/explore/']"
    ]
  },
  {
    site: "facebook.com",
    elements: [
      "div[aria-label='Stories']",
      "a[href*='/marketplace/']",
      "a[href*='/watch/']",
      "div[data-pagelet='RightRail']"
    ]
  },
  {
    site: "linkedin.com",
    elements: [
      "#feed-news-module",
      "aside[aria-label='LinkedIn News']",
      ".ad-banner-container"
    ]
  },
  {
    site: "twitch.tv",
    elements: [
      "div[aria-label='Recommended Channels']",
      "div[aria-label='Viewers Also Watch']"
    ]
  },
  {
    site: "tiktok.com",
    elements: [
      "a[href='/explore']",
      "[data-e2e='suggest-accounts-container']"
    ]
  },
  {
    site: "pinterest.com",
    elements: [
      "div[data-test-id='video-pin-card']",
      "div[data-test-id='story-pin-card']"
    ]
  },
  {
    site: "github.com",
    elements: [
      "aside[aria-label='Explore']",
      ".js-trending-repositories"
    ]
  },
  {
    site: "discord.com",
    elements: [
      "a[href='/discovery']",
      "a[href='/shop']"
    ]
  },
  {
    site: "quora.com",
    elements: [
      ".q-box.qu-mb--medium:has([aria-label='Promoted'])",
      ".q-box.qu-mb--medium:has([aria-label='Sponsored'])"
    ]
  }
];

let isEnabled = true;
let isDevMode = false;
let hoveredElement = null;
let devModeStyles = null;

// load state of the toggle thingy
chrome.storage.sync.get({ enabled: true, devMode: false }, (data) => {
  isEnabled = data.enabled;
  isDevMode = data.devMode;
  if (isEnabled) {
    applyBlocking();
    blockYouTubeShorts();
  }
  if (isDevMode) {
    enableDevMode();
  }
});

// state changes :3
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (isEnabled) {
      applyBlocking();
      blockYouTubeShorts();
    } else {
      removeBlocking();
      unblockYouTubeShorts();
    }
  }
  if (changes.devMode) {
    isDevMode = changes.devMode.newValue;
    if (isDevMode) {
      enableDevMode();
    } else {
      disableDevMode();
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'toggleDevMode') {
    isDevMode = message.enabled;
    if (isDevMode) {
      enableDevMode();
    } else {
      disableDevMode();
    }
  } else if (message.type === 'clearCustomRules') {
    clearAllFingerprints();
    clearCustomRules();
  }
});

function getCurrentHost() {
  return location.hostname.replace(/^www\./, "");
}

function buildBlockCSS() {
  const host = getCurrentHost();
  
  const matchingRule = BLOCK_RULES.find(rule => {
    const siteDomain = rule.site.replace(/^www\./, "");
    return host === siteDomain || host.endsWith("." + siteDomain);
  });

  let css = "";
  if (matchingRule) {
    css = matchingRule.elements
      .map(selector => `${selector} { display: none !important; }`)
      .join("\n");
  }

  // Layout fixes to prevent "really small" content
  if (host.includes("x.com")) {
    css += `
      [data-testid="primaryColumn"] { width: 100% !important; max-width: 800px !important; margin: 0 auto !important; }
      header[role="banner"] { margin-right: 0 !important; }
    `;
  } else if (host.includes("linkedin.com")) {
    css += `
      .scaffold-layout__main { grid-column: 1 / span 3 !important; }
      .scaffold-layout__aside { display: none !important; }
    `;
  }

  return css;
}

function applyBlocking() {
  let styleEl = document.getElementById("cortex-blocker");
  
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "cortex-blocker";
    (document.head || document.documentElement).appendChild(styleEl);
  }
  
  styleEl.textContent = buildBlockCSS();
}

function removeBlocking() {
  const styleEl = document.getElementById("cortex-blocker");
  if (styleEl) {
    styleEl.remove();
  }
}

function unblockYouTubeShorts() {
  // remove all hid attributes 
  const hiddenElements = document.querySelectorAll('[data-cortex-shorts-hidden]');
  hiddenElements.forEach(el => {
    el.style.removeProperty('display');
    el.removeAttribute('data-cortex-shorts-hidden');
  });
}

// yt shorts block
function blockYouTubeShorts() {
  if (!isEnabled) return;
  
  const host = getCurrentHost();
  if (!host.includes("youtube.com")) return;
  
  let dynamicObserver = null;
  
  const checkAndBlockShorts = () => {
    // short block 
    const guideEntries = document.querySelectorAll('ytd-guide-entry-renderer');
    guideEntries.forEach(entry => {
      const titleEl = entry.querySelector('yt-formatted-string.title');
      if (titleEl && titleEl.textContent.trim() === 'Shorts') {
        if (!entry.hasAttribute('data-cortex-shorts-hidden')) {
          entry.style.setProperty('display', 'none', 'important');
          entry.setAttribute('data-cortex-shorts-hidden', 'true');
          const style = 'background-color: darkblue; color: white;'
          console.log("%c [Cortex] YT shorts blocked :3", style);
        }
      }
    });
    
    // minibar block
    const miniGuideEntries = document.querySelectorAll('ytd-mini-guide-entry-renderer');
    miniGuideEntries.forEach(entry => {
      const link = entry.querySelector('a[title="Shorts"], a[aria-label="Shorts"]');
      if (link) {
        if (!entry.hasAttribute('data-cortex-shorts-hidden')) {
          entry.style.setProperty('display', 'none', 'important');
          entry.setAttribute('data-cortex-shorts-hidden', 'true');
          const style = 'background-color: darkblue; color: white;'
          console.log("%c [Cortex] YT shorts blocked :3", style);
        }
      }
    });
    
    // block more yt ads like the YT subbrands shi
    const guideSections = document.querySelectorAll('ytd-guide-section-renderer');
    guideSections.forEach(section => {
      const sectionTitle = section.querySelector('#guide-section-title');
      if (sectionTitle && sectionTitle.textContent.trim() === 'More from YouTube') {
        if (!section.hasAttribute('data-cortex-more-hidden')) {
          section.style.setProperty('display', 'none', 'important');
          section.setAttribute('data-cortex-more-hidden', 'true');
          const style = 'background-color: darkblue; color: white;'
          console.log("%c [Cortex] YT ads blocked :3", style);
        }
      }
    });
  };
  

  checkAndBlockShorts();
  

  setTimeout(checkAndBlockShorts, 500);
  setTimeout(checkAndBlockShorts, 1500);
  

  if (dynamicObserver) dynamicObserver.disconnect();
  
  let timeout;
  dynamicObserver = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(checkAndBlockShorts, 100);
  });
  
  dynamicObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

const observer = new MutationObserver(() => {
  if (isEnabled && !document.getElementById("cortex-blocker")) {
    applyBlocking();
  }
});

observer.observe(document.documentElement, { 
  childList: true, 
  subtree: false 
});

// ============================================
// DEV MODE FUNCTIONALITY (FINGERPRINT-BASED)
// ============================================

function enableDevMode() {
  if (devModeStyles) return; // Already enabled
  
  // Add dev mode styles
  devModeStyles = document.createElement('style');
  devModeStyles.id = 'cortex-dev-mode-styles';
  devModeStyles.textContent = `
    .cortex-hover-highlight {
      outline: 3px solid #ff4444 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
      position: relative !important;
    }
    
    .cortex-hover-highlight::before {
      content: "Click to hide: " attr(data-cortex-preview) !important;
      position: absolute !important;
      top: -30px !important;
      left: 0 !important;
      background: #ff4444 !important;
      color: white !important;
      padding: 4px 8px !important;
      font-size: 11px !important;
      font-family: monospace !important;
      border-radius: 4px !important;
      z-index: 999999 !important;
      white-space: nowrap !important;
      max-width: 400px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
    }
    
    .cortex-fingerprinted-element {
      outline: 2px solid #00aa00 !important;
      outline-offset: 1px !important;
      background-color: rgba(0, 170, 0, 0.05) !important;
    }
    
    .cortex-dev-notification {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #333 !important;
      color: white !important;
      padding: 12px 16px !important;
      border-radius: 6px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      animation: cortexSlideIn 0.3s ease-out !important;
      max-width: 300px !important;
      word-wrap: break-word !important;
    }
    
    @keyframes cortexSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  (document.head || document.documentElement).appendChild(devModeStyles);
  
  // Add event listeners
  document.addEventListener('mouseover', handleDevModeHover, true);
  document.addEventListener('mouseout', handleDevModeUnhover, true);
  document.addEventListener('click', handleDevModeClick, true);
  
  // Load and apply existing fingerprints
  loadAndApplyFingerprints();
  
  // Show notification
  showDevModeNotification('Dev Mode Enabled - Click elements to hide them');
  
  const style = 'background-color: #ff4444; color: white;'
  console.log("%c [Cortex] Dev mode enabled (fingerprint-based)", style);
}

function disableDevMode() {
  if (!devModeStyles) return; // Already disabled
  
  // Remove styles
  devModeStyles.remove();
  devModeStyles = null;
  
  // Remove event listeners
  document.removeEventListener('mouseover', handleDevModeHover, true);
  document.removeEventListener('mouseout', handleDevModeUnhover, true);
  document.removeEventListener('click', handleDevModeClick, true);
  
  // Clear any remaining highlights
  clearDevModeHighlights();
  
  // Show notification
  showDevModeNotification('Dev Mode Disabled');
  
  const style = 'background-color: #333; color: white;'
  console.log("%c [Cortex] Dev mode disabled", style);
}

function handleDevModeHover(event) {
  if (!isDevMode) return;
  
  const element = event.target;
  
  // Skip if already processed or is our own UI
  if (element.classList.contains('cortex-dev-notification') || 
      element.closest('.cortex-dev-notification')) {
    return;
  }
  
  hoveredElement = element;
  element.classList.add('cortex-hover-highlight');
  
  // Generate preview text
  const preview = generateElementPreview(element);
  element.setAttribute('data-cortex-preview', preview);
}

function handleDevModeUnhover(event) {
  if (!isDevMode) return;
  
  const element = event.target;
  element.classList.remove('cortex-hover-highlight');
  element.removeAttribute('data-cortex-preview');
}

function handleDevModeClick(event) {
  if (!isDevMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const element = event.target;
  
  // Skip if clicking our own UI
  if (element.classList.contains('cortex-dev-notification') || 
      element.closest('.cortex-dev-notification')) {
    return;
  }
  
  // Create element fingerprint
  const fingerprint = createElementFingerprint(element);
  
  // Hide the element immediately
  hideElementByFingerprint(fingerprint);
  
  // Save fingerprint to storage
  saveFingerprint(fingerprint);
  
  // Show notification
  showDevModeNotification(`Hidden: ${fingerprint.preview}`);
  
  const style = 'background-color: #00aa00; color: white;'
  console.log(`%c [Cortex] Fingerprinted element: ${fingerprint.preview}`, style);
}

function createElementFingerprint(element) {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  // Create comprehensive fingerprint
  const fingerprint = {
    // Basic identification
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    className: element.className || null,
    
    // Content-based identification
    textContent: element.textContent ? element.textContent.trim().substring(0, 100) : null,
    innerHTML: element.innerHTML ? element.innerHTML.substring(0, 200) : null,
    
    // Attribute-based identification
    attributes: {},
    
    // Position-based identification (relative)
    parentTagName: element.parentElement ? element.parentElement.tagName.toLowerCase() : null,
    siblingIndex: Array.from(element.parentElement?.children || []).indexOf(element),
    
    // Style-based identification
    display: computedStyle.display,
    position: computedStyle.position,
    
    // Hierarchy path (for deep matching)
    path: generateElementPath(element),
    
    // Multiple selector strategies
    selectors: generateMultipleSelectors(element),
    
    // Site information
    site: getCurrentHost(),
    
    // Timestamp and preview
    timestamp: Date.now(),
    preview: generateElementPreview(element)
  };
  
  // Collect important attributes
  ['data-testid', 'aria-label', 'role', 'title', 'alt', 'href', 'src'].forEach(attr => {
    if (element.hasAttribute(attr)) {
      fingerprint.attributes[attr] = element.getAttribute(attr);
    }
  });
  
  return fingerprint;
}

function generateElementPath(element) {
  const path = [];
  let current = element;
  
  while (current && current !== document.body && path.length < 10) {
    const tag = current.tagName.toLowerCase();
    const index = Array.from(current.parentElement?.children || [])
      .filter(child => child.tagName.toLowerCase() === tag)
      .indexOf(current);
    
    path.unshift(`${tag}:${index}`);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

function generateMultipleSelectors(element) {
  const selectors = [];
  
  // ID selector
  if (element.id) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }
  
  // Class selectors
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(Boolean);
    classes.forEach(cls => {
      selectors.push(`.${CSS.escape(cls)}`);
    });
    if (classes.length > 1) {
      selectors.push(classes.map(cls => `.${CSS.escape(cls)}`).join(''));
    }
  }
  
  // Attribute selectors
  Object.keys(element.dataset).forEach(key => {
    selectors.push(`[data-${key}="${CSS.escape(element.dataset[key])}"]`);
  });
  
  ['aria-label', 'role', 'title'].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr))}"]`);
    }
  });
  
  // Tag + attribute combinations
  if (element.className) {
    const firstClass = element.className.trim().split(/\s+/)[0];
    if (firstClass) {
      selectors.push(`${element.tagName.toLowerCase()}.${CSS.escape(firstClass)}`);
    }
  }
  
  // Parent-child relationships
  if (element.parentElement && element.parentElement.className) {
    const parentClass = element.parentElement.className.trim().split(/\s+/)[0];
    if (parentClass) {
      selectors.push(`.${CSS.escape(parentClass)} > ${element.tagName.toLowerCase()}`);
    }
  }
  
  return [...new Set(selectors)]; // Remove duplicates
}

function generateElementPreview(element) {
  if (element.textContent && element.textContent.trim()) {
    return element.textContent.trim().substring(0, 30);
  }
  
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').substring(0, 30);
  }
  
  if (element.getAttribute('title')) {
    return element.getAttribute('title').substring(0, 30);
  }
  
  if (element.tagName.toLowerCase() === 'img' && element.alt) {
    return `IMG: ${element.alt.substring(0, 25)}`;
  }
  
  if (element.className) {
    const firstClass = element.className.trim().split(/\s+/)[0];
    return `${element.tagName}.${firstClass}`;
  }
  
  return element.tagName.toLowerCase();
}

function saveFingerprint(fingerprint) {
  chrome.storage.local.get({ elementFingerprints: [] }, (data) => {
    const fingerprints = data.elementFingerprints;
    
    // Avoid duplicates by checking if similar fingerprint exists
    const exists = fingerprints.some(fp => 
      fp.site === fingerprint.site &&
      fp.path === fingerprint.path &&
      fp.textContent === fingerprint.textContent
    );
    
    if (!exists) {
      fingerprints.push(fingerprint);
      chrome.storage.local.set({ elementFingerprints: fingerprints });
    }
  });
}

function loadAndApplyFingerprints() {
  chrome.storage.local.get({ elementFingerprints: [] }, (data) => {
    const currentSite = getCurrentHost();
    const relevantFingerprints = data.elementFingerprints.filter(fp => 
      fp.site === currentSite || 
      currentSite.endsWith(fp.site) || 
      fp.site.endsWith(currentSite)
    );
    
    relevantFingerprints.forEach(fingerprint => {
      setTimeout(() => hideElementByFingerprint(fingerprint), 100);
    });
    
    if (relevantFingerprints.length > 0) {
      const style = 'background-color: #2196f3; color: white;'
      console.log(`%c [Cortex] Applied ${relevantFingerprints.length} fingerprint(s)`, style);
    }
  });
}

function hideElementByFingerprint(fingerprint) {
  let targetElement = null;
  
  // Strategy 1: Try selectors in order of specificity
  for (const selector of fingerprint.selectors || []) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 1) {
        targetElement = elements[0];
        break;
      } else if (elements.length > 1) {
        // Multiple matches, try to narrow down using other criteria
        for (const el of elements) {
          if (matchesFingerprint(el, fingerprint)) {
            targetElement = el;
            break;
          }
        }
        if (targetElement) break;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // Strategy 2: Search by content and attributes
  if (!targetElement && fingerprint.textContent) {
    const elements = document.querySelectorAll(fingerprint.tagName || '*');
    for (const el of elements) {
      if (el.textContent && el.textContent.trim().includes(fingerprint.textContent.substring(0, 20))) {
        if (matchesFingerprint(el, fingerprint)) {
          targetElement = el;
          break;
        }
      }
    }
  }
  
  // Strategy 3: Search by attributes
  if (!targetElement) {
    Object.entries(fingerprint.attributes || {}).forEach(([attr, value]) => {
      if (!targetElement) {
        const elements = document.querySelectorAll(`[${attr}="${CSS.escape(value)}"]`);
        for (const el of elements) {
          if (matchesFingerprint(el, fingerprint)) {
            targetElement = el;
            break;
          }
        }
      }
    });
  }
  
  if (targetElement) {
    targetElement.style.setProperty('display', 'none', 'important');
    targetElement.classList.add('cortex-fingerprinted-element');
    targetElement.setAttribute('data-cortex-hidden', 'fingerprint');
  }
}

function matchesFingerprint(element, fingerprint) {
  let score = 0;
  
  // Tag match
  if (element.tagName.toLowerCase() === fingerprint.tagName) score += 2;
  
  // Text content match
  if (fingerprint.textContent && element.textContent && 
      element.textContent.trim().includes(fingerprint.textContent.substring(0, 20))) {
    score += 3;
  }
  
  // Attribute matches
  Object.entries(fingerprint.attributes || {}).forEach(([attr, value]) => {
    if (element.getAttribute(attr) === value) score += 2;
  });
  
  // Class match
  if (fingerprint.className && element.className === fingerprint.className) score += 2;
  
  // ID match
  if (fingerprint.id && element.id === fingerprint.id) score += 5;
  
  // Position match (sibling index)
  if (fingerprint.siblingIndex !== undefined) {
    const currentIndex = Array.from(element.parentElement?.children || []).indexOf(element);
    if (currentIndex === fingerprint.siblingIndex) score += 1;
  }
  
  return score >= 3; // Minimum confidence threshold
}

function clearAllFingerprints() {
  chrome.storage.local.set({ elementFingerprints: [] }, () => {
    // Remove all hidden elements
    const hiddenElements = document.querySelectorAll('[data-cortex-hidden="fingerprint"]');
    hiddenElements.forEach(el => {
      el.style.removeProperty('display');
      el.classList.remove('cortex-fingerprinted-element');
      el.removeAttribute('data-cortex-hidden');
    });
    
    showDevModeNotification('All fingerprints cleared');
    
    const style = 'background-color: #ff9800; color: white;'
    console.log("%c [Cortex] All fingerprints cleared", style);
  });
}

function clearDevModeHighlights() {
  // Remove all dev mode classes
  const highlighted = document.querySelectorAll('.cortex-hover-highlight, .cortex-fingerprinted-element');
  highlighted.forEach(el => {
    el.classList.remove('cortex-hover-highlight', 'cortex-fingerprinted-element');
    el.removeAttribute('data-cortex-preview');
  });
}

function showDevModeNotification(message) {
  // Remove existing notification
  const existing = document.querySelector('.cortex-dev-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create new notification
  const notification = document.createElement('div');
  notification.className = 'cortex-dev-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

function clearCustomRules() {
  chrome.storage.local.remove(['customSelectors'], () => {
    // Reapply blocking with a small delay
    setTimeout(() => {
      if (isEnabled) {
        applyBlocking();
      }
    }, 100);
    
    showDevModeNotification('Custom rules cleared');
    const style = 'background-color: #ff9800; color: white;'
    console.log("%c [Cortex] Custom rules cleared", style);
  });
}

// Initialize fingerprint system on page load
setTimeout(() => {
  if (isEnabled) {
    loadAndApplyFingerprints();
  }
}, 1000);
