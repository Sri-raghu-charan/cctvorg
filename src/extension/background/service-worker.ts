/**
 * Manifest V3 Background Service Worker for CCTV GeoPlanner
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('CCTV GeoPlanner Extension installed successfully.');
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
