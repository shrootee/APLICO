/**
 * Aplico Chrome Extension - Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Aplico Extension] Installed successfully:', details.reason);
});

// Listener for background actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING') {
    sendResponse({ status: 'PONG' });
    return true;
  }

  if (message.action === 'OPEN_URL') {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
    return true;
  }
});
