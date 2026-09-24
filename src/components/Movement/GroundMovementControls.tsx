import React, { useState } from 'react';
import { Camera, MovementDirection } from '../../types/camera';
import { STANDARD_STEP_SIZES } from '../../geo/movement';
import { formatCoordinates } from '../../geo/coordinates';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Undo2, MapPin, Copy, Check } from 'lucide-react';

interface GroundMovementControlsProps {
  camera: Camera;
  onMove: (direction: MovementDirection, distanceMeters: number) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
}

export const GroundMovementControls: React.FC<GroundMovementControlsProps> = ({
  camera,
  onMove,
  onUndo,
  onReset,
  canUndo
}) => {
  const [stepSize, setStepSize] = useState<number>(1.0);
  const [customStep, setCustomStep] = useState<string>('1.0');
  const [copied, setCopied] = useState<boolean>(false);

  const handleStepSelect = (size: number) => {
    setStepSize(size);
    setCustomStep(size.toString());
  };

  const handleCustomStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomStep(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setStepSize(num);
    }
  };

  const handleCopyCoordinates = () => {
    const text = `${camera.position.latitude.toFixed(8)}, ${camera.position.longitude.toFixed(8)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-section">
      <div className="card-title">
        <span>Ground-Distance Movement</span>
        <span style={{ fontSize: '11px', color: 'var(--text-accent)' }}>
          Step: {stepSize}m
        </span>
      </div>

      {/* Step Size Selector */}
      <div className="step-size-chips">
        {STANDARD_STEP_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`step-chip ${stepSize === size ? 'active' : ''}`}
            onClick={() => handleStepSelect(size)}
          >
            {size}m
          </button>
        ))}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            min="0.01"
            step="0.1"
            aria-label="Custom movement step size in meters"
            value={customStep}
            onChange={handleCustomStepChange}
            style={{
              width: '50px',
              padding: '3px 6px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px'
            }}
            placeholder="Custom"
          />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>m</span>
        </div>
      </div>

      {/* Directional Pad */}
      <div className="movement-dpad">
        <div className="dpad-center" />
        <button
          className="dpad-btn"
          onClick={() => onMove('forward', stepSize)}
          title={`Move Forward by ${stepSize}m along heading ${Math.round(camera.heading)}°`}
          aria-label={`Move Forward by ${stepSize} meters along heading`}
          type="button"
        >
          <ArrowUp size={18} />
        </button>
        <div className="dpad-center" />

        <button
          className="dpad-btn"
          onClick={() => onMove('left', stepSize)}
          title={`Move Left by ${stepSize}m perpendicular to heading`}
          aria-label={`Move Left by ${stepSize} meters perpendicular to heading`}
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="dpad-center" title="Camera Center">
          <MapPin size={14} style={{ color: 'var(--text-accent)' }} />
        </div>
        <button
          className="dpad-btn"
          onClick={() => onMove('right', stepSize)}
          title={`Move Right by ${stepSize}m perpendicular to heading`}
          aria-label={`Move Right by ${stepSize} meters perpendicular to heading`}
          type="button"
        >
          <ArrowRight size={18} />
        </button>

        <div className="dpad-center" />
        <button
          className="dpad-btn"
          onClick={() => onMove('backward', stepSize)}
          title={`Move Backward by ${stepSize}m`}
          aria-label={`Move Backward by ${stepSize} meters`}
          type="button"
        >
          <ArrowDown size={18} />
        </button>
        <div className="dpad-center" />
      </div>

      {/* Undo and Reset Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-secondary"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ flex: 1, opacity: canUndo ? 1 : 0.5 }}
          type="button"
          title="Undo last physical position change"
        >
          <Undo2 size={14} />
          Undo Move
        </button>
        <button
          className="btn btn-secondary"
          onClick={onReset}
          style={{ flex: 1 }}
          type="button"
          title="Reset to camera's initial placement coordinates"
        >
          <RotateCcw size={14} />
          Reset Origin
        </button>
      </div>

      {/* Coordinate Readout */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div className="coord-readout">
          <span>Lat: {camera.position.latitude.toFixed(7)}°</span>
          <span>Lon: {camera.position.longitude.toFixed(7)}°</span>
          <span>Elev: {camera.position.elevation.toFixed(1)}m</span>
        </div>
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={handleCopyCoordinates}
          title="Copy WGS84 coordinates to clipboard"
          type="button"
        >
          {copied ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};
