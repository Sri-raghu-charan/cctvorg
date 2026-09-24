import React, { useState } from 'react';
import { useCctv } from '../../context/CctvContext';
import {
  Search,
  MapPin,
  Navigation,
  Plus,
  Loader2,
  Globe2,
  X
} from 'lucide-react';
import { VERIFIED_CAMERA_MODELS } from '../../data/cameraModels';

interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    city?: string;
    town?: string;
    country?: string;
    state?: string;
  };
}

export const PlaceSearchPanel: React.FC = () => {
  const { setFlyToTarget, addCameraAtCoordinates, selectCamera } = useCctv();

  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Coordinates Input
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLon, setManualLon] = useState<string>('');
  const [manualAlt, setManualAlt] = useState<string>('200');

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    // Check if query is direct lat, lon coordinates (e.g. "48.8584, 2.2945")
    const coordMatch = searchTerm.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      if (!isNaN(lat) && !isNaN(lon)) {
        setFlyToTarget({ latitude: lat, longitude: lon, elevation: 250 });
        setResults([
          {
            place_id: 1,
            display_name: `Coordinates: ${lat.toFixed(6)}°, ${lon.toFixed(6)}°`,
            lat: lat.toString(),
            lon: lon.toString(),
            type: 'coordinate_point',
            class: 'coordinate'
          }
        ]);
        return;
      }
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm
        )}&addressdetails=1&limit=8`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data: PlaceResult[] = await response.json();
      if (data && data.length > 0) {
        setResults(data);
        // Automatically fly to the top match
        const top = data[0];
        setFlyToTarget({
          latitude: parseFloat(top.lat),
          longitude: parseFloat(top.lon),
          elevation: 250
        });
      } else {
        setResults([]);
        setSearchError('No matching places found. Try another city, address, or landmark.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Could not connect to geocoding service. Check your internet connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleFlyToResult = (result: PlaceResult) => {
    setFlyToTarget({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      elevation: 250
    });
  };

  const handlePlaceCameraAtResult = (result: PlaceResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setFlyToTarget({ latitude: lat, longitude: lon, elevation: 200 });

    const newCam = addCameraAtCoordinates(
      { latitude: lat, longitude: lon, elevation: 10 },
      VERIFIED_CAMERA_MODELS[0]
    );
    selectCamera(newCam.id);
  };

  const handleJumpToManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    const alt = parseFloat(manualAlt) || 200;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Please enter a valid Latitude between -90 and 90');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      alert('Please enter a valid Longitude between -180 and 180');
      return;
    }

    setFlyToTarget({ latitude: lat, longitude: lon, elevation: alt });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Search Bar Section */}
      <div className="card-section">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe2 size={14} style={{ color: 'var(--text-accent)' }} /> Search Any Place in the World
          </span>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '6px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              gap: '6px'
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              id="place-search-input"
              type="text"
              aria-label="Search any place, city, or landmark in the world"
              placeholder="e.g. Tokyo, Hyderabad, New York, Dubai..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search input"
                onClick={() => setQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 size={13} className="spin" /> : 'Search'}
          </button>
        </form>

        {searchError && (
          <div style={{ fontSize: '11px', color: 'var(--accent-warning)', lineHeight: 1.4 }}>
            {searchError}
          </div>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Found {results.length} result(s):
            </div>
            {results.map((res) => (
              <div
                key={res.place_id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                    {res.display_name}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {parseFloat(res.lat).toFixed(5)}°, {parseFloat(res.lon).toFixed(5)}°
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => handleFlyToResult(res)}
                      title="Fly map camera to this area"
                      aria-label={`Fly map to ${res.display_name}`}
                    >
                      <Navigation size={11} /> Fly Here
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => handlePlaceCameraAtResult(res)}
                      title="Place a virtual CCTV camera at this exact location"
                      aria-label={`Place camera at ${res.display_name}`}
                    >
                      <Plus size={11} /> Place Camera
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Coordinate Jump */}
      <div className="card-section">
        <div className="card-title">
          <span>Jump to GPS Coordinates</span>
        </div>

        <form onSubmit={handleJumpToManualCoords} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div className="form-group">
              <label htmlFor="manual-lat-input" className="form-label-row">Latitude</label>
              <input
                id="manual-lat-input"
                type="text"
                className="input-text"
                aria-label="Manual Latitude coordinate"
                placeholder="e.g. 40.7580"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-lon-input" className="form-label-row">Longitude</label>
              <input
                id="manual-lon-input"
                type="text"
                className="input-text"
                aria-label="Manual Longitude coordinate"
                placeholder="e.g. -73.9855"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="manual-alt-input" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Altitude:</label>
              <input
                id="manual-alt-input"
                type="number"
                aria-label="Flight Altitude in meters"
                min="50"
                max="5000"
                step="50"
                value={manualAlt}
                onChange={(e) => setManualAlt(e.target.value)}
                style={{
                  width: '60px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  padding: '3px 6px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>m</span>
            </div>

            <button type="submit" className="btn btn-secondary" aria-label="Fly to Coordinates" style={{ fontSize: '12px' }}>
              <Navigation size={13} /> Fly to Coordinates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
