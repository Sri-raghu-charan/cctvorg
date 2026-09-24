import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  BlindSpotAnalysisResult,
  Camera,
  Coordinates,
  FootprintGeometry,
  MovementDirection,
  MovementHistoryEntry,
  OverlapResult,
  PlanningPerimeter
} from '../types/camera';
import { VERIFIED_CAMERA_MODELS } from '../data/cameraModels';
import { computeCameraFootprint } from '../geo/frustum';
import { calculateDoriDistances } from '../geo/dori';
import { moveCamera, resetCameraToOriginal } from '../geo/movement';
import { normalizeHeading, computeBearing } from '../geo/coordinates';
import { analyzeBlindSpots, analyzeOverlaps } from '../geo/analysis';
import { storage } from '../services/storage';

export type BaseLayerType = 'satellite' | 'osm' | 'carto_dark' | 'carto_light';

export interface DoriLayerVisibility {
  identification: boolean;
  recognition: boolean;
  observation: boolean;
  detection: boolean;
  maxGeometric: boolean;
}

interface CctvContextType {
  cameras: Camera[];
  activeCameraId: string | null;
  activeCamera: Camera | null;
  footprints: Map<string, FootprintGeometry>;
  activeFootprint: FootprintGeometry | null;
  overlaps: OverlapResult[];
  planningPerimeter: PlanningPerimeter | null;
  blindSpotAnalysis: BlindSpotAnalysisResult | null;
  isPlacingCamera: boolean;
  isRelocatingCamera: boolean;
  isAimingCamera: boolean;
  doriLayers: DoriLayerVisibility;
  baseLayer: BaseLayerType;
  cesiumIonToken: string;
  historyStack: Map<string, MovementHistoryEntry[]>;

  // Actions
  setIsPlacingCamera: (val: boolean) => void;
  setIsRelocatingCamera: (val: boolean) => void;
  setIsAimingCamera: (val: boolean) => void;
  setBaseLayer: (layer: BaseLayerType) => void;
  setCesiumIonToken: (token: string) => void;
  setDoriLayers: React.Dispatch<React.SetStateAction<DoriLayerVisibility>>;
  selectCamera: (id: string | null) => void;
  addCameraAtCoordinates: (coords: Coordinates, specs?: any) => Camera;
  relocateCamera: (id: string, coords: Coordinates) => void;
  aimCameraAt: (id: string, targetCoords: Coordinates) => void;
  applyJunctionPreset: (id: string, presetName: JunctionPresetType) => void;
  updateCamera: (id: string, updates: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  duplicateCamera: (id: string) => void;
  toggleCameraVisibility: (id: string) => void;
  stepCamera: (id: string, direction: MovementDirection, distanceMeters: number) => void;
  rotateCamera: (id: string, newHeading: number) => void;
  undoMovement: (id: string) => void;
  resetToOriginal: (id: string) => void;
  setPlanningPerimeter: (perimeter: PlanningPerimeter | null) => void;
  exportProjectJson: () => string;
  exportProjectGeoJson: () => string;
  importProjectJson: (jsonString: string) => boolean;
  flyToTarget: Coordinates | null;
  setFlyToTarget: (target: Coordinates | null) => void;
}

export type JunctionPresetType = 'intersection' | 'approach' | 'tJunction' | 'roundabout';

export interface JunctionPreset {
  name: JunctionPresetType;
  label: string;
  description: string;
  rangeMeters: number;
  mountingHeight: number;
  tilt: number;
  hfov: number;
  vfov: number;
}

export const JUNCTION_PRESETS: Record<JunctionPresetType, JunctionPreset> = {
  intersection: {
    name: 'intersection',
    label: 'Intersection Overview',
    description: 'Wide coverage of 3/4-way junction, turn lanes & pedestrian crossings',
    rangeMeters: 32,
    mountingHeight: 6.0,
    tilt: 26,
    hfov: 95,
    vfov: 52
  },
  approach: {
    name: 'approach',
    label: 'Approach Lane Tracking',
    description: 'Focused view down approach street for vehicle & plate identification',
    rangeMeters: 45,
    mountingHeight: 6.0,
    tilt: 18,
    hfov: 60,
    vfov: 34
  },
  tJunction: {
    name: 'tJunction',
    label: 'T-Junction / Pedestrian Corner',
    description: 'Corner-mounted for high-res monitoring of side road turns & foot traffic',
    rangeMeters: 22,
    mountingHeight: 4.5,
    tilt: 32,
    hfov: 105,
    vfov: 58
  },
  roundabout: {
    name: 'roundabout',
    label: 'Roundabout Traffic Flow',
    description: 'Elevated wide angle overseeing circular entries, exits, and merges',
    rangeMeters: 38,
    mountingHeight: 6.5,
    tilt: 22,
    hfov: 80,
    vfov: 45
  }
};

const CctvContext = createContext<CctvContextType | null>(null);

const DEFAULT_CAMERA_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316'  // Orange
];

