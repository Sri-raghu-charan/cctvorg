/**
 * Spatial Analysis Engine: Overlaps, Blind Spots, and Multi-Camera Coverage
 */

import {
  polygon as turfPolygon,
  intersect as turfIntersect,
  area as turfArea,
  union as turfUnion,
  difference as turfDifference,
  featureCollection as turfFeatureCollection
} from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';
import {
  BlindSpotAnalysisResult,
  Camera,
  FootprintGeometry,
  FootprintVertex,
  OverlapResult,
  PlanningPerimeter
} from '../types/camera';

/**
 * Converts FootprintVertex array into Turf.js Polygon feature
 */
export function verticesToTurfPolygon(
  vertices: FootprintVertex[]
): Feature<Polygon> | null {
  if (!vertices || vertices.length < 3) return null;

  const ring = vertices.map((v) => [v.longitude, v.latitude]);
  // Ensure closure
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  if (ring.length < 4) return null;

  try {
    return turfPolygon([ring]);
  } catch {
    return null;
  }
}

/**
 * Converts Turf.js coordinates to FootprintVertex array
 */
function turfCoordsToVertices(coords: Position[]): FootprintVertex[] {
  return coords.map(([lon, lat]) => ({
    latitude: Number(lat.toFixed(8)),
    longitude: Number(lon.toFixed(8))
  }));
}

/**
 * Computes pairwise coverage overlap between multiple cameras
 */
export function analyzeOverlaps(
  cameras: Camera[],
  footprints: Map<string, FootprintGeometry>
): OverlapResult[] {
  const results: OverlapResult[] = [];
  const activeCameras = cameras.filter((c) => c.visible);

  for (let i = 0; i < activeCameras.length; i++) {
    for (let j = i + 1; j < activeCameras.length; j++) {
      const cam1 = activeCameras[i];
      const cam2 = activeCameras[j];

      const fp1 = footprints.get(cam1.id);
      const fp2 = footprints.get(cam2.id);

      if (!fp1 || !fp2) continue;

      const poly1 = verticesToTurfPolygon(fp1.coordinates);
      const poly2 = verticesToTurfPolygon(fp2.coordinates);

      if (!poly1 || !poly2) continue;

      try {
        const intersection = turfIntersect(turfFeatureCollection([poly1, poly2]));
        if (intersection && (intersection.geometry.type === 'Polygon' || intersection.geometry.type === 'MultiPolygon')) {
          const areaM2 = Number(turfArea(intersection).toFixed(2));
          if (areaM2 > 0.5) {
            let vertices: FootprintVertex[] = [];
            if (intersection.geometry.type === 'Polygon') {
              vertices = turfCoordsToVertices(intersection.geometry.coordinates[0]);
            } else if (intersection.geometry.type === 'MultiPolygon') {
              vertices = turfCoordsToVertices(intersection.geometry.coordinates[0][0]);
            }

            results.push({
              cameraIds: [cam1.id, cam2.id],
              overlapAreaM2: areaM2,
              overlapPolygon: vertices
            });
          }
        }
      } catch (err) {
        console.warn('Overlap intersection calculation error:', err);
      }
    }
  }

  return results;
}

/**
 * Computes blind-spot (unmonitored) areas within a user-defined planning perimeter
 */
export function analyzeBlindSpots(
  perimeter: PlanningPerimeter,
  cameras: Camera[],
  footprints: Map<string, FootprintGeometry>
): BlindSpotAnalysisResult {
  const perimeterPoly = verticesToTurfPolygon(perimeter.coordinates);
  if (!perimeterPoly) {
    return {
      perimeterAreaM2: 0,
      coveredAreaM2: 0,
      coveragePercentage: 0,
      blindSpotAreaM2: 0,
      blindSpotPolygons: []
    };
  }

  const perimeterAreaM2 = Number(turfArea(perimeterPoly).toFixed(2));
  const activeFootprints: Feature<Polygon>[] = [];

  for (const cam of cameras) {
    if (!cam.visible) continue;
    const fp = footprints.get(cam.id);
    if (!fp) continue;
    const poly = verticesToTurfPolygon(fp.coordinates);
    if (poly) activeFootprints.push(poly);
  }

  if (activeFootprints.length === 0) {
    return {
      perimeterAreaM2,
      coveredAreaM2: 0,
      coveragePercentage: 0,
      blindSpotAreaM2: perimeterAreaM2,
      blindSpotPolygons: [perimeter.coordinates]
    };
  }

  try {
    // Union all camera footprints
    let unionCoverage: any = activeFootprints[0];
    for (let i = 1; i < activeFootprints.length; i++) {
      const u = turfUnion(turfFeatureCollection([unionCoverage, activeFootprints[i]]));
      if (u) {
        unionCoverage = u;
      }
    }

    // Clip coverage by perimeter
    const effectiveCoverage = turfIntersect(turfFeatureCollection([perimeterPoly, unionCoverage]));
    const coveredAreaM2 = effectiveCoverage ? Number(turfArea(effectiveCoverage).toFixed(2)) : 0;
    const coveragePercentage = perimeterAreaM2 > 0 ? Number(((coveredAreaM2 / perimeterAreaM2) * 100).toFixed(1)) : 0;
    const blindSpotAreaM2 = Number(Math.max(0, perimeterAreaM2 - coveredAreaM2).toFixed(2));

    // Difference between perimeter and coverage
    const difference = turfDifference(turfFeatureCollection([perimeterPoly, unionCoverage]));
    const blindSpotPolygons: FootprintVertex[][] = [];

    if (difference) {
      if (difference.geometry.type === 'Polygon') {
        blindSpotPolygons.push(turfCoordsToVertices(difference.geometry.coordinates[0]));
      } else if (difference.geometry.type === 'MultiPolygon') {
        for (const polyCoords of difference.geometry.coordinates) {
          blindSpotPolygons.push(turfCoordsToVertices(polyCoords[0]));
        }
      }
    }

    return {
      perimeterAreaM2,
      coveredAreaM2,
      coveragePercentage,
      blindSpotAreaM2,
      blindSpotPolygons
    };
  } catch (err) {
    console.warn('Blind spot spatial difference error:', err);
    return {
      perimeterAreaM2,
      coveredAreaM2: 0,
      coveragePercentage: 0,
      blindSpotAreaM2: perimeterAreaM2,
      blindSpotPolygons: [perimeter.coordinates]
    };
  }
}
