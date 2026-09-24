/**
 * Ground-Distance Camera Movement Engine
 * Moves a camera along its local coordinate frame using exact geodetic bearings and ground distances.
 */

import { Camera, Coordinates, MovementDirection, MovementHistoryEntry } from '../types/camera';
import { computeDestination, getMovementBearing } from './coordinates';

export const STANDARD_STEP_SIZES = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0] as const;

/**
 * Moves camera by ground distance along relative direction (forward, backward, left, right)
 */
export function moveCamera(
  camera: Camera,
  direction: MovementDirection,
  distanceMeters: number
): { newPosition: Coordinates; entry: MovementHistoryEntry } {
  const bearing = getMovementBearing(camera.heading, direction);
  const dest = computeDestination(
    camera.position.latitude,
    camera.position.longitude,
    bearing,
    distanceMeters
  );

  const newPosition: Coordinates = {
    latitude: dest.latitude,
    longitude: dest.longitude,
    elevation: camera.position.elevation // Preserve consistent elevation
  };

  const entry: MovementHistoryEntry = {
    cameraPosition: { ...camera.position },
    heading: camera.heading,
    timestamp: Date.now()
  };

  return { newPosition, entry };
}

/**
 * Resets camera coordinates back to its initial placement position
 */
export function resetCameraToOriginal(camera: Camera): Coordinates {
  return {
    latitude: camera.originalPosition.latitude,
    longitude: camera.originalPosition.longitude,
    elevation: camera.originalPosition.elevation
  };
}
