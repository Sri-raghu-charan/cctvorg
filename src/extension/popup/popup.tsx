import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera } from '../../types/camera';
import { storage } from '../../services/storage';
import { Video, ExternalLink, Globe2, Map, ShieldCheck, Download } from 'lucide-react';
import './popup.css';

const PopupApp: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    storage.get<Camera[]>('cctv_saved_cameras', []).then((cams) => {
      setCameras(cams);
    });
  }, []);

  const openUrl = (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const exportJson = () => {
    const data = {
      project: 'CCTV Coverage Plan',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      cameras
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cctv_plan_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <div className="popup-title">
          <Video size={18} style={{ color: '#38bdf8' }} />
          <span>CCTV GeoPlanner</span>
        </div>
        <span
          style={{
            fontSize: '10px',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700
          }}
        >
          v1.0.0
        </span>
      </div>

      {/* Status Card */}
      <div className="popup-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Saved Cameras:</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
            {cameras.length} Active
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Geodesic Engine:</span>
          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> WGS84 Geodesics
          </span>
        </div>
      </div>

      {/* Target Platforms */}
      <div className="popup-actions">
        <button
          type="button"
          className="btn btn-primary"
          style={{ justifyContent: 'center', fontSize: '12px' }}
          onClick={() => openUrl('https://earth.google.com/web/')}
        >
          <Globe2 size={14} /> Open in Google Earth
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ justifyContent: 'center', fontSize: '12px' }}
          onClick={() => openUrl('https://www.google.com/maps')}
        >
          <Map size={14} /> Open in Google Maps
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ justifyContent: 'center', fontSize: '12px' }}
          onClick={exportJson}
        >
          <Download size={14} /> Export Cameras JSON
        </button>
      </div>

      <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '2px' }}>
        Non-interfering 3D overlay for Google Earth & Maps.
      </div>
    </div>
  );
};

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  createRoot(rootEl).render(<PopupApp />);
}
