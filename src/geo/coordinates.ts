/**
 * Geodetic and Coordinate Transformation Utilities
 * Uses WGS84 mean earth radius (6,371,008.8 meters) for high-accuracy spherical geodesy.
 */

import { Coordinates, MovementDirection } from '../types/camera';

export const EARTH_RADIUS_METERS = 6371008.8;

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

/**
 * Normalizes any heading or bearing to the range [0, 360)
 */
export function normalizeHeading(angleDeg: number): number {
  let normalized = angleDeg % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized === 360 ? 0 : normalized;
}

/**
 * Computes destination point given start point, initial bearing (degrees), and distance (meters)
 * Based on high-precision spherical geodesy.
 */
export function computeDestination(
  startLat: number,
  startLon: number,
  bearingDeg: number,
  distanceMeters: number
): { latitude: number; longitude: number } {
  if (distanceMeters === 0) {
    return { latitude: startLat, longitude: startLon };
  }

  const δ = distanceMeters / EARTH_RADIUS_METERS; // angular distance in radians
  const θ = normalizeHeading(bearingDeg) * TO_RAD;

  const φ1 = startLat * TO_RAD;
  const λ1 = startLon * TO_RAD;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));

  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * Math.sin(φ2);
  const λ2 = λ1 + Math.atan2(y, x);

  // Normalize longitude to [-180, 180]
  const lonDeg = ((λ2 * TO_DEG + 540) % 360) - 180;
  const latDeg = φ2 * TO_DEG;

  return {
    latitude: Number(latDeg.toFixed(8)),
    longitude: Number(lonDeg.toFixed(8))
  };
}

/**
 * Computes great-circle ground distance between two geographic coordinates in meters
 */
export function computeDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = lat1 * TO_RAD;
  const φ2 = lat2 * TO_RAD;
  const Δφ = (lat2 - lat1) * TO_RAD;
  const Δλ = (lon2 - lon1) * TO_RAD;

  const sinΔφ2 = Math.sin(Δφ / 2);
  const sinΔλ2 = Math.sin(Δλ / 2);

  const a = sinΔφ2 * sinΔφ2 + Math.cos(φ1) * Math.cos(φ2) * sinΔλ2 * sinΔλ2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes the initial bearing (forward azimuth) from point 1 to point 2 in degrees [0, 360)
 */
export function computeBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = lat1 * TO_RAD;
  const φ2 = lat2 * TO_RAD;
  const Δλ = (lon2 - lon1) * TO_RAD;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return normalizeHeading(θ * TO_DEG);
}

/**
 * Resolves movement bearing given camera heading and cardinal direction:
 * - forward: camera heading θ
 * - backward: θ + 180°
 * - right: θ + 90°
 * - left: θ - 90° (or + 270°)
 */
export function getMovementBearing(heading: number, direction: MovementDirection): number {
  switch (direction) {
    case 'forward':
      return normalizeHeading(heading);
    case 'backward':
      return normalizeHeading(heading + 180);
    case 'right':
      return normalizeHeading(heading + 90);
    case 'left':
      return normalizeHeading(heading + 270);
  }
}

/**
 * Format coordinates to high-precision readable string
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
}
