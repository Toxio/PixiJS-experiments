import { useState } from 'react';
import { Header, type TabId } from './components/Header';
import { DemoScene } from './components/DemoScene';
import { SlotsScene } from './components/SlotsScene';
import { Placeholder } from './components/Placeholder';
import './App.css';

function App() {
  const [tab, setTab] = useState<TabId>('slots');

  return (
    <div className="app-layout">
      <Header active={tab} onChange={setTab} />
      <main className="app-content">
        {tab === 'slots' && <SlotsScene />}
        {tab === 'balls' && <DemoScene />}
        {tab === 'plinko' && <Placeholder title="Plinko" badge="instant" />}
      </main>
    </div>
  );
}

export default App;
