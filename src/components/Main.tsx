import reelImage from '../assets/reel.png';
import { Glass } from './Glass';
import { Goblet } from './Goblet';
import { Lipstick } from './Lipstick';
import { Lips } from './Lips';
import { Parfume } from './Parfume';
import { Rose } from './Rose';
import { Seven } from './Seven';
import { Star } from './Star';
import { Wild } from './Wild';

export function Main() {
  return (
    <main className="main-screen">
      <div className="main-reel-wrap">
        <img className="main-reel" src={reelImage} alt="Reel" decoding="async" />
        <Glass />
        <Goblet />
        <Lips />
        <Lipstick />
        <Parfume />
        <Rose />
        <Seven />
        <Star />
        <Wild />
      </div>
    </main>
  );
}