export const CctvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pre-populate with one realistic camera at a notable location (e.g. Times Square NYC)
  const initialCamera: Camera = {
    id: 'cam-initial-1',
    name: 'Main Plaza East Bullet',
    position: {
      latitude: 40.7580,
      longitude: -73.9855,
      elevation: 10
    },
    originalPosition: {
      latitude: 40.7580,
      longitude: -73.9855,
      elevation: 10
    },
    mountingHeight: 4.5, // 4.5 meters recommended
    heading: 0, // Facing North
    tilt: 22, // 22° depression angle
    rangeMeters: 77, // 77m verified datasheet optical detection reach
    specs: VERIFIED_CAMERA_MODELS[0], // Hikvision ColorVu Panoramic Turret
    visible: true,
    color: DEFAULT_CAMERA_COLORS[0]
  };

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isPlacingCamera, setIsPlacingCamera] = useState<boolean>(false);
  const [isRelocatingCamera, setIsRelocatingCamera] = useState<boolean>(false);
  const [isAimingCamera, setIsAimingCamera] = useState<boolean>(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayerType>('satellite');
  const [cesiumIonToken, setCesiumIonToken] = useState<string>('');
  const [flyToTarget, setFlyToTarget] = useState<Coordinates | null>(null);

  const [doriLayers, setDoriLayers] = useState<DoriLayerVisibility>({
    identification: true,
    recognition: true,
    observation: true,
    detection: true,
    maxGeometric: true
  });

  const [planningPerimeter, setPlanningPerimeter] = useState<PlanningPerimeter | null>(null);
  const [historyStack, setHistoryStack] = useState<Map<string, MovementHistoryEntry[]>>(new Map());
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Hydrate state from storage on mount
  useEffect(() => {
    let mounted = true;
    async function loadStoredData() {
      try {
        const storedCameras = await storage.get<Camera[]>('cctv_saved_cameras', [initialCamera]);
        const storedPerimeter = await storage.get<PlanningPerimeter | null>('cctv_planning_perimeter', null);
        const storedToken = await storage.get<string>('cctv_cesium_ion_token', '');
        
        if (mounted) {
          if (Array.isArray(storedCameras) && storedCameras.length > 0) {
            setCameras(storedCameras);
            setActiveCameraId(storedCameras[0].id);
          } else {
            setCameras([initialCamera]);
            setActiveCameraId(initialCamera.id);
          }
          if (storedPerimeter) {
            setPlanningPerimeter(storedPerimeter);
          }
          if (storedToken) {
            setCesiumIonToken(storedToken);
          }
          setIsHydrated(true);
        }
      } catch (e) {
        console.warn('Storage hydration error:', e);
        if (mounted) {
          setCameras([initialCamera]);
          setActiveCameraId(initialCamera.id);
          setIsHydrated(true);
        }
      }
    }
    loadStoredData();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist cameras when changed after hydration
  useEffect(() => {
    if (!isHydrated) return;
    storage.set('cctv_saved_cameras', cameras);
  }, [cameras, isHydrated]);

  // Persist planning perimeter when changed after hydration
  useEffect(() => {
    if (!isHydrated) return;
    storage.set('cctv_planning_perimeter', planningPerimeter);
  }, [planningPerimeter, isHydrated]);

  // Save Ion token to storage when changed
  useEffect(() => {
    if (cesiumIonToken) {
      storage.set('cctv_cesium_ion_token', cesiumIonToken);
    }
  }, [cesiumIonToken]);

  // Active Camera getter
  const activeCamera = useMemo(() => {
    return cameras.find((c) => c.id === activeCameraId) || null;
  }, [cameras, activeCameraId]);

  // Compute Footprints for all cameras
  const footprints = useMemo(() => {
    const map = new Map<string, FootprintGeometry>();

    for (const camera of cameras) {
      if (!camera.visible) continue;

      const doriDistances = calculateDoriDistances(
        camera.specs.resolutionWidth,
        camera.specs.selectedHfov,
        camera.rangeMeters
      );

      const fp = computeCameraFootprint(
        {
          latitude: camera.position.latitude,
          longitude: camera.position.longitude,
          mountingHeight: camera.mountingHeight,
          heading: camera.heading,
          tilt: camera.tilt,
          hfov: camera.specs.selectedHfov,
          vfov: camera.specs.selectedVfov,
          maxRangeMeters: camera.rangeMeters
        },
        doriDistances
      );

      map.set(camera.id, fp);
    }

    return map;
  }, [cameras]);

  const activeFootprint = useMemo(() => {
    if (!activeCameraId) return null;
    return footprints.get(activeCameraId) || null;
  }, [activeCameraId, footprints]);

  // Pairwise overlaps
  const overlaps = useMemo(() => {
    return analyzeOverlaps(cameras, footprints);
  }, [cameras, footprints]);

  // Blind spots
  const blindSpotAnalysis = useMemo(() => {
    if (!planningPerimeter) return null;
    return analyzeBlindSpots(planningPerimeter, cameras, footprints);
  }, [planningPerimeter, cameras, footprints]);

  // Select camera
  const selectCamera = useCallback((id: string | null) => {
    setActiveCameraId(id);
  }, []);

  // Add camera
  const addCameraAtCoordinates = useCallback(
    (coords: Coordinates, specs?: any): Camera => {
      const colorIndex = cameras.length % DEFAULT_CAMERA_COLORS.length;
      const cameraSpecs = specs || VERIFIED_CAMERA_MODELS[0];

      const newCamera: Camera = {
        id: `cam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Camera ${cameras.length + 1} (${cameraSpecs.modelName.split(' ')[0]})`,
        position: { ...coords },
        originalPosition: { ...coords },
        mountingHeight: cameraSpecs.recommendedHeight || 5.0,
        heading: 0,
        tilt: cameraSpecs.recommendedTilt || 25,
        rangeMeters: cameraSpecs.maxOpticalRangeMeters || 45,
        specs: cameraSpecs,
        visible: true,
        color: DEFAULT_CAMERA_COLORS[colorIndex]
      };

      setCameras((prev) => [...prev, newCamera]);
      setActiveCameraId(newCamera.id);
      setIsPlacingCamera(false);
      setIsRelocatingCamera(false);
      setIsAimingCamera(false);
      return newCamera;
    },
    [cameras]
  );

  // Relocate camera to target coordinates
  const relocateCamera = useCallback((id: string, coords: Coordinates) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, position: { ...coords } } : c))
    );
    setIsRelocatingCamera(false);
  }, []);

  // Aim camera at target coordinates
  const aimCameraAt = useCallback((id: string, targetCoords: Coordinates) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const bearing = computeBearing(
          c.position.latitude,
          c.position.longitude,
          targetCoords.latitude,
          targetCoords.longitude
        );
        return { ...c, heading: bearing };
      })
    );
    setIsAimingCamera(false);
  }, []);

  // Apply junction presets
  const applyJunctionPreset = useCallback((id: string, presetName: JunctionPresetType) => {
    const preset = JUNCTION_PRESETS[presetName];
    if (!preset) return;
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          rangeMeters: preset.rangeMeters,
          mountingHeight: preset.mountingHeight,
          tilt: preset.tilt,
          specs: {
            ...c.specs,
            selectedHfov: preset.hfov,
            selectedVfov: preset.vfov
          }
        };
      })
    );
  }, []);

  // Update camera
  const updateCamera = useCallback((id: string, updates: Partial<Camera>) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, ...updates };
      })
    );
  }, []);

  // Delete camera
  const deleteCamera = useCallback(
    (id: string) => {
      setCameras((prev) => prev.filter((c) => c.id !== id));
      if (activeCameraId === id) {
        const remaining = cameras.filter((c) => c.id !== id);
        setActiveCameraId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [activeCameraId, cameras]
  );

  // Duplicate camera
  const duplicateCamera = useCallback(
    (id: string) => {
      const source = cameras.find((c) => c.id === id);
      if (!source) return;

      const colorIndex = (cameras.length + 1) % DEFAULT_CAMERA_COLORS.length;
      const copy: Camera = {
        ...source,
        id: `cam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: `${source.name} (Copy)`,
        color: DEFAULT_CAMERA_COLORS[colorIndex]
      };

      setCameras((prev) => [...prev, copy]);
      setActiveCameraId(copy.id);
    },
    [cameras]
  );

  // Toggle visibility
  const toggleCameraVisibility = useCallback((id: string) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  // Step camera by ground distance
  const stepCamera = useCallback(
    (id: string, direction: MovementDirection, distanceMeters: number) => {
      const targetCam = cameras.find((c) => c.id === id);
      if (!targetCam) return;

      const { newPosition, entry } = moveCamera(targetCam, direction, distanceMeters);

      setCameras((prev) =>
        prev.map((c) => (c.id === id ? { ...c, position: newPosition } : c))
      );

      // Record to history stack
      setHistoryStack((prev) => {
        const copy = new Map(prev);
        const existing = copy.get(id) || [];
        copy.set(id, [...existing, entry]);
        return copy;
      });
    },
    [cameras]
  );

  // Rotate camera heading
  const rotateCamera = useCallback((id: string, newHeading: number) => {
    const normalized = normalizeHeading(newHeading);
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, heading: normalized } : c))
    );
  }, []);

  // Undo movement
  const undoMovement = useCallback((id: string) => {
    setHistoryStack((prev) => {
      const history = prev.get(id);
      if (!history || history.length === 0) return prev;

      const lastEntry = history[history.length - 1];
      const newHistory = history.slice(0, -1);

      setCameras((camList) =>
        camList.map((c) =>
          c.id === id
            ? {
                ...c,
                position: { ...lastEntry.cameraPosition }
              }
            : c
        )
      );

      const copy = new Map(prev);
      copy.set(id, newHistory);
      return copy;
    });
  }, []);

  // Reset to original position
  const resetToOriginal = useCallback(
    (id: string) => {
      const targetCam = cameras.find((c) => c.id === id);
      if (!targetCam) return;

      const originalCoords = resetCameraToOriginal(targetCam);

      setCameras((prev) =>
        prev.map((c) => (c.id === id ? { ...c, position: originalCoords } : c))
      );

      // Clear history stack for this camera
      setHistoryStack((prev) => {
        const copy = new Map(prev);
        copy.delete(id);
        return copy;
      });
    },
    [cameras]
  );

  // Project Export as JSON
  const exportProjectJson = useCallback(() => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      cameras,
      planningPerimeter
    };
    return JSON.stringify(data, null, 2);
  }, [cameras, planningPerimeter]);

  // Project Export as GeoJSON
  const exportProjectGeoJson = useCallback(() => {
    const features: any[] = [];

    cameras.forEach((cam) => {
      // Camera Point Feature
      features.push({
        type: 'Feature',
        id: cam.id,
        geometry: {
          type: 'Point',
          coordinates: [cam.position.longitude, cam.position.latitude, cam.position.elevation]
        },
        properties: {
          type: 'camera_pole',
          name: cam.name,
          model: cam.specs.modelName,
          manufacturer: cam.specs.manufacturer,
          heading: cam.heading,
          tilt: cam.tilt,
          mountingHeight: cam.mountingHeight,
          rangeMeters: cam.rangeMeters
        }
      });

      // Frustum Polygon Feature
      const fp = footprints.get(cam.id);
      if (fp && fp.coordinates.length >= 4) {
        features.push({
          type: 'Feature',
          id: `${cam.id}-footprint`,
          geometry: {
            type: 'Polygon',
            coordinates: [fp.coordinates.map((pt) => [pt.longitude, pt.latitude])]
          },
          properties: {
            type: 'coverage_footprint',
            cameraId: cam.id,
            cameraName: cam.name,
            nearDistanceMeters: fp.nearDistanceMeters,
            farDistanceMeters: fp.farDistanceMeters,
            areaM2: fp.totalAreaM2
          }
        });
      }
    });

    return JSON.stringify(
      {
        type: 'FeatureCollection',
        features
      },
      null,
      2
    );
  }, [cameras, footprints]);

  // Import Project JSON
  const importProjectJson = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.cameras)) {
        setCameras(data.cameras);
        if (data.cameras.length > 0) {
          setActiveCameraId(data.cameras[0].id);
          setFlyToTarget(data.cameras[0].position);
        }
      }
      if (data.planningPerimeter) {
        setPlanningPerimeter(data.planningPerimeter);
      }
      return true;
    } catch (err) {
      console.error('Failed to import project JSON:', err);
      return false;
    }
  }, []);

  return (
    <CctvContext.Provider
      value={{
        cameras,
        activeCameraId,
        activeCamera,
        footprints,
        activeFootprint,
        overlaps,
        planningPerimeter,
        blindSpotAnalysis,
        isPlacingCamera,
        isRelocatingCamera,
        isAimingCamera,
        doriLayers,
        baseLayer,
        cesiumIonToken,
        historyStack,
        setIsPlacingCamera,
        setIsRelocatingCamera,
        setIsAimingCamera,
        setBaseLayer,
        setCesiumIonToken,
        setDoriLayers,
        selectCamera,
        addCameraAtCoordinates,
        relocateCamera,
        aimCameraAt,
        applyJunctionPreset,
        updateCamera,
        deleteCamera,
        duplicateCamera,
        toggleCameraVisibility,
        stepCamera,
        rotateCamera,
        undoMovement,
        resetToOriginal,
        setPlanningPerimeter,
        exportProjectJson,
        exportProjectGeoJson,
        importProjectJson,
        flyToTarget,
        setFlyToTarget
      }}
    >
      {children}
    </CctvContext.Provider>
  );
};

export const useCctv = (): CctvContextType => {
  const context = useContext(CctvContext);
  if (!context) {
    throw new Error('useCctv must be used within a CctvProvider');
  }
  return context;
};
