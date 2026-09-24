import React, { useState, useRef, useEffect } from 'react';
import { useCctv } from '../../context/CctvContext';
import { CameraInspector } from '../../components/Inspector/CameraInspector';
import { CameraList } from '../../components/Sidebar/CameraList';
import { CoverageAnalysisPanel } from '../../components/Analysis/CoverageAnalysisPanel';
import { PlaceSearchPanel } from '../../components/Search/PlaceSearchPanel';
import { Sliders, List, BarChart3, Globe2 } from 'lucide-react';

export type ExtensionTabType = 'inspector' | 'cameras' | 'search' | 'analysis';

interface ExtensionSidebarProps {
  initialTab?: ExtensionTabType;
}

export const ExtensionSidebar: React.FC<ExtensionSidebarProps> = ({ initialTab = 'inspector' }) => {
  const { activeCamera, cameras } = useCctv();
  const [activeTab, setActiveTab] = useState<ExtensionTabType>(() => {
    if (initialTab) return initialTab;
    return cameras.length > 0 ? 'inspector' : 'search';
  });

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Isolate wheel scrolling so Google Earth does not steal zoom events
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const stopPropagation = (e: WheelEvent) => {
      e.stopPropagation();
    };

    el.addEventListener('wheel', stopPropagation, { passive: true });
    return () => {
      el.removeEventListener('wheel', stopPropagation);
    };
  }, []);

  return (
    <div className="extension-sidebar-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tabs Navigation */}
      <nav
        className="tabs-nav"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '6px 8px',
          background: 'rgba(15, 23, 42, 0.7)',
          borderBottom: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))',
          gap: '4px'
        }}
        aria-label="CCTV Extension Tabs"
      >
        <button
          className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspector')}
          type="button"
          title="Camera Inspector & Controls"
          style={{ fontSize: '11px', padding: '6px 4px', justifyContent: 'center' }}
        >
          <Sliders size={12} />
          Inspector
        </button>
        <button
          className={`tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
          type="button"
          title="Manage Placed Cameras"
          style={{ fontSize: '11px', padding: '6px 4px', justifyContent: 'center' }}
        >
          <List size={12} />
          Cameras ({cameras.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          type="button"
          title="Search Global Places & Coordinates"
          style={{ fontSize: '11px', padding: '6px 4px', justifyContent: 'center' }}
        >
          <Globe2 size={12} />
          Places
        </button>
        <button
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          type="button"
          title="Coverage & Blind Spot Analysis"
          style={{ fontSize: '11px', padding: '6px 4px', justifyContent: 'center' }}
        >
          <BarChart3 size={12} />
          Analysis
        </button>
      </nav>

      {/* Tab Content Body */}
      <div
        ref={bodyRef}
        className="extension-sidebar-body"
        onWheel={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {activeTab === 'inspector' && (
          activeCamera ? (
            <CameraInspector camera={activeCamera} />
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '12px',
                lineHeight: 1.5
              }}
            >
              No camera selected.
              <br />
              Click a camera marker on the map, select one from the <strong>Cameras</strong> tab, or click <strong>+ Add Camera</strong>.
            </div>
          )
        )}

        {activeTab === 'cameras' && <CameraList />}

        {activeTab === 'search' && <PlaceSearchPanel />}

        {activeTab === 'analysis' && <CoverageAnalysisPanel />}
      </div>
    </div>
  );
};
