import React, { useState } from 'react';
import { useCctv } from '../../context/CctvContext';
import { X, Key, Globe, Shield, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { cesiumIonToken, setCesiumIonToken } = useCctv();
  const [tokenInput, setTokenInput] = useState<string>(cesiumIonToken);

  if (!isOpen) return null;

  const handleSave = () => {
    setCesiumIonToken(tokenInput.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Geospatial Configuration & Settings</div>
          <button className="btn btn-secondary btn-icon-only" aria-label="Close settings modal" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="card-section">
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} /> Optional Cesium Ion Token
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              The application works out-of-the-box using high-resolution <strong>Esri World Satellite Imagery</strong> and <strong>OpenStreetMap</strong> with zero API key required. If you have an official Cesium Ion account and want to enable Cesium World Terrain and 3D Photorealistic Tiles, paste your token below:
            </p>
            <input
              type="text"
              id="cesium-token-input"
              aria-label="Optional Cesium Ion Access Token"
              className="input-text"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>

          <div className="card-section">
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> Geographic & Standards Compliance
              </span>
            </div>
            <ul style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '16px', lineHeight: 1.6 }}>
              <li><strong>Ellipsoid:</strong> WGS84 Geodetic Reference Frame</li>
              <li><strong>Security Standard:</strong> IEC / EN 62676-4 Video Surveillance Systems (DORI)</li>
              <li><strong>Ground Footprint:</strong> Perspective 3D Frustum Ground Plane Ray-Casting</li>
              <li><strong>Navigation Invariance:</strong> Physical ground coordinates strictly independent of viewport zoom</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} type="button">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
