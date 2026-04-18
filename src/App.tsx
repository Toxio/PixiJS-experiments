import { useState } from 'react';
import { Header, type TabId } from './components/Header';
import { DemoScene } from './components/DemoScene';
import { SlotsScene } from './components/SlotsScene';
import { WinFrameScene } from './components/WinFrameScene';
import './App.css';

function App() {
  const [tab, setTab] = useState<TabId>('slots');

  return (
    <div className="app-layout">
      <Header active={tab} onChange={setTab} />
      <main className="app-content">
        {tab === 'slots' && <SlotsScene />}
        {tab === 'balls' && <DemoScene />}
        {tab === 'frame' && <WinFrameScene />}
      </main>
    </div>
  );
}

export default App;
