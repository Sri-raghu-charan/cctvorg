import React, { useRef, useState, useCallback, useEffect } from 'react';
import { normalizeHeading } from '../../geo/coordinates';
import { Compass, RotateCw } from 'lucide-react';

interface CircularCompassProps {
  heading: number;
  onChange: (heading: number) => void;
  disabled?: boolean;
}

export const CircularCompass: React.FC<CircularCompassProps> = ({
  heading,
  onChange,
  disabled = false
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(heading.toString());

  useEffect(() => {
    setInputValue(Math.round(heading).toString());
  }, [heading]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateHeadingFromEvent(e.clientX, e.clientY);
  };

  const updateHeadingFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;

      // In screen coords: Y goes down.
      // 0° = North (deltaX = 0, deltaY < 0)
      // 90° = East (deltaX > 0, deltaY = 0)
      // 180° = South (deltaX = 0, deltaY > 0)
      // 270° = West (deltaX < 0, deltaY = 0)
      let angleRad = Math.atan2(deltaX, -deltaY);
      let angleDeg = angleRad * (180 / Math.PI);
      const normalized = Math.round(normalizeHeading(angleDeg));
      onChange(normalized);
    },
    [onChange]
  );

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    updateHeadingFromEvent(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(normalizeHeading(num));
    }
  };

  const handleStepRotate = (delta: number) => {
    onChange(normalizeHeading(heading + delta));
  };

  return (
    <div className="compass-container">
      <div
        ref={dialRef}
        className="compass-dial"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Click and drag needle or dial to rotate camera heading"
      >
        {/* Cardinal Markers */}
        <span className="compass-cardinal cardinal-n">N</span>
        <span className="compass-cardinal cardinal-e">E</span>
        <span className="compass-cardinal cardinal-s">S</span>
        <span className="compass-cardinal cardinal-w">W</span>

        {/* Degree Tick marks */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 180 180"
        >
          {Array.from({ length: 24 }).map((_, i) => {
            const deg = i * 15;
            const isMajor = deg % 45 === 0;
            const rad = (deg - 90) * (Math.PI / 180);
            const rOuter = 82;
            const rInner = isMajor ? 70 : 75;
            const x1 = 90 + rOuter * Math.cos(rad);
            const y1 = 90 + rOuter * Math.sin(rad);
            const x2 = 90 + rInner * Math.cos(rad);
            const y2 = 90 + rInner * Math.sin(rad);
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? '#94a3b8' : 'rgba(148, 163, 184, 0.3)'}
                strokeWidth={isMajor ? 2 : 1}
              />
            );
          })}
        </svg>

        {/* Rotating Needle */}
        <div
          className="compass-needle"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <div className="needle-north" />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '-2px',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '35px solid #64748b'
            }}
          />
        </div>

        {/* Center Pivot */}
        <div className="compass-center-cap" />
      </div>

      {/* Numeric readout and quick adjust */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={() => handleStepRotate(-5)}
          title="Rotate -5° counter-clockwise"
          aria-label="Rotate -5 degrees counter-clockwise"
          type="button"
        >
          -5°
        </button>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px 8px' }}>
          <Compass size={14} style={{ color: 'var(--text-accent)', marginRight: '6px' }} />
          <input
            type="number"
            min="0"
            max="359"
            aria-label="Camera azimuth heading in degrees"
            value={inputValue}
            onChange={handleInputChange}
            style={{
              width: '45px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '13px',
              textAlign: 'center',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>°</span>
        </div>
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={() => handleStepRotate(5)}
          title="Rotate +5° clockwise"
          aria-label="Rotate +5 degrees clockwise"
          type="button"
        >
          +5°
        </button>
      </div>

      {/* Quick Cardinal Jumps */}
      <div className="compass-quick-jumps">
        <button className="quick-jump-btn" onClick={() => onChange(0)} aria-label="Face North (0 degrees)" type="button">
          N (0°)
        </button>
        <button className="quick-jump-btn" onClick={() => onChange(90)} aria-label="Face East (90 degrees)" type="button">
          E (90°)
        </button>
        <button className="quick-jump-btn" onClick={() => onChange(180)} aria-label="Face South (180 degrees)" type="button">
          S (180°)
        </button>
        <button className="quick-jump-btn" onClick={() => onChange(270)} aria-label="Face West (270 degrees)" type="button">
          W (270°)
        </button>
      </div>
    </div>
  );
};
