import React, { useRef } from 'react';
import { useCctv } from '../../context/CctvContext';
import {
  Video,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Navigation,
  Download,
  Upload,
  CheckCircle2
} from 'lucide-react';

export const CameraList: React.FC = () => {
  const {
    cameras,
    activeCameraId,
    selectCamera,
    deleteCamera,
    duplicateCamera,
    toggleCameraVisibility,
    setIsPlacingCamera,
    setFlyToTarget,
    exportProjectJson,
    exportProjectGeoJson,
    importProjectJson
  } = useCctv();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadJson = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cctv_plan_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGeoJson = () => {
    const geojson = exportProjectGeoJson();
    const blob = new Blob([geojson], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cctv_plan_footprints_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importProjectJson(content);
        if (ok) {
          alert('Project imported successfully!');
        } else {
          alert('Failed to parse project JSON file.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => setIsPlacingCamera(true)}
          type="button"
        >
          <Plus size={16} />
          Place New Camera
        </button>
      </div>

      {/* Camera Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cameras.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}
          >
            No cameras placed yet. Click "Place New Camera" or click anywhere on the 3D globe to begin planning.
          </div>
        ) : (
          cameras.map((camera) => {
            const isSelected = camera.id === activeCameraId;
            return (
              <div
                key={camera.id}
                onClick={() => selectCamera(camera.id)}
                style={{
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-panel-card)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: camera.color,
                        boxShadow: `0 0 8px ${camera.color}`
                      }}
                    />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {camera.name}
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}
                    >
                      {camera.specs.formFactor}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '10px', color: 'var(--text-accent)', fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {camera.specs.modelName} • H: {camera.mountingHeight}m • Tilt: {Math.round(camera.tilt)}° • Azimuth: {Math.round(camera.heading)}°
                </div>

                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {camera.position.latitude.toFixed(6)}°, {camera.position.longitude.toFixed(6)}°
                </div>

                {/* Card Item Quick Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '6px',
                    marginTop: '2px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => setFlyToTarget(camera.position)}
                    title="Fly 3D view to camera"
                    aria-label={`Fly 3D view to camera ${camera.name}`}
                    type="button"
                  >
                    <Navigation size={13} />
                  </button>
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => toggleCameraVisibility(camera.id)}
                    title={camera.visible ? 'Hide coverage footprint' : 'Show coverage footprint'}
                    aria-label={camera.visible ? `Hide coverage footprint for ${camera.name}` : `Show coverage footprint for ${camera.name}`}
                    type="button"
                  >
                    {camera.visible ? <Eye size={13} /> : <EyeOff size={13} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => duplicateCamera(camera.id)}
                    title="Duplicate camera"
                    aria-label={`Duplicate camera ${camera.name}`}
                    type="button"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => deleteCamera(camera.id)}
                    title="Delete camera"
                    aria-label={`Delete camera ${camera.name}`}
                    style={{ color: 'var(--accent-danger)' }}
                    type="button"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Export & Import Tools */}
      <div className="card-section">
        <div className="card-title">
          <span>Project Data</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadJson}
            title="Export project configuration as JSON"
            aria-label="Export project configuration as JSON"
            type="button"
          >
            <Download size={13} />
            Export JSON
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadGeoJson}
            title="Export camera footprints as GIS GeoJSON layer"
            aria-label="Export camera footprints as GIS GeoJSON layer"
            type="button"
          >
            <Download size={13} />
            GeoJSON
          </button>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import Planning Project JSON or GeoJSON file"
          type="button"
        >
          <Upload size={13} />
          Import Planning Project
        </button>
        <input
          type="file"
          ref={fileInputRef}
          aria-label="Select Planning Project file to upload"
          style={{ display: 'none' }}
          accept=".json,.geojson"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};
