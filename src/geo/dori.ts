/**
 * EN 62676-4 Standard DORI (Detection, Observation, Recognition, Identification) Engine
 *
 * Sourced from International Standard IEC / EN 62676-4:
 * - Identification: 250 px/m (Positive identification beyond reasonable doubt)
 * - Recognition: 125 px/m (High certainty identification of known individual)
 * - Observation: 62.5 px/m (Characteristic details like clothing)
 * - Detection: 25 px/m (Reliable human presence detection)
 */

import { DoriDistances } from '../types/camera';

export const DORI_PPM = {
  IDENTIFICATION: 250, // pixels per meter
  RECOGNITION: 125,
  OBSERVATION: 62.5,
  DETECTION: 25
} as const;

export const DORI_COLORS = {
  IDENTIFICATION: '#ef4444', // Red / Crimson
  RECOGNITION: '#f59e0b', // Amber / Orange
  OBSERVATION: '#eab308', // Yellow
  DETECTION: '#10b981', // Emerald / Green
  GEOMETRIC_MAX: '#3b82f6' // Blue / Slate
} as const;

const TO_RAD = Math.PI / 180;

/**
 * Calculates standard DORI distances for a given camera resolution and horizontal FOV
 */
export function calculateDoriDistances(
  resolutionWidth: number,
  hfovDeg: number,
  maxConfiguredRangeMeters: number
): DoriDistances {
  const halfHfovRad = (Math.max(5, Math.min(170, hfovDeg)) / 2) * TO_RAD;
  const tanHalfHfov = Math.tan(halfHfovRad);

  if (tanHalfHfov <= 0 || resolutionWidth <= 0) {
    return {
      identification: 0,
      recognition: 0,
      observation: 0,
      detection: 0,
      maxGeometric: maxConfiguredRangeMeters
    };
  }

  // D = W_pixels / (2 * PPM * tan(HFOV / 2))
  const calcDist = (ppm: number): number => {
    const d = resolutionWidth / (2 * ppm * tanHalfHfov);
    return Number(Math.min(maxConfiguredRangeMeters, Math.max(0, d)).toFixed(2));
  };

  const id = calcDist(DORI_PPM.IDENTIFICATION);
  const rec = calcDist(DORI_PPM.RECOGNITION);
  const obs = calcDist(DORI_PPM.OBSERVATION);
  const det = calcDist(DORI_PPM.DETECTION);

  return {
    identification: id,
    recognition: rec,
    observation: obs,
    detection: det,
    maxGeometric: maxConfiguredRangeMeters
  };
}

/**
 * Computes pixels per meter at a specific ground distance
 */
export function calculatePpmAtDistance(
  resolutionWidth: number,
  hfovDeg: number,
  distanceMeters: number
): number {
  if (distanceMeters <= 0) return Infinity;
  const halfHfovRad = (hfovDeg / 2) * TO_RAD;
  const fieldWidth = 2 * distanceMeters * Math.tan(halfHfovRad);
  return Number((resolutionWidth / fieldWidth).toFixed(1));
}
