// random ahh script that runns on start of the browser after installed :3

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ enabled: true }, (data) => {
    if (data.enabled === undefined) {
      chrome.storage.sync.set({ enabled: true });
    }
  });
  
  const style = 'background-color: darkblue; color: white;'
  console.log("%c Cortex installed :P", style);
});