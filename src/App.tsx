import { useState } from 'react';
import { Header, type TabId } from './components/Header';
import { DemoScene } from './components/DemoScene';
import { Placeholder } from './components/Placeholder';
import './App.css';

function App() {
  const [tab, setTab] = useState<TabId>('balls');

  return (
    <div className="app-layout">
      <Header active={tab} onChange={setTab} />
      <main className="app-content">
        {tab === 'balls' && <DemoScene />}
        {tab === 'shining-crown' && <Placeholder title="Shining Crown" badge="slot" />}
        {tab === 'plinko' && <Placeholder title="Plinko" badge="instant" />}
      </main>
    </div>
  );
}

export default App;
