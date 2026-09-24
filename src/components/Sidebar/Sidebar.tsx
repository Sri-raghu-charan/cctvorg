import React, { useState } from 'react';
import { useCctv } from '../../context/CctvContext';
import { CameraInspector } from '../Inspector/CameraInspector';
import { CameraList } from './CameraList';
import { CoverageAnalysisPanel } from '../Analysis/CoverageAnalysisPanel';
import { PlaceSearchPanel } from '../Search/PlaceSearchPanel';
import { Sliders, List, BarChart3, Video, Globe2 } from 'lucide-react';

type TabType = 'inspector' | 'cameras' | 'search' | 'analysis';

export const Sidebar: React.FC = () => {
  const { activeCamera, cameras } = useCctv();
  const [activeTab, setActiveTab] = useState<TabType>(() => (cameras.length > 0 ? 'inspector' : 'search'));

  return (
    <aside className="app-sidebar" aria-label="Planning Workstation Sidebar">
      {/* Sidebar Top Header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Video size={16} style={{ color: 'var(--text-accent)' }} />
          <span>Planning Workstation</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {cameras.length} Active Camera{cameras.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="tabs-nav" aria-label="Workstation Navigation Tabs">
        <button
          className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspector')}
          type="button"
          title="Camera Inspector & Controls"
          aria-label="Camera Inspector & Controls"
        >
          <Sliders size={13} />
          Inspector
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          type="button"
          title="Search Real-World Places & Jump to Coordinates"
          aria-label="Search Real-World Places & Jump to Coordinates"
        >
          <Globe2 size={13} />
          Places
        </button>
        <button
          className={`tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
          type="button"
          title="Manage Placed Cameras"
          aria-label={`Manage Placed Cameras (${cameras.length} active)`}
        >
          <List size={13} />
          Cameras ({cameras.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          type="button"
          title="DORI & Blind Spot Analysis"
          aria-label="DORI & Blind Spot Analysis"
        >
          <BarChart3 size={13} />
          Analysis
        </button>
      </nav>

      {/* Tab Content */}
      <div className="sidebar-content">
        {activeTab === 'inspector' && (
          activeCamera ? (
            <CameraInspector camera={activeCamera} />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              No camera selected. Select a camera from the Cameras tab, search for a place, or click on a camera marker on the map.
            </div>
          )
        )}

        {activeTab === 'search' && <PlaceSearchPanel />}

        {activeTab === 'cameras' && <CameraList />}

        {activeTab === 'analysis' && <CoverageAnalysisPanel />}
      </div>
    </aside>
  );
};
