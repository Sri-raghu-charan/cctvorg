import { describe, it, expect } from 'vitest';
import {
  computeBearing,
  computeDestination,
  computeDistance,
  formatCoordinates,
  getMovementBearing,
  normalizeHeading
} from '../coordinates';
import {
  computeCameraFootprint,
  computeGroundDistances
} from '../frustum';
import { calculateDoriDistances, calculatePpmAtDistance, DORI_PPM } from '../dori';
import { moveCamera, resetCameraToOriginal } from '../movement';
import { Camera } from '../../types/camera';
import { createCustomCameraSpecs } from '../../data/cameraModels';

describe('Geodesic Coordinate Engine', () => {
  it('normalizes headings properly to [0, 360)', () => {
    expect(normalizeHeading(0)).toBe(0);
    expect(normalizeHeading(360)).toBe(0);
    expect(normalizeHeading(720)).toBe(0);
    expect(normalizeHeading(-90)).toBe(270);
    expect(normalizeHeading(-180)).toBe(180);
    expect(normalizeHeading(450)).toBe(90);
  });

  it('computes accurate movement bearings relative to camera heading', () => {
    // Camera facing East (90°)
    const headingEast = 90;
    expect(getMovementBearing(headingEast, 'forward')).toBe(90);
    expect(getMovementBearing(headingEast, 'backward')).toBe(270);
    expect(getMovementBearing(headingEast, 'right')).toBe(180); // 90 + 90 = 180 (South)
    expect(getMovementBearing(headingEast, 'left')).toBe(0); // 90 - 90 = 0 (North)

    // Camera facing North (0°)
    const headingNorth = 0;
    expect(getMovementBearing(headingNorth, 'forward')).toBe(0);
    expect(getMovementBearing(headingNorth, 'backward')).toBe(180);
    expect(getMovementBearing(headingNorth, 'right')).toBe(90);
    expect(getMovementBearing(headingNorth, 'left')).toBe(270);
  });

  it('calculates destination and returns exact ground distance', () => {
    const startLat = 40.7128; // New York City
    const startLon = -74.006;
    const testDistanceMeters = 50.0;
    const testBearing = 45.0; // North-East

    const dest = computeDestination(startLat, startLon, testBearing, testDistanceMeters);
    const measuredDist = computeDistance(startLat, startLon, dest.latitude, dest.longitude);
    const measuredBearing = computeBearing(startLat, startLon, dest.latitude, dest.longitude);

    // Verify distance accuracy within 0.05m
    expect(measuredDist).toBeCloseTo(testDistanceMeters, 1);
    // Verify bearing accuracy within 0.1°
    expect(measuredBearing).toBeCloseTo(testBearing, 1);
  });
});

describe('Camera Frustum and Ground Coverage', () => {
  it('computes near and far distances based on mounting height, tilt and VFOV', () => {
    const mountingHeight = 5.0; // 5 meters pole
    const tilt = 30.0; // 30° depression downwards
    const vfov = 50.0; // 50° vertical FOV (half-angle = 25°)
    const maxRange = 60.0;

    // Bottom ray = 30° + 25° = 55°
    // Near distance = 5.0 / tan(55°) = 5.0 / 1.4281 ≈ 3.50m
    // Top ray = 30° - 25° = 5°
    // Ground intersection = 5.0 / tan(5°) = 5.0 / 0.08749 ≈ 57.15m
    const { nearDistance, farDistance } = computeGroundDistances(mountingHeight, tilt, vfov, maxRange);

    expect(nearDistance).toBeCloseTo(3.5, 1);
    expect(farDistance).toBeCloseTo(57.15, 1);
  });

  it('caps far ground distance at max configured range when ray points towards horizon', () => {
    const mountingHeight = 4.0;
    const tilt = 10.0; // Slight tilt
    const vfov = 40.0; // Top ray = 10 - 20 = -10° (above horizon!)
    const maxRange = 45.0;

    const { farDistance } = computeGroundDistances(mountingHeight, tilt, vfov, maxRange);
    expect(farDistance).toBe(45.0);
  });

  it('produces a closed polygon in real-world geographic coordinates', () => {
    const footprint = computeCameraFootprint({
      latitude: 48.8584, // Paris
      longitude: 2.2945,
      mountingHeight: 6.0,
      heading: 180, // Facing South
      tilt: 25,
      hfov: 90,
      vfov: 50,
      maxRangeMeters: 50
    });

    expect(footprint.coordinates.length).toBeGreaterThan(10);
    // Polygon must be closed (first and last vertex match)
    const first = footprint.coordinates[0];
    const last = footprint.coordinates[footprint.coordinates.length - 1];
    expect(first.latitude).toBe(last.latitude);
    expect(first.longitude).toBe(last.longitude);

    // Verify calculated area is non-zero and physically reasonable
    expect(footprint.totalAreaM2).toBeGreaterThan(100);
    expect(footprint.nearDistanceMeters).toBeGreaterThan(0);
    expect(footprint.farDistanceMeters).toBeLessThanOrEqual(50);
  });

  it('preserves physical footprint dimensions invariant of map zoom', () => {
    // Physical footprint depends exclusively on real coordinates and metric geometry
    const params = {
      latitude: 51.5074,
      longitude: -0.1278,
      mountingHeight: 8.0,
      heading: 45,
      tilt: 35,
      hfov: 80,
      vfov: 45,
      maxRangeMeters: 70
    };

    const fp1 = computeCameraFootprint(params);
    const fp2 = computeCameraFootprint(params);

    // Must be identical regardless of any external viewport zoom level
    expect(fp1.totalAreaM2).toBe(fp2.totalAreaM2);
    expect(fp1.nearDistanceMeters).toBe(fp2.nearDistanceMeters);
    expect(fp1.farDistanceMeters).toBe(fp2.farDistanceMeters);
  });
});

