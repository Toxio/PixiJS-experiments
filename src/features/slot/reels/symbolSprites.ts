import { Container, Sprite } from 'pixi.js';

import { resolveSymbolTexture } from './assets';
import type { SlotSymbol } from './types';

export function createSymbolSprite(alias: string, cw: number, ch: number): SlotSymbol {
  const container = new Container();
  const sprite = new Sprite(resolveSymbolTexture(alias));
  fitSprite(sprite, cw, ch);
  container.addChild(sprite);
  return { container, sprite };
}

export function fitSprite(sprite: Sprite, cw: number, ch: number): void {
  sprite.anchor.set(0.5);
  sprite.x = cw / 2;
  sprite.y = ch / 2;
  const tw = sprite.texture.width || 1;
  const th = sprite.texture.height || 1;
  sprite.scale.set(Math.min((cw * 0.82) / tw, (ch * 0.82) / th));
}

export function updateSymbol(sym: SlotSymbol, alias: string, cw: number, ch: number): void {
  sym.sprite.texture = resolveSymbolTexture(alias);
  fitSprite(sym.sprite, cw, ch);
}

export const INACTIVE_SYMBOL_ALPHA = 0.35;

export function setSlotSymbolDimmed(sym: SlotSymbol | undefined, dimmed: boolean): void {
  if (!sym) return;
  sym.sprite.alpha = dimmed ? INACTIVE_SYMBOL_ALPHA : 1;
}

export function setSlotSymbolVisibility(sym: SlotSymbol | undefined, visible: boolean): void {
  if (!sym) return;
  sym.sprite.visible = visible;
  sym.container.visible = visible;
  if (visible) sym.sprite.alpha = 1;
}
