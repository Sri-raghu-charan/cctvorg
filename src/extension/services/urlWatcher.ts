/**
 * Real-time URL and View State Watcher for Google Earth and Google Maps.
 * Detects host, parses live camera perspective / zoom, and notifies subscribers.
 */

import { GoogleEarthViewState, GoogleMapsViewState } from '../../geo/projection';

export type MapPlatform = 'earth' | 'maps' | 'standalone';

export interface CurrentMapState {
  platform: MapPlatform;
  earthView?: GoogleEarthViewState;
  mapsView?: GoogleMapsViewState;
  centerLat: number;
  centerLon: number;
  altitudeOrZoom: number;
}

export type ViewStateListener = (state: CurrentMapState) => void;

class MapUrlWatcher {
  private listeners: Set<ViewStateListener> = new Set();
  private lastHref: string = '';
  private pollInterval: number | null = null;
  private currentState: CurrentMapState;

  constructor() {
    this.currentState = this.parseCurrentUrl();
    this.startWatching();
  }

  public getState(): CurrentMapState {
    return this.currentState;
  }

  public subscribe(listener: ViewStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private startWatching(): void {
    this.lastHref = typeof window !== 'undefined' ? window.location.href : '';

    const checkUpdate = () => {
      if (typeof window === 'undefined') return;
      const currentHref = window.location.href;
      if (currentHref !== this.lastHref) {
        this.lastHref = currentHref;
        const newState = this.parseCurrentUrl();
        this.currentState = newState;
        this.notify();
      }
    };

    if (typeof window !== 'undefined') {
      // 1. Hook history.pushState and history.replaceState to capture camera URL updates with zero latency
      try {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
          originalPushState.apply(this, args);
          checkUpdate();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function (...args) {
          originalReplaceState.apply(this, args);
          checkUpdate();
        };
      } catch {
        // Ignored
      }

      window.addEventListener('popstate', checkUpdate);
      window.addEventListener('hashchange', checkUpdate);

      // Fast check during user interaction (wheel, pointer drag)
      window.addEventListener('wheel', () => requestAnimationFrame(checkUpdate), { passive: true });
      window.addEventListener('pointerup', () => {
        requestAnimationFrame(checkUpdate);
        setTimeout(checkUpdate, 50);
        setTimeout(checkUpdate, 150);
        setTimeout(checkUpdate, 350);
      }, { passive: true });
      window.addEventListener('pointermove', (e) => {
        if (e.buttons > 0) requestAnimationFrame(checkUpdate);
      }, { passive: true });

      // Fast interval check as fallback (30ms = ~33 fps)
      this.pollInterval = window.setInterval(checkUpdate, 30);
    }
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public parseCurrentUrl(): CurrentMapState {
    if (typeof window === 'undefined') {
      return {
        platform: 'standalone',
        centerLat: 40.7580,
        centerLon: -73.9855,
        altitudeOrZoom: 18
      };
    }

    const href = window.location.href;
    const hostname = window.location.hostname;

    // 1. Google Earth Web
    if (hostname.includes('earth.google.com') || window.location.pathname.includes('/earth')) {
      // Robust Google Earth URL parsing: @lat,lon followed by comma-separated tags
      // Syntax: @<lat>,<lon>,<alt>a,<dist>d,<fov>y,<heading>h,<tilt>t,<roll>r
      const earthMatch = href.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,([^/?#]+))?/);
      if (earthMatch) {
        const lat = parseFloat(earthMatch[1]);
        const lon = parseFloat(earthMatch[2]);
        const rest = earthMatch[3] || '';

        // Extract individual letter-tagged tokens
        const altMatch = rest.match(/(-?\d+\.?\d*)a/);
        const distMatch = rest.match(/(-?\d+\.?\d*)d/);
        const fovMatch = rest.match(/(-?\d+\.?\d*)y/);
        const headingMatch = rest.match(/(-?\d+\.?\d*)h/);
        const tiltMatch = rest.match(/(-?\d+\.?\d*)t/);
        const rollMatch = rest.match(/(-?\d+\.?\d*)r/);

        const altitude = altMatch ? parseFloat(altMatch[1]) : 0;
        const distance = distMatch ? parseFloat(distMatch[1]) : 1000;
        const fov = fovMatch ? parseFloat(fovMatch[1]) : 35;
        const heading = headingMatch ? parseFloat(headingMatch[1]) : 0;
        const pitch = tiltMatch ? parseFloat(tiltMatch[1]) : 0; // 't' is tilt in Google Earth
        const roll = rollMatch ? parseFloat(rollMatch[1]) : 0;

        const earthView: GoogleEarthViewState = {
          latitude: lat,
          longitude: lon,
          altitude,
          distance,
          fov: fov > 0 ? fov : 35,
          pitch,
          heading,
          roll
        };

        return {
          platform: 'earth',
          earthView,
          centerLat: lat,
          centerLon: lon,
          altitudeOrZoom: distance
        };
      }
    }

    // 2. Google Maps
    if (hostname.includes('google.com') && (window.location.pathname.includes('/maps') || hostname.includes('maps.google.com'))) {
      const mapsRegex = /@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)z/;
      const match = href.match(mapsRegex);

      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const zoom = parseFloat(match[3]);

        return {
          platform: 'maps',
          mapsView: {
            latitude: lat,
            longitude: lon,
            zoom
          },
          centerLat: lat,
          centerLon: lon,
          altitudeOrZoom: zoom
        };
      }

      // Google Maps with 3D bearing and tilt: @lat,lon,zoom z,data=...
      const simpleMaps = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
      const simpleMatch = href.match(simpleMaps);
      if (simpleMatch) {
        const lat = parseFloat(simpleMatch[1]);
        const lon = parseFloat(simpleMatch[2]);
        return {
          platform: 'maps',
          mapsView: {
            latitude: lat,
            longitude: lon,
            zoom: 17
          },
          centerLat: lat,
          centerLon: lon,
          altitudeOrZoom: 17
        };
      }
    }

    // 3. Standalone / Dev Server
    return {
      platform: 'standalone',
      centerLat: 40.7580,
      centerLon: -73.9855,
      altitudeOrZoom: 18,
      mapsView: {
        latitude: 40.7580,
        longitude: -73.9855,
        zoom: 18
      }
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('URL listener error:', err);
      }
    }
  }
}

export const urlWatcher = new MapUrlWatcher();
