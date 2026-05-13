export function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export function backout(amount: number): (t: number) => number {
  return (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
}
