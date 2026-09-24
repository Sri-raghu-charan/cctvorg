/**
 * Manifest V3 Background Service Worker for CCTV GeoPlanner
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('CCTV GeoPlanner Extension installed/reloaded:', details.reason);
  try {
    const tabs = await chrome.tabs.query({
      url: [
        '*://earth.google.com/*',
        '*://*.google.com/earth/*',
        '*://google.com/earth/*',
        '*://*.google.com/maps/*',
        '*://maps.google.com/*',
        '*://google.com/maps/*'
      ]
    });
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content/content.css']
          });
        } catch {
          // Tab might be in restricted state or already injected
        }
      }
    }
  } catch (err) {
    console.debug('Tab auto-injection skipped:', err);
  }
});

// Handle clicks on extension icon in browser toolbar
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const url = tab.url || '';
  const isEarthOrMaps = url.includes('earth.google.com') || url.includes('google.com/maps');

  if (isEarthOrMaps) {
    // Ping content script or toggle overlay
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
    } catch {
      // Content script may not have loaded yet, inject or reload
    }
  } else {
    // Open Google Earth in a new tab if user is not on a supported map
    chrome.tabs.create({ url: 'https://earth.google.com/web/' });
  }
});
