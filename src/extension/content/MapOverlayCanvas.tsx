import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCctv } from '../../context/CctvContext';
import { urlWatcher, CurrentMapState } from '../services/urlWatcher';
import {
  projectGoogleEarthToScreen,
  projectGoogleMapsToScreen,
  unprojectGoogleEarthScreen,
  unprojectGoogleMapsScreen,
  ViewportSize,
  ScreenPoint
} from '../../geo/projection';
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

  const {
    cameras,
    activeCameraId,
    footprints,
    overlaps,
    blindSpotAnalysis,
    doriLayers,
    isPlacingCamera,
    setIsPlacingCamera,
    addCameraAtCoordinates,
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

  // Track mouse position in placement mode
  useEffect(() => {
    if (!isPlacingCamera) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPlacingCamera]);

  // Real-time drag compensation: tracks active map panning so overlay moves synchronously with map
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0
  });

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Don't track drag if clicking on the floating bar UI or placing a camera
      if ((e.target as HTMLElement)?.closest('.cctv-floating-bar-wrapper') || isPlacingCamera) {
        return;
      }
      if (e.button === 0) {
        dragRef.current = {
          isDragging: true,
          startX: e.clientX,
          startY: e.clientY
        };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setDragOffset({ dx, dy });
    };

    const handlePointerUp = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        // Keep offset until next animation frame or URL commit
        requestAnimationFrame(() => setDragOffset({ dx: 0, dy: 0 }));
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isPlacingCamera]);

  // Project point based on current platform
  const projectPoint = useCallback(
    (lat: number, lon: number, elev: number = 0): ScreenPoint => {
      let pt: ScreenPoint;
      if (mapState.platform === 'earth' && mapState.earthView) {
        pt = projectGoogleEarthToScreen(lat, lon, elev, mapState.earthView, viewport);
      } else {
        const mapsView = mapState.mapsView || {
          latitude: mapState.centerLat,
          longitude: mapState.centerLon,
          zoom: mapState.altitudeOrZoom || 18
        };
        pt = projectGoogleMapsToScreen(lat, lon, mapsView, viewport);
      }

      // Apply real-time interactive drag offset if currently dragging map
      if (dragOffset.dx !== 0 || dragOffset.dy !== 0) {
        return {
          ...pt,
          x: pt.x + dragOffset.dx,
          y: pt.y + dragOffset.dy
        };
      }
      return pt;
    },
    [mapState, viewport, dragOffset]
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

  // Handle map click in placement mode
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlacingCamera) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const coords = unprojectPoint(clickX, clickY);
      const newCam = addCameraAtCoordinates(
        { latitude: coords.latitude, longitude: coords.longitude, elevation: 10 },
        VERIFIED_CAMERA_MODELS[0]
      );
      selectCamera(newCam.id);
      setIsPlacingCamera(false);
      return;
    }

    // Check if clicked near any camera marker (within 18px radius)
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (const cam of cameras) {
      if (!cam.visible) continue;
      const pt = projectPoint(cam.position.latitude, cam.position.longitude, cam.position.elevation);
      if (!pt.visible) continue;

      const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
      if (dist <= 20) {
        selectCamera(cam.id);
        if (onSelectCamera) onSelectCamera(cam.id);
        break;
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

      // 1. Draw blind spot polygons if available
      if (blindSpotAnalysis && blindSpotAnalysis.blindSpotPolygons.length > 0) {
        blindSpotAnalysis.blindSpotPolygons.forEach((poly) => {
          if (poly.length < 3) return;
          ctx.beginPath();
          let first = true;
          poly.forEach((v) => {
            const pt = projectPoint(v.latitude, v.longitude, 0);
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // 2. Draw camera coverage footprints, DORI zones, and sightlines
      cameras.forEach((cam) => {
        if (!cam.visible) return;

        const isSelected = cam.id === activeCameraId;
        const fp = footprints.get(cam.id);

        const groundPt = projectPoint(cam.position.latitude, cam.position.longitude, cam.position.elevation);
        const lensPt = projectPoint(
          cam.position.latitude,
          cam.position.longitude,
          cam.position.elevation + cam.mountingHeight
        );

        // Helper to draw polygon
        const drawPoly = (coords: { latitude: number; longitude: number }[], fillStyle: string, strokeStyle: string, lineWidth: number = 1.5) => {
          if (!coords || coords.length < 3) return;
          ctx.beginPath();
          let started = false;
          coords.forEach((v) => {
            const pt = projectPoint(v.latitude, v.longitude, cam.position.elevation);
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          });
          ctx.closePath();
          ctx.fillStyle = fillStyle;
          ctx.fill();
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        };

        if (fp && fp.coordinates.length >= 3) {
          // Main Footprint Polygon
          if (doriLayers.maxGeometric) {
            drawPoly(
              fp.coordinates,
              isSelected ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.16)',
              cam.color || '#3b82f6',
              isSelected ? 2.5 : 1.5
            );
          }

          // DORI Zones
          if (doriLayers.identification && fp.doriZones.identification.length >= 3) {
            drawPoly(fp.doriZones.identification, 'rgba(239, 68, 68, 0.4)', DORI_COLORS.IDENTIFICATION, 1.2);
          }
          if (doriLayers.recognition && fp.doriZones.recognition.length >= 3) {
            drawPoly(fp.doriZones.recognition, 'rgba(245, 158, 11, 0.3)', DORI_COLORS.RECOGNITION, 1.2);
          }
          if (doriLayers.observation && fp.doriZones.observation.length >= 3) {
            drawPoly(fp.doriZones.observation, 'rgba(16, 185, 129, 0.2)', DORI_COLORS.OBSERVATION, 1.2);
          }
          if (doriLayers.detection && fp.doriZones.detection.length >= 3) {
            drawPoly(fp.doriZones.detection, 'rgba(59, 130, 246, 0.15)', DORI_COLORS.DETECTION, 1.2);
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
                const cornerPt = projectPoint(corner.latitude, corner.longitude, cam.position.elevation);
                ctx.beginPath();
                ctx.moveTo(lensPt.x, lensPt.y);
                ctx.lineTo(cornerPt.x, cornerPt.y);
                ctx.stroke();
              }
            });
            ctx.restore();
          }
        }

        // Camera Mounting Pole
        if (groundPt.visible && lensPt.visible) {
          ctx.beginPath();
          ctx.moveTo(groundPt.x, groundPt.y);
          ctx.lineTo(lensPt.x, lensPt.y);
          ctx.strokeStyle = isSelected ? '#60a5fa' : '#94a3b8';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          // Pole ground base circle
          ctx.beginPath();
          ctx.arc(groundPt.x, groundPt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#64748b';
          ctx.fill();
        }

        // Heading Direction Arrow
        if (lensPt.visible) {
          const arrowLen = 22;
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
          ctx.lineTo(endX - 7 * Math.cos(rad - tipAngle), endY - 7 * Math.sin(rad - tipAngle));
          ctx.lineTo(endX - 7 * Math.cos(rad + tipAngle), endY - 7 * Math.sin(rad + tipAngle));
          ctx.closePath();
          ctx.fillStyle = cam.color || '#3b82f6';
          ctx.fill();
        }

        // Camera Badge / Marker
        if (lensPt.visible) {
          const markerRadius = isSelected ? 12 : 9;

          // Selection glow
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(lensPt.x, lensPt.y, markerRadius + 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fill();
          }

          // Marker circle
          ctx.beginPath();
          ctx.arc(lensPt.x, lensPt.y, markerRadius, 0, Math.PI * 2);
          ctx.fillStyle = cam.color || '#3b82f6';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Camera label
          ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.lineWidth = 3;
          const labelText = `${cam.name} (${cam.mountingHeight}m)`;
          ctx.strokeText(labelText, lensPt.x, lensPt.y - markerRadius - 4);
          ctx.fillText(labelText, lensPt.x, lensPt.y - markerRadius - 4);
        }
      });

      // 3. Draw pairwise overlaps
      overlaps.forEach((ov) => {
        if (!ov.overlapPolygon || ov.overlapPolygon.length < 3) return;
        ctx.beginPath();
        let first = true;
        ov.overlapPolygon.forEach((v) => {
          const pt = projectPoint(v.latitude, v.longitude, 0);
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 4. Placement mode cursor & crosshair
      if (isPlacingCamera && mousePos) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        // Crosshair lines
        ctx.beginPath();
        ctx.moveTo(mousePos.x - 20, mousePos.y);
        ctx.lineTo(mousePos.x + 20, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - 20);
        ctx.lineTo(mousePos.x, mousePos.y + 20);
        ctx.stroke();

        // Crosshair circle
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.setLineDash([]);
        ctx.stroke();

        // Tooltip text
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        const tip = 'Click on map to drop camera';
        ctx.strokeText(tip, mousePos.x + 14, mousePos.y - 10);
        ctx.fillText(tip, mousePos.x + 14, mousePos.y - 10);

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
    isPlacingCamera,
    mousePos,
    projectPoint
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: isPlacingCamera ? 99990 : 100,
          pointerEvents: isPlacingCamera ? 'auto' : 'none',
          cursor: isPlacingCamera ? 'crosshair' : 'default'
        }}
      />

      {/* Placement Notice Banner */}
      {isPlacingCamera && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid #38bdf8',
            borderRadius: '24px',
            padding: '8px 18px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 99995,
            pointerEvents: 'auto'
          }}
        >
          <span>📍 Camera Placement Mode: Click anywhere on Earth or Maps</span>
          <button
            type="button"
            onClick={() => {
              const centerCoords = { latitude: mapState.centerLat, longitude: mapState.centerLon, elevation: 10 };
              const newCam = addCameraAtCoordinates(centerCoords, VERIFIED_CAMERA_MODELS[0]);
              selectCamera(newCam.id);
              setIsPlacingCamera(false);
            }}
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Drop at View Center
          </button>
          <button
            type="button"
            onClick={() => setIsPlacingCamera(false)}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
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
