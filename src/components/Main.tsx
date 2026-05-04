import reelImage from '../assets/reel.png';
import { Glass } from './Glass';
import { Goblet } from './Goblet';

export function Main() {
  return (
    <main className="main-screen">
      <div className="main-reel-wrap">
        <img className="main-reel" src={reelImage} alt="Reel" decoding="async" />
        <Glass />
        <Goblet />
      </div>
    </main>
  );
}
