import React, { useState } from 'react';
import { Camera, CameraSpecs } from '../../types/camera';
import { VERIFIED_CAMERA_MODELS, createCustomCameraSpecs } from '../../data/cameraModels';
import { CircularCompass } from '../Compass/CircularCompass';
import { GroundMovementControls } from '../Movement/GroundMovementControls';
import { useCctv } from '../../context/CctvContext';
import {
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Eye,
  Info,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';

interface CameraInspectorProps {
  camera: Camera;
}

export const CameraInspector: React.FC<CameraInspectorProps> = ({ camera }) => {
  const {
    updateCamera,
    rotateCamera,
    stepCamera,
    undoMovement,
    resetToOriginal,
    historyStack,
    activeFootprint
  } = useCctv();

  const [modelSearch, setModelSearch] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);

  const canUndo = (historyStack.get(camera.id)?.length || 0) > 0;

  // Filter models based on search query
  const filteredModels = VERIFIED_CAMERA_MODELS.filter(
    (m) =>
      m.modelName.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.formFactor.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const handleSelectModel = (model: CameraSpecs) => {
    updateCamera(camera.id, {
      specs: { ...model },
      rangeMeters: model.maxOpticalRangeMeters || camera.rangeMeters
    });
    setShowModelPicker(false);
  };

  const handleSwitchToCustom = () => {
    const customSpecs = createCustomCameraSpecs({
      selectedHfov: camera.specs.selectedHfov,
      selectedVfov: camera.specs.selectedVfov,
      resolutionWidth: camera.specs.resolutionWidth,
      resolutionHeight: camera.specs.resolutionHeight
    });
    updateCamera(camera.id, { specs: customSpecs });
    setShowModelPicker(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* General Identification */}
      <div className="card-section">
        <div className="card-title">
          <span>Camera Identity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              aria-label="Camera color marker"
              value={camera.color}
              onChange={(e) => updateCamera(camera.id, { color: e.target.value })}
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'transparent'
              }}
              title="Camera color marker"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`camera-name-${camera.id}`} className="form-label-row">
            <span>Name</span>
          </label>
          <input
            id={`camera-name-${camera.id}`}
            type="text"
            className="input-text"
            aria-label="Camera name"
            value={camera.name}
            onChange={(e) => updateCamera(camera.id, { name: e.target.value })}
          />
        </div>
      </div>

      {/* Model & Specifications Section */}
      <div className="card-section">
        <div className="card-title">
          <span>Model Specifications</span>
          {camera.specs.verificationStatus === 'verified' ? (
            <span className="status-badge status-badge-verified">
              <ShieldCheck size={11} /> Verified
            </span>
          ) : (
            <span className="status-badge status-badge-custom">
              <AlertTriangle size={11} /> User Configured
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {camera.specs.modelName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {camera.specs.manufacturer} • {camera.specs.formFactor.toUpperCase()} • {camera.specs.megaPixels} MP
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            onClick={() => setShowModelPicker(!showModelPicker)}
            type="button"
          >
            {showModelPicker ? 'Close' : 'Change Model'}
          </button>
        </div>

        {/* Model Selector Dropdown / Search Modal */}
        {showModelPicker && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-input)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <Search size={12} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
                <input
                  type="text"
                  aria-label="Search manufacturer or model"
                  placeholder="Search manufacturer or model..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '10px', padding: '4px 6px' }}
                onClick={handleSwitchToCustom}
                title="Switch to manual unverified custom parameters"
                aria-label="Switch to manual unverified custom parameters"
                type="button"
              >
                Custom Model
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredModels.map((m) => (
                <div
                  key={m.modelName}
                  onClick={() => handleSelectModel(m)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background:
                      camera.specs.modelName === m.modelName
                        ? 'rgba(59, 130, 246, 0.25)'
                        : 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>
                    {m.modelName}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {m.manufacturer} • {m.megaPixels}MP ({m.resolutionWidth}x{m.resolutionHeight}) • HFOV: {m.hfovMin}°-{m.hfovMax}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datasheet Reference Note */}
        {camera.specs.datasheetRef && (
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Source: {camera.specs.datasheetRef}
          </div>
        )}

        {/* Optical FOV Adjustments */}
        <div className="form-group">
          <div className="form-label-row">
            <span>Horizontal FOV (HFOV)</span>
            <span className="form-value-badge">{camera.specs.selectedHfov.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            aria-label="Horizontal Field of View in degrees"
            min={camera.specs.hfovMin || 20}
            max={camera.specs.hfovMax || 140}
            step="0.5"
            className="slider-control"
            value={camera.specs.selectedHfov}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCamera(camera.id, {
                specs: { ...camera.specs, selectedHfov: val }
              });
            }}
          />
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <span>Vertical FOV (VFOV)</span>
            <span className="form-value-badge">{camera.specs.selectedVfov.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            aria-label="Vertical Field of View in degrees"
            min={camera.specs.vfovMin || 10}
            max={camera.specs.vfovMax || 100}
            step="0.5"
            className="slider-control"
            value={camera.specs.selectedVfov}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCamera(camera.id, {
                specs: { ...camera.specs, selectedVfov: val }
              });
            }}
          />
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <span>Configured Max Range</span>
            <span className="form-value-badge">{camera.rangeMeters} m</span>
          </div>
          <input
            type="range"
            aria-label="Configured Maximum Range in meters"
            min="10"
            max="250"
            step="1"
            className="slider-control"
            value={camera.rangeMeters}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCamera(camera.id, { rangeMeters: val });
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span>IR Range: {camera.specs.irRangeMeters}m</span>
            <span>Doc Max: {camera.specs.maxOpticalRangeMeters}m</span>
          </div>
        </div>
      </div>

      {/* Mounting & Orientation */}
      <div className="card-section">
        <div className="card-title">
          <span>Mounting & Orientation</span>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <span>Mounting Height</span>
            <span className="form-value-badge">{camera.mountingHeight.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            aria-label="Mounting Height in meters"
            min="1.5"
            max="30"
            step="0.5"
            className="slider-control"
            value={camera.mountingHeight}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCamera(camera.id, { mountingHeight: val });
            }}
          />
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <span>Tilt (Depression Angle)</span>
            <span className="form-value-badge">{camera.tilt.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            aria-label="Camera Tilt depression angle in degrees"
            min="0"
            max="89"
            step="1"
            className="slider-control"
            value={camera.tilt}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateCamera(camera.id, { tilt: val });
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span>0° (Horizon)</span>
            <span>45° (Standard)</span>
            <span>89° (Nadir)</span>
          </div>
        </div>

        {/* Circular Compass Control */}
        <div style={{ marginTop: '8px' }}>
          <div className="form-label-row" style={{ marginBottom: '4px' }}>
            <span>Camera Heading (Azimuth)</span>
            <span className="form-value-badge">{Math.round(camera.heading)}°</span>
          </div>
          <CircularCompass
            heading={camera.heading}
            onChange={(newHeading) => rotateCamera(camera.id, newHeading)}
          />
        </div>
      </div>

      {/* Ground Movement Controls */}
      <GroundMovementControls
        camera={camera}
        onMove={(dir, dist) => stepCamera(camera.id, dir, dist)}
        onUndo={() => undoMovement(camera.id)}
        onReset={() => resetToOriginal(camera.id)}
        canUndo={canUndo}
      />

      {/* Computed Coverage Geometry Readout */}
      {activeFootprint && (
        <div className="card-section">
          <div className="card-title">
            <span>Ground Coverage Metrics</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridGap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px'
            }}
          >
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Near Dead Zone</div>
              <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                {activeFootprint.nearDistanceMeters.toFixed(1)} m
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Far Reach</div>
              <div style={{ fontWeight: 700, color: '#3b82f6' }}>
                {activeFootprint.farDistanceMeters.toFixed(1)} m
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Far Span Width</div>
              <div style={{ fontWeight: 700, color: '#10b981' }}>
                {activeFootprint.footprintWidthFarMeters.toFixed(1)} m
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Total Footprint</div>
              <div style={{ fontWeight: 700, color: '#a855f7' }}>
                {activeFootprint.totalAreaM2.toLocaleString()} m²
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
