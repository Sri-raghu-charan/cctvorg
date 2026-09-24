import { describe, it, expect } from 'vitest';
import {
  projectGoogleEarthToScreen,
  projectGoogleMapsToScreen,
  unprojectGoogleMapsScreen,
  unprojectGoogleEarthScreen,
  GoogleEarthViewState,
  GoogleMapsViewState,
  ViewportSize
} from '../projection';

describe('Geospatial Projection Engine', () => {
  const viewport: ViewportSize = { width: 1200, height: 800 };

  describe('Google Maps Web Mercator Projection', () => {
    const mapsView: GoogleMapsViewState = {
      latitude: 40.7580,
      longitude: -73.9855,
      zoom: 18
    };

    it('projects center coordinates exactly to the center of the viewport', () => {
      const pt = projectGoogleMapsToScreen(
        mapsView.latitude,
        mapsView.longitude,
        mapsView,
        viewport
      );

      expect(pt.x).toBeCloseTo(viewport.width / 2, 0);
      expect(pt.y).toBeCloseTo(viewport.height / 2, 0);
      expect(pt.visible).toBe(true);
    });

    it('projects eastward coordinates to the right of center', () => {
      // Small delta East
      const ptEast = projectGoogleMapsToScreen(
        mapsView.latitude,
        mapsView.longitude + 0.001,
        mapsView,
        viewport
      );

      expect(ptEast.x).toBeGreaterThan(viewport.width / 2);
      expect(ptEast.y).toBeCloseTo(viewport.height / 2, 0);
    });

    it('projects northward coordinates above center (smaller Y)', () => {
      // Small delta North
      const ptNorth = projectGoogleMapsToScreen(
        mapsView.latitude + 0.001,
        mapsView.longitude,
        mapsView,
        viewport
      );

      expect(ptNorth.y).toBeLessThan(viewport.height / 2);
      expect(ptNorth.x).toBeCloseTo(viewport.width / 2, 0);
    });

    it('accurately unprojects screen center back to geographic center coordinates', () => {
      const unprojected = unprojectGoogleMapsScreen(
        viewport.width / 2,
        viewport.height / 2,
        mapsView,
        viewport
      );

      expect(unprojected.latitude).toBeCloseTo(mapsView.latitude, 5);
      expect(unprojected.longitude).toBeCloseTo(mapsView.longitude, 5);
    });
  });

  describe('Google Earth 3D Perspective Projection', () => {
    const earthView: GoogleEarthViewState = {
      latitude: 40.7580,
      longitude: -73.9855,
      altitude: 500,
      distance: 500,
      pitch: 0, // Looking straight down / nadir
      heading: 0, // North up
      roll: 0
    };

    it('projects center ground coordinates to center of viewport in nadir view', () => {
      const pt = projectGoogleEarthToScreen(
        earthView.latitude,
        earthView.longitude,
        0,
        earthView,
        viewport
      );

      expect(pt.x).toBeCloseTo(viewport.width / 2, 0);
      expect(pt.y).toBeCloseTo(viewport.height / 2, 0);
      expect(pt.visible).toBe(true);
    });

    it('unprojects center screen back to earth view coordinates', () => {
      const unprojected = unprojectGoogleEarthScreen(
        viewport.width / 2,
        viewport.height / 2,
        earthView,
        viewport
      );

      expect(unprojected.latitude).toBeCloseTo(earthView.latitude, 5);
      expect(unprojected.longitude).toBeCloseTo(earthView.longitude, 5);
    });

    it('maintains strict zoom invariance when zooming out', () => {
      // Zoomed in view (dist = 300m)
      const zoomedInView: GoogleEarthViewState = {
        ...earthView,
        altitude: 0,
        distance: 300
      };

      // Zoomed out view (dist = 1500m, 5x farther)
      const zoomedOutView: GoogleEarthViewState = {
        ...earthView,
        altitude: 0,
        distance: 1500
      };

      // Target center point must stay precisely at screen center regardless of zoom
      const centerIn = projectGoogleEarthToScreen(earthView.latitude, earthView.longitude, 0, zoomedInView, viewport);
      const centerOut = projectGoogleEarthToScreen(earthView.latitude, earthView.longitude, 0, zoomedOutView, viewport);

      expect(centerIn.x).toBeCloseTo(viewport.width / 2, 0);
      expect(centerIn.y).toBeCloseTo(viewport.height / 2, 0);
      expect(centerOut.x).toBeCloseTo(viewport.width / 2, 0);
      expect(centerOut.y).toBeCloseTo(viewport.height / 2, 0);

      // Offset camera coordinate (e.g. 50m East)
      const offsetLat = earthView.latitude;
      const offsetLon = earthView.longitude + 0.0005;

      const ptIn = projectGoogleEarthToScreen(offsetLat, offsetLon, 0, zoomedInView, viewport);
      const ptOut = projectGoogleEarthToScreen(offsetLat, offsetLon, 0, zoomedOutView, viewport);

      // Distance from center on screen must scale inversely with camera distance:
      const dxIn = ptIn.x - (viewport.width / 2);
      const dxOut = ptOut.x - (viewport.width / 2);

      // Ratio of screen displacement should equal ratio of distances (300 / 1500 = 0.2)
      expect(dxOut / dxIn).toBeCloseTo(0.2, 1);
    });
  });
});
