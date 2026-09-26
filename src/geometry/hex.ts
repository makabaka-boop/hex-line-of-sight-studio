import type { Plane, Point } from './clip'
import { add, mul, neg, rat, sub, type Rational } from './rational'

export interface AxialCoord {
  q: number
  r: number
}

export type CellKey = string

export interface HexCell extends AxialCoord {
  key: CellKey
  center: Point
  vertices: Point[]
  scale: Rational
}

export const HEX_SCALE: Rational = rat(1n)

/** Relative vertex offsets in the specified integer plane embedding. */
export const HEX_VERTEX_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 2],
  [1, 1],
  [1, -1],
  [0, -2],
  [-1, -1],
  [-1, 1]
]

export function cellKey(q: number, r: number): CellKey {
  return `${q},${r}`
}

export function centerOf(q: number, r: number, scale: Rational = HEX_SCALE): Point {
  return {
    x: mul(rat(2 * q + r), scale),
    y: mul(rat(3 * r), scale)
  }
}

export function makeHexCell(q: number, r: number, scale: Rational = HEX_SCALE): HexCell {
  const center = centerOf(q, r, scale)
  return {
    q,
    r,
    key: cellKey(q, r),
    center,
    scale,
    vertices: HEX_VERTEX_OFFSETS.map(([ox, oy]) => ({
      x: add(center.x, mul(rat(ox), scale)),
      y: add(center.y, mul(rat(oy), scale))
    }))
  }
}

export function hexPlanes(cell: HexCell): Plane[] {
  const { x: cx, y: cy } = cell.center
  const { scale } = cell
  const one = scale
  const two = mul(rat(2n), scale)
  return [
    { a: rat(1n), b: rat(1n), c: neg(add(add(cx, cy), two)) },
    { a: rat(1n), b: rat(0n), c: neg(add(cx, one)) },
    { a: rat(1n), b: rat(-1n), c: neg(add(sub(cx, cy), two)) },
    { a: rat(-1n), b: rat(-1n), c: sub(add(cx, cy), two) },
    { a: rat(-1n), b: rat(0n), c: sub(cx, one) },
    { a: rat(-1n), b: rat(1n), c: sub(sub(cx, cy), two) }
  ]
}

export function cellsInRadius(radius: number): AxialCoord[] {
  const cells: AxialCoord[] = []
  for (let q = -radius; q <= radius; q += 1) {
    const minR = Math.max(-radius, -q - radius)
    const maxR = Math.min(radius, -q + radius)
    for (let r = minR; r <= maxR; r += 1) {
      cells.push({ q, r })
    }
  }
  return cells
}
