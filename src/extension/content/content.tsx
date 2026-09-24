import React from 'react';
import { createRoot } from 'react-dom/client';
import { CctvProvider } from '../../context/CctvContext';
import { MapOverlayCanvas } from './MapOverlayCanvas';
import { FloatingBar } from './FloatingBar';
import './content.css';

function initCctvExtension() {
  if (document.getElementById('cctv-extension-root')) {
    return;
  }

  if (!document.body) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCctvExtension);
    } else {
      setTimeout(initCctvExtension, 100);
    }
    return;
  }

  const container = document.createElement('div');
  container.id = 'cctv-extension-root';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CctvProvider>
        <MapOverlayCanvas />
        <FloatingBar />
      </CctvProvider>
    </React.StrictMode>
  );

  console.log('🎥 CCTV GeoPlanner extension active on:', window.location.href);

  // Listen for extension commands from popup or background
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'PING') {
        sendResponse({ status: 'OK', version: '1.0.0' });
      } else if (message.type === 'TOGGLE_OVERLAY') {
        window.dispatchEvent(new CustomEvent('cctv-toggle-overlay'));
        sendResponse({ status: 'TOGGLED' });
      }
      return true;
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCctvExtension);
} else {
  initCctvExtension();
}

