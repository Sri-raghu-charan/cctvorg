import React from 'react';
import { CctvProvider } from './context/CctvContext';
import { Header } from './components/Header/Header';
import { CesiumMap } from './components/Map/CesiumMap';
import { Sidebar } from './components/Sidebar/Sidebar';
import './styles/theme.css';

export function App() {
  return (
    <CctvProvider>
      <div className="cctv-app">
        <Header />
        <main className="app-content">
          <CesiumMap />
          <Sidebar />
        </main>
      </div>
    </CctvProvider>
  );
}

export default App;
