import './App.css';

import bgUrl from './assets/bg.png';
import { SlotMachinePixi } from './features/slot/SlotMachinePixi.tsx';

function App() {
  return (
    <div className="app-page" style={{ backgroundImage: `url(${bgUrl})` }}>
      <main className="main-screen">
        <SlotMachinePixi />
      </main>
    </div>
  );
}

export default App;
