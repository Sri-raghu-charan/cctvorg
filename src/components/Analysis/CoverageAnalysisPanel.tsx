import React from 'react';
import { useCctv } from '../../context/CctvContext';
import {
  AlertTriangle,
  Layers,
  Sparkles,
  PieChart,
  Eye,
  CheckCircle,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { DORI_COLORS } from '../../geo/dori';
import { computeDestination } from '../../geo/coordinates';
import { PlanningPerimeter } from '../../types/camera';

export const CoverageAnalysisPanel: React.FC = () => {
  const {
    cameras,
    footprints,
    activeCamera,
    activeFootprint,
    overlaps,
    planningPerimeter,
    blindSpotAnalysis,
    setPlanningPerimeter,
    doriLayers,
    setDoriLayers
  } = useCctv();

  // Create a 150m square planning perimeter centered on active camera
  const handleGeneratePerimeter = () => {
    if (!activeCamera) return;
    const center = activeCamera.position;
    const halfSpan = 75; // 150m box

    // 4 corners of box: North-West, North-East, South-East, South-West
    const nw = computeDestination(center.latitude, center.longitude, 315, halfSpan * Math.SQRT2);
    const ne = computeDestination(center.latitude, center.longitude, 45, halfSpan * Math.SQRT2);
    const se = computeDestination(center.latitude, center.longitude, 135, halfSpan * Math.SQRT2);
    const sw = computeDestination(center.latitude, center.longitude, 225, halfSpan * Math.SQRT2);

    const perimeter: PlanningPerimeter = {
      id: `perim-${Date.now()}`,
      name: `Facility Perimeter (${activeCamera.name})`,
      coordinates: [nw, ne, se, sw, nw],
      totalAreaM2: 150 * 150 // 22,500 m²
    };

    setPlanningPerimeter(perimeter);
  };

  const handleClearPerimeter = () => {
    setPlanningPerimeter(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Engineering Disclaimer */}
      <div className="disclaimer-box">
        <AlertTriangle size={18} className="disclaimer-icon" />
        <div>
          <strong>Geometric Coverage Estimate:</strong> Visible ground frustums represent mathematical optical line-of-sight. Physical visibility requires verification against 3D building geometry, architectural walls, foliage, and structural obstructions.
        </div>
      </div>

      {/* DORI Standard Layers Toggle */}
      <div className="card-section">
        <div className="card-title">
          <span>EN 62676-4 DORI Layers</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={doriLayers.identification}
              onChange={(e) => setDoriLayers((prev) => ({ ...prev, identification: e.target.checked }))}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DORI_COLORS.IDENTIFICATION }} />
            <span>Identification (250 px/m) - Positive ID</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={doriLayers.recognition}
              onChange={(e) => setDoriLayers((prev) => ({ ...prev, recognition: e.target.checked }))}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DORI_COLORS.RECOGNITION }} />
            <span>Recognition (125 px/m) - Known subject</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={doriLayers.observation}
              onChange={(e) => setDoriLayers((prev) => ({ ...prev, observation: e.target.checked }))}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DORI_COLORS.OBSERVATION }} />
            <span>Observation (62.5 px/m) - Clothing/scene</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={doriLayers.detection}
              onChange={(e) => setDoriLayers((prev) => ({ ...prev, detection: e.target.checked }))}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DORI_COLORS.DETECTION }} />
            <span>Detection (25 px/m) - Human presence</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={doriLayers.maxGeometric}
              onChange={(e) => setDoriLayers((prev) => ({ ...prev, maxGeometric: e.target.checked }))}
            />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DORI_COLORS.GEOMETRIC_MAX }} />
            <span>Geometric Max Outer Frustum</span>
          </label>
        </div>
      </div>

      {/* Overlapping Coverage Detection */}
      <div className="card-section">
        <div className="card-title">
          <span>Multi-Camera Overlaps</span>
          <span style={{ fontSize: '11px', color: 'var(--text-accent)' }}>
            {overlaps.length} Overlapping Pair(s)
          </span>
        </div>

        {overlaps.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No coverage overlaps detected between active cameras.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {overlaps.map((ov, idx) => {
              const c1 = cameras.find((c) => c.id === ov.cameraIds[0]);
              const c2 = cameras.find((c) => c.id === ov.cameraIds[1]);
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#fff' }}>
                    {c1?.name} ⟷ {c2?.name}
                  </div>
                  <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
                    Overlap Area: {ov.overlapAreaM2.toLocaleString()} m²
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blind-Spot & Perimeter Coverage Analysis */}
      <div className="card-section">
        <div className="card-title">
          <span>Planning Area & Blind Spots</span>
        </div>

        {!planningPerimeter ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Generate a 150m x 150m facility perimeter around the active camera to evaluate coverage completeness and unmonitored blind spots.
            </p>
            <button
              className="btn btn-secondary"
              onClick={handleGeneratePerimeter}
              disabled={!activeCamera}
              type="button"
            >
              <Maximize2 size={14} />
              Set Facility Perimeter
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                {planningPerimeter.name}
              </span>
              <button
                className="btn btn-secondary btn-icon-only"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={handleClearPerimeter}
                type="button"
              >
                Clear
              </button>
            </div>

            {blindSpotAnalysis && (
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
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Facility Area</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>
                    {blindSpotAnalysis.perimeterAreaM2.toLocaleString()} m²
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Monitored Area</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {blindSpotAnalysis.coveredAreaM2.toLocaleString()} m²
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Coverage Efficiency</div>
                  <div style={{ fontWeight: 700, color: '#3b82f6' }}>
                    {blindSpotAnalysis.coveragePercentage}%
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Unmonitored Blind Spot</div>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>
                    {blindSpotAnalysis.blindSpotAreaM2.toLocaleString()} m²
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
