import { useState } from 'react';
import { Header, type TabId } from './components/Header';
import { DemoScene } from './components/DemoScene';
import { ShiningCrownScene } from './components/ShiningCrownScene';
import { Placeholder } from './components/Placeholder';
import './App.css';

function App() {
  const [tab, setTab] = useState<TabId>('balls');

  return (
    <div className="app-layout">
      <Header active={tab} onChange={setTab} />
      <main className="app-content">
        {tab === 'balls' && <DemoScene />}
        {tab === 'shining-crown' && <ShiningCrownScene />}
        {tab === 'plinko' && <Placeholder title="Plinko" badge="instant" />}
      </main>
    </div>
  );
}

export default App;
