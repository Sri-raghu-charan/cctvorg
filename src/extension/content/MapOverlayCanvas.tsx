import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCctv } from '../../context/CctvContext';
import { urlWatcher, CurrentMapState } from '../services/urlWatcher';
import {
  projectGoogleEarthToScreen,
  projectGoogleEarthPolygon,
  projectGoogleMapsToScreen,
  unprojectGoogleEarthScreen,
  unprojectGoogleMapsScreen,
  ViewportSize,
  ScreenPoint
} from '../../geo/projection';
import { computeBearing } from '../../geo/coordinates';
import { DORI_COLORS } from '../../geo/dori';
import { VERIFIED_CAMERA_MODELS } from '../../data/cameraModels';

interface MapOverlayCanvasProps {
  onSelectCamera?: (id: string) => void;
}

export const MapOverlayCanvas: React.FC<MapOverlayCanvasProps> = ({ onSelectCamera }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const [mapState, setMapState] = useState<CurrentMapState>(() => urlWatcher.getState());
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Dragging & Aiming interactive states
  const [draggingCamId, setDraggingCamId] = useState<string | null>(null);
  const [aimingCamId, setAimingCamId] = useState<string | null>(null);

  const {
    cameras,
    activeCameraId,
    activeCamera,
    footprints,
    overlaps,
    blindSpotAnalysis,
    doriLayers,
    isPlacingCamera,
    setIsPlacingCamera,
    isRelocatingCamera,
    setIsRelocatingCamera,
    isAimingCamera,
    setIsAimingCamera,
    addCameraAtCoordinates,
    relocateCamera,
    aimCameraAt,
    updateCamera,
    rotateCamera,
    selectCamera
  } = useCctv();

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Map state listener from URL watcher
  useEffect(() => {
    return urlWatcher.subscribe((state) => {
      setMapState(state);
    });
  }, []);

  // Track mouse position in special click modes
  const isSpecialMode = isPlacingCamera || isRelocatingCamera || isAimingCamera;
  useEffect(() => {
    if (!isSpecialMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isSpecialMode]);

  // Project point with exact terrain elevation anchoring
  const groundAlt = mapState.platform === 'earth' && mapState.earthView ? (mapState.earthView.altitude || 0) : 0;

  const projectPoint = useCallback(
    (lat: number, lon: number, elev: number = groundAlt): ScreenPoint => {
      if (mapState.platform === 'earth' && mapState.earthView) {
        return projectGoogleEarthToScreen(lat, lon, elev, mapState.earthView, viewport);
      }
      const mapsView = mapState.mapsView || {
        latitude: mapState.centerLat,
        longitude: mapState.centerLon,
        zoom: mapState.altitudeOrZoom || 18
      };
      return projectGoogleMapsToScreen(lat, lon, mapsView, viewport);
    },
    [mapState, viewport, groundAlt]
  );

  // Unproject screen point to geographic coordinates
  const unprojectPoint = useCallback(
    (screenX: number, screenY: number): { latitude: number; longitude: number } => {
      if (mapState.platform === 'earth' && mapState.earthView) {
        return unprojectGoogleEarthScreen(screenX, screenY, mapState.earthView, viewport);
      }
      const mapsView = mapState.mapsView || {
        latitude: mapState.centerLat,
        longitude: mapState.centerLon,
        zoom: mapState.altitudeOrZoom || 18
      };
      return unprojectGoogleMapsScreen(screenX, screenY, mapsView, viewport);
    },
    [mapState, viewport]
  );

  // Handle map click in placement, relocate, or aim mode
  const handleMapActionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const coords = unprojectPoint(clickX, clickY);

    if (isPlacingCamera) {
      const newCam = addCameraAtCoordinates(
        { latitude: coords.latitude, longitude: coords.longitude, elevation: groundAlt },
        VERIFIED_CAMERA_MODELS[0]
      );
      selectCamera(newCam.id);
      setIsPlacingCamera(false);
      return;
    }

    if (isRelocatingCamera && activeCameraId) {
      relocateCamera(activeCameraId, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        elevation: groundAlt
      });
      return;
    }

    if (isAimingCamera && activeCameraId) {
      aimCameraAt(activeCameraId, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        elevation: groundAlt
      });
      return;
    }
  };

  // Direct Dragging of camera markers
  const handleMarkerPointerDown = (camId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectCamera(camId);
    if (onSelectCamera) onSelectCamera(camId);
    setDraggingCamId(camId);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMarkerPointerMove = (camId: string, e: React.PointerEvent) => {
    if (draggingCamId !== camId) return;
    const coords = unprojectPoint(e.clientX, e.clientY);
    updateCamera(camId, {
      position: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        elevation: groundAlt
      }
    });
  };

  const handleMarkerPointerUp = (camId: string, e: React.PointerEvent) => {
    if (draggingCamId === camId) {
      setDraggingCamId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  // Direct Aiming via heading handle drag
  const handleAimPointerDown = (camId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectCamera(camId);
    setAimingCamId(camId);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleAimPointerMove = (camId: string, e: React.PointerEvent) => {
    if (aimingCamId !== camId) return;
    const cam = cameras.find((c) => c.id === camId);
    if (!cam) return;
    const targetCoords = unprojectPoint(e.clientX, e.clientY);
    const bearing = computeBearing(
      cam.position.latitude,
      cam.position.longitude,
      targetCoords.latitude,
      targetCoords.longitude
    );
    rotateCamera(camId, bearing);
  };

  const handleAimPointerUp = (camId: string, e: React.PointerEvent) => {
    if (aimingCamId === camId) {
      setAimingCamId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  // Render loop using Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = viewport.width;
      const height = viewport.height;

      // Handle retina displays
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Helper to draw projected polygon with 3D near-plane clipping
      const drawPolygon = (
        coords: { latitude: number; longitude: number }[],
        fillStyle: string,
        strokeStyle: string,
        lineWidth: number = 1.5,
        elev: number = groundAlt
      ) => {
        if (!coords || coords.length < 3) return;

        let screenPts: { x: number; y: number }[] = [];
        if (mapState.platform === 'earth' && mapState.earthView) {
          screenPts = projectGoogleEarthPolygon(coords, elev, mapState.earthView, viewport);
        } else {
          const mapsView = mapState.mapsView || {
            latitude: mapState.centerLat,
            longitude: mapState.centerLon,
            zoom: mapState.altitudeOrZoom || 18
          };
          screenPts = coords
            .map((c) => projectGoogleMapsToScreen(c.latitude, c.longitude, mapsView, viewport))
            .filter((p) => p.visible);
        }

        if (screenPts.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(screenPts[0].x, screenPts[0].y);
        for (let i = 1; i < screenPts.length; i++) {
          ctx.lineTo(screenPts[i].x, screenPts[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };

      // 1. Draw blind spot polygons if available
      if (blindSpotAnalysis && blindSpotAnalysis.blindSpotPolygons.length > 0) {
        blindSpotAnalysis.blindSpotPolygons.forEach((poly) => {
          drawPolygon(poly, 'rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.7)', 1.5, groundAlt);
        });
      }

      // 2. Draw camera coverage footprints, DORI zones, and sightlines
      cameras.forEach((cam) => {
        if (!cam.visible) return;

        const isSelected = cam.id === activeCameraId;
        const fp = footprints.get(cam.id);
        const camElev = cam.position.elevation ?? groundAlt;

        const groundPt = projectPoint(cam.position.latitude, cam.position.longitude, camElev);
        const lensPt = projectPoint(
          cam.position.latitude,
          cam.position.longitude,
          camElev + cam.mountingHeight
        );

        if (fp && fp.coordinates.length >= 3) {
          // Main Geometric Footprint Polygon
          if (doriLayers.maxGeometric) {
            drawPolygon(
              fp.coordinates,
              isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.14)',
              cam.color || '#3b82f6',
              isSelected ? 2.2 : 1.4,
              camElev
            );
          }

          // DORI Zones
          if (doriLayers.identification && fp.doriZones.identification.length >= 3) {
            drawPolygon(fp.doriZones.identification, 'rgba(239, 68, 68, 0.45)', DORI_COLORS.IDENTIFICATION, 1.2, camElev);
          }
          if (doriLayers.recognition && fp.doriZones.recognition.length >= 3) {
            drawPolygon(fp.doriZones.recognition, 'rgba(245, 158, 11, 0.35)', DORI_COLORS.RECOGNITION, 1.2, camElev);
          }
          if (doriLayers.observation && fp.doriZones.observation.length >= 3) {
            drawPolygon(fp.doriZones.observation, 'rgba(234, 179, 8, 0.25)', DORI_COLORS.OBSERVATION, 1.2, camElev);
          }
          if (doriLayers.detection && fp.doriZones.detection.length >= 3) {
            drawPolygon(fp.doriZones.detection, 'rgba(16, 185, 129, 0.18)', DORI_COLORS.DETECTION, 1.2, camElev);
          }

          // DORI Zone Distance Badges for selected camera
          if (isSelected) {
            const drawZoneBadge = (coords: { latitude: number; longitude: number }[], label: string, color: string) => {
              if (!coords || coords.length < 3) return;
              const midIdx = Math.floor(coords.length / 2);
              const pt = coords[midIdx];
              if (!pt) return;
              const scr = projectPoint(pt.latitude, pt.longitude, camElev);
              if (!scr.visible) return;

              ctx.save();
              ctx.font = 'bold 9px sans-serif';
              const textMetrics = ctx.measureText(label);
              const padX = 4;
              const padY = 2;
              const badgeW = textMetrics.width + padX * 2;
              const badgeH = 13;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(scr.x - badgeW / 2, scr.y - badgeH / 2, badgeW, badgeH, 3);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, scr.x, scr.y);
              ctx.restore();
            };

            if (doriLayers.identification && fp.doriZones.identification.length >= 3) {
              drawZoneBadge(fp.doriZones.identification, `ID: ${cam.specs.datasheetDori?.identifyMeters || '7'}m (Face)`, '#ef4444');
            }
            if (doriLayers.recognition && fp.doriZones.recognition.length >= 3) {
              drawZoneBadge(fp.doriZones.recognition, `Rec: ${cam.specs.datasheetDori?.recognizeMeters || '15'}m (Plates)`, '#f59e0b');
            }
            if (doriLayers.observation && fp.doriZones.observation.length >= 3) {
              drawZoneBadge(fp.doriZones.observation, `Obs: ${cam.specs.datasheetDori?.observeMeters || '30'}m (IR Limit)`, '#eab308');
            }
            if (doriLayers.maxGeometric && fp.coordinates.length >= 3) {
              drawZoneBadge(fp.coordinates, `Detect: ${cam.specs.datasheetDori?.detectMeters || fp.farDistanceMeters.toFixed(0)}m (Motion Only)`, '#38bdf8');
            }
          }

          // 3D Optical Sightline Frustum Rays (if selected)
          if (isSelected && lensPt.visible && fp.coordinates.length >= 4) {
            const cornerIndices = [
              0,
              Math.floor(fp.coordinates.length / 4),
              Math.floor(fp.coordinates.length / 2),
              Math.floor((3 * fp.coordinates.length) / 4)
            ];

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = cam.color || '#60a5fa';
            ctx.lineWidth = 1;

            cornerIndices.forEach((idx) => {
              const corner = fp.coordinates[idx];
              if (corner) {
                const cornerPt = projectPoint(corner.latitude, corner.longitude, camElev);
                if (cornerPt.visible) {
                  ctx.beginPath();
                  ctx.moveTo(lensPt.x, lensPt.y);
                  ctx.lineTo(cornerPt.x, cornerPt.y);
                  ctx.stroke();
                }
              }
            });
            ctx.restore();
          }
        }

        // Camera Mounting Pole in 3D perspective
        if (groundPt.visible && lensPt.visible) {
          ctx.beginPath();
          ctx.moveTo(groundPt.x, groundPt.y);
          ctx.lineTo(lensPt.x, lensPt.y);
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#94a3b8';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          // Pole ground base anchor
          ctx.beginPath();
          ctx.arc(groundPt.x, groundPt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#475569';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Heading Direction Line & Arrow
        if (lensPt.visible) {
          const arrowLen = 36;
          const rad = (cam.heading - 90) * (Math.PI / 180);
          const endX = lensPt.x + arrowLen * Math.cos(rad);
          const endY = lensPt.y + arrowLen * Math.sin(rad);

          ctx.beginPath();
          ctx.moveTo(lensPt.x, lensPt.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = cam.color || '#3b82f6';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Arrow tip
          const tipAngle = Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 8 * Math.cos(rad - tipAngle), endY - 8 * Math.sin(rad - tipAngle));
          ctx.lineTo(endX - 8 * Math.cos(rad + tipAngle), endY - 8 * Math.sin(rad + tipAngle));
          ctx.closePath();
          ctx.fillStyle = cam.color || '#3b82f6';
          ctx.fill();
        }
      });

      // 3. Draw pairwise overlaps
      overlaps.forEach((ov) => {
        if (!ov.overlapPolygon || ov.overlapPolygon.length < 3) return;
        drawPolygon(ov.overlapPolygon, 'rgba(168, 85, 247, 0.4)', '#d8b4fe', 2);
      });

      // 4. Special mode cursor & crosshair
      if (isSpecialMode && mousePos) {
        ctx.save();
        ctx.strokeStyle = isAimingCamera ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(mousePos.x - 22, mousePos.y);
        ctx.lineTo(mousePos.x + 22, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - 22);
        ctx.lineTo(mousePos.x, mousePos.y + 22);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = isAimingCamera ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
        ctx.strokeStyle = isAimingCamera ? '#f59e0b' : '#38bdf8';
        ctx.setLineDash([]);
        ctx.stroke();

        // Crosshair tooltip label
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        const tipText = isPlacingCamera
          ? 'Click map to place camera'
          : isRelocatingCamera
          ? 'Click junction/road to relocate camera'
          : 'Click road/junction to aim camera';
        ctx.strokeText(tipText, mousePos.x + 14, mousePos.y - 12);
        ctx.fillText(tipText, mousePos.x + 14, mousePos.y - 12);

        ctx.restore();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    viewport,
    mapState,
    cameras,
    activeCameraId,
    footprints,
    overlaps,
    blindSpotAnalysis,
    doriLayers,
    isSpecialMode,
    isPlacingCamera,
    isRelocatingCamera,
    isAimingCamera,
    mousePos,
    groundAlt,
    projectPoint
  ]);

  return (
    <>
      {/* Underlying Canvas for high-performance 60fps 3D rendering */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 100,
          pointerEvents: 'none'
        }}
      />

      {/* Interactive Layer for draggable camera markers & aim handles */}
      <div
        className="cctv-interactive-layer"
        onClick={isSpecialMode ? handleMapActionClick : undefined}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: isSpecialMode ? 99990 : 101,
          pointerEvents: isSpecialMode ? 'auto' : 'none',
          cursor: isSpecialMode ? 'crosshair' : 'default'
        }}
      >
        {!isSpecialMode &&
          cameras.map((cam) => {
            if (!cam.visible) return null;
            const isSelected = cam.id === activeCameraId;
            const lensPt = projectPoint(
              cam.position.latitude,
              cam.position.longitude,
              groundAlt + cam.mountingHeight
            );

            if (!lensPt.visible) return null;

            const arrowLen = 36;
            const rad = (cam.heading - 90) * (Math.PI / 180);
            const aimHandleX = lensPt.x + arrowLen * Math.cos(rad);
            const aimHandleY = lensPt.y + arrowLen * Math.sin(rad);

            return (
              <React.Fragment key={cam.id}>
                {/* Camera Marker Badge (Locked in place unless in relocate mode) */}
                <div
                  onPointerDown={isRelocatingCamera ? (e) => handleMarkerPointerDown(cam.id, e) : undefined}
                  onPointerMove={isRelocatingCamera ? (e) => handleMarkerPointerMove(cam.id, e) : undefined}
                  onPointerUp={isRelocatingCamera ? (e) => handleMarkerPointerUp(cam.id, e) : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCamera(cam.id);
                    if (onSelectCamera) onSelectCamera(cam.id);
                  }}
                  title={isRelocatingCamera ? "Drag to move camera to junction" : "Click to select camera (Position locked)"}
                  style={{
                    position: 'absolute',
                    left: `${lensPt.x}px`,
                    top: `${lensPt.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    cursor: isRelocatingCamera ? (draggingCamId === cam.id ? 'grabbing' : 'grab') : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    userSelect: 'none',
                    zIndex: isSelected ? 105 : 102
                  }}
                >
                  {/* Outer glow ring when selected */}
                  <div
                    style={{
                      width: isSelected ? '28px' : '22px',
                      height: isSelected ? '28px' : '22px',
                      borderRadius: '50%',
                      background: cam.color || '#3b82f6',
                      border: '2px solid #ffffff',
                      boxShadow: isSelected
                        ? '0 0 0 5px rgba(56, 189, 248, 0.4), 0 4px 12px rgba(0,0,0,0.5)'
                        : '0 2px 8px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '11px', lineHeight: 1 }}>📹</span>
                  </div>

                  {/* Camera Name & Mounting Height Label */}
                  <div
                    style={{
                      marginTop: '4px',
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(4px)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      pointerEvents: 'none'
                    }}
                  >
                    {cam.name} ({cam.mountingHeight}m)
                  </div>
                </div>

                {/* Heading Aim Bead Handle (Draggable to rotate camera) */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => handleAimPointerDown(cam.id, e)}
                    onPointerMove={(e) => handleAimPointerMove(cam.id, e)}
                    onPointerUp={(e) => handleAimPointerUp(cam.id, e)}
                    title="Drag to aim camera towards street / junction"
                    style={{
                      position: 'absolute',
                      left: `${aimHandleX}px`,
                      top: `${aimHandleY}px`,
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.4), 0 2px 6px rgba(0,0,0,0.4)',
                      pointerEvents: 'auto',
                      cursor: 'crosshair',
                      zIndex: 106,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </div>

      {/* Special Mode Interactive Banner */}
      {isSpecialMode && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.96)',
            border: isAimingCamera ? '1px solid #f59e0b' : '1px solid #38bdf8',
            borderRadius: '24px',
            padding: '10px 22px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 99995,
            pointerEvents: 'auto'
          }}
        >
          <span>
            {isPlacingCamera && '📍 New Camera Mode: Click anywhere on Earth or Maps to drop camera'}
            {isRelocatingCamera && `📍 Repositioning ${activeCamera?.name || 'Camera'}: Click on the junction or road`}
            {isAimingCamera && `🎯 Aiming ${activeCamera?.name || 'Camera'}: Click down the road to point camera`}
          </span>

          {isRelocatingCamera && (
            <button
              type="button"
              onClick={() => {
                if (activeCameraId) {
                  relocateCamera(activeCameraId, {
                    latitude: mapState.centerLat,
                    longitude: mapState.centerLon,
                    elevation: groundAlt
                  });
                }
              }}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Drop at View Center
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsPlacingCamera(false);
              setIsRelocatingCamera(false);
              setIsAimingCamera(false);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '12px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
};
