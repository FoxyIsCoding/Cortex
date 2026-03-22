

const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');


chrome.storage.sync.get({ enabled: true }, (data) => {
  toggle.checked = data.enabled;
  updateStatusText(data.enabled);
});


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
  statusText.style.color = enabled ? 'var(--text-secondary)' : 'rgba(0, 0, 0, 0.38)';
}