import React, { useState } from 'react';
import { Camera } from '../../types/camera';
import { ExternalLink, X, Compass, MapPin } from 'lucide-react';

interface StreetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  camera: Camera | null;
  targetCoords?: { latitude: number; longitude: number };
}

export const StreetViewModal: React.FC<StreetViewModalProps> = ({
  isOpen,
  onClose,
  camera,
  targetCoords
}) => {
  if (!isOpen) return null;

  const lat = camera ? camera.position.latitude : targetCoords?.latitude || 40.7580;
  const lon = camera ? camera.position.longitude : targetCoords?.longitude || -73.9855;
  const heading = camera ? Math.round(camera.heading) : 0;
  const pitch = camera ? -Math.round(camera.tilt) : 0;

  // Google Maps Street View official URL
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}&heading=${heading}&pitch=${pitch}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '760px',
          maxWidth: '92vw',
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.2))',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--bg-panel, #1e293b)',
            borderBottom: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} style={{ color: '#38bdf8' }} />
            <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
              Street View & Real-World Site Inspection
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
            Inspect real-world ground surroundings, mounting structures, and physical sightline obstructions before finalizing CCTV camera placement.
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.1))',
              borderRadius: '8px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)'
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Latitude:</span>{' '}
              <span style={{ color: '#f8fafc' }}>{lat.toFixed(6)}°</span>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Longitude:</span>{' '}
              <span style={{ color: '#f8fafc' }}>{lon.toFixed(6)}°</span>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Bearing / Pitch:</span>{' '}
              <span style={{ color: '#f8fafc' }}>{heading}° / {pitch}°</span>
            </div>
          </div>

          {/* Launch Street View Panorama */}
          <div
            style={{
              height: '320px',
              borderRadius: '8px',
              border: '1px dashed var(--border-medium, rgba(148, 163, 184, 0.3))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'rgba(2, 6, 23, 0.6)'
            }}
          >
            <Compass size={36} style={{ color: '#38bdf8', opacity: 0.8 }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', textAlign: 'center' }}>
              Launch Google Street View at this Location
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '420px', textAlign: 'center' }}>
              Opens Google Maps 360° Street View at ({lat.toFixed(5)}°, {lon.toFixed(5)}°) oriented along the camera's azimuth ({heading}°).
            </div>
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0284c7',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '12px',
                marginTop: '6px'
              }}
            >
              Open Official Street View <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--bg-panel, #1e293b)',
            borderTop: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.1))',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