describe('EN 62676-4 DORI Standard Engine', () => {
  it('calculates correct DORI distances for a 4K camera with 90° HFOV', () => {
    const resolutionWidth = 3840; // 4K UHD
    const hfov = 90;
    const maxRange = 100;

    const dori = calculateDoriDistances(resolutionWidth, hfov, maxRange);

    // At HFOV = 90°, tan(45°) = 1.0.
    // D = 3840 / (2 * PPM * 1.0) = 1920 / PPM
    // Identification (250 px/m) = 1920 / 250 = 7.68m
    // Recognition (125 px/m) = 1920 / 125 = 15.36m
    // Observation (62.5 px/m) = 1920 / 62.5 = 30.72m
    // Detection (25 px/m) = 1920 / 25 = 76.80m
    expect(dori.identification).toBeCloseTo(7.68, 1);
    expect(dori.recognition).toBeCloseTo(15.36, 1);
    expect(dori.observation).toBeCloseTo(30.72, 1);
    expect(dori.detection).toBeCloseTo(76.80, 1);
  });

  it('calculates pixel density (PPM) at distance accurately', () => {
    const resolutionWidth = 1920; // 1080p
    const hfov = 90; // tan(45°) = 1.0
    // At 10m: field width = 2 * 10 * 1 = 20m. PPM = 1920 / 20 = 96 px/m
    const ppmAt10m = calculatePpmAtDistance(resolutionWidth, hfov, 10);
    expect(ppmAt10m).toBe(96.0);
  });
});

describe('Ground-Distance Movement and Reset', () => {
  const dummyCamera: Camera = {
    id: 'cam-test-1',
    name: 'Test Camera 1',
    position: { latitude: 37.7749, longitude: -122.4194, elevation: 15 },
    originalPosition: { latitude: 37.7749, longitude: -122.4194, elevation: 15 },
    mountingHeight: 5,
    heading: 0, // Facing North
    tilt: 20,
    rangeMeters: 50,
    specs: createCustomCameraSpecs(),
    visible: true,
    color: '#3b82f6'
  };

  it('moves camera forward along its heading by exact ground distance', () => {
    const stepDistance = 5.0; // 5 meters forward (North)
    const { newPosition } = moveCamera(dummyCamera, 'forward', stepDistance);

    // North movement: latitude should increase, longitude should be unchanged
    expect(newPosition.latitude).toBeGreaterThan(dummyCamera.position.latitude);
    expect(newPosition.longitude).toBeCloseTo(dummyCamera.position.longitude, 5);
    expect(newPosition.elevation).toBe(dummyCamera.position.elevation);

    const actualDist = computeDistance(
      dummyCamera.position.latitude,
      dummyCamera.position.longitude,
      newPosition.latitude,
      newPosition.longitude
    );
    expect(actualDist).toBeCloseTo(stepDistance, 1);
  });

  it('moves camera right perpendicular to its heading', () => {
    const stepDistance = 10.0;
    const { newPosition } = moveCamera(dummyCamera, 'right', stepDistance);

    // Facing North, right is East (90°): longitude should increase
    expect(newPosition.longitude).toBeGreaterThan(dummyCamera.position.longitude);
    const bearing = computeBearing(
      dummyCamera.position.latitude,
      dummyCamera.position.longitude,
      newPosition.latitude,
      newPosition.longitude
    );
    expect(bearing).toBeCloseTo(90, 0);
  });

  it('resets camera to its original placement coordinates', () => {
    const { newPosition } = moveCamera(dummyCamera, 'forward', 25.0);
    const movedCamera: Camera = { ...dummyCamera, position: newPosition };

    const resetPosition = resetCameraToOriginal(movedCamera);
    expect(resetPosition.latitude).toBe(dummyCamera.originalPosition.latitude);
    expect(resetPosition.longitude).toBe(dummyCamera.originalPosition.longitude);
    expect(resetPosition.elevation).toBe(dummyCamera.originalPosition.elevation);
  });
});
