const BLOCK_RULES = [
  {
    site: "youtube.com",
    elements: [
      // shorts
      "ytd-shorts-shelf-renderer",
      "ytd-reel-shelf-renderer", 
      "ytd-rich-shelf-renderer",
    ]
  },
  {
    site: "reddit.com",
    elements: [
      "[data-testid='recommended-bar']",
      "shreddit-ad-post"
    ]
  },
  {
    site: "x.com",
    elements: [
      "[data-testid='sidebarColumn']",
      "[aria-label='Trending']"
    ]
  }
];

let isEnabled = true;

// load state of the toggle thingy
chrome.storage.sync.get({ enabled: true }, (data) => {
  isEnabled = data.enabled;
  if (isEnabled) {
    applyBlocking();
    blockYouTubeShorts();
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

  if (!matchingRule) return "";

  return matchingRule.elements
    .map(selector => `${selector} { display: none !important; }`)
    .join("\n");
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
          console.log('[Cortex] Blocked Shorts in sidebar');
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
          console.log('[Cortex] Blocked Shorts in mini sidebar');
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
          console.log('[Cortex] Blocked "More from YouTube" section');
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
