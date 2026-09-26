import { add, compare, mul, neg, normalize, sub, type Rational } from './rational'

export interface Point {
  x: Rational
  y: Rational
}

export interface Segment {
  start: Point
  end: Point
}

/**
 * A closed convex region represented by interior half-planes.
 * A point is strictly inside exactly when a*x+b*y+c is negative.
 */
export interface Plane {
  a: Rational
  b: Rational
  c: Rational
}

export interface SegmentInterval {
  enter: Rational
  leave: Rational
}

/**
 * Intersect the open segment p(t)=start+(end-start)t, 0<t<1, with the strict
 * interior of a convex polygon. Boundary-only contact (an edge or a corner)
 * produces null instead of a zero-length interval.
 */
export function clipOpenSegmentToPlanes(segment: Segment, planes: Plane[]): SegmentInterval | null {
  const dx = sub(segment.end.x, segment.start.x)
  const dy = sub(segment.end.y, segment.start.y)

  // The open segment of two equal points is empty.
  if (dx[0] === 0n && dy[0] === 0n) return null

  let low: Rational = [0n, 1n]
  let high: Rational = [1n, 1n]

  for (const plane of planes) {
    const constant = add(add(mul(plane.a, segment.start.x), mul(plane.b, segment.start.y)), plane.c)
    const slope = add(mul(plane.a, dx), mul(plane.b, dy))

    if (slope[0] === 0n) {
      // Strict interior requires constant < 0 for the entire segment.
      if (compare(constant, [0n, 1n]) >= 0) return null
      continue
    }

    const boundary = divRat(neg(constant), slope)

    if (slope[0] > 0n) {
      // constant + slope*t < 0  =>  t < boundary
      if (compare(boundary, low) <= 0) return null
      if (compare(boundary, high) < 0) high = boundary
    } else {
      // constant + slope*t < 0  =>  t > boundary
      if (compare(boundary, high) >= 0) return null
      if (compare(boundary, low) > 0) low = boundary
    }

    if (compare(low, high) >= 0) return null
  }

  return compare(low, high) < 0 ? { enter: low, leave: high } : null
}

function divRat(a: Rational, b: Rational): Rational {
  return normalize([a[0] * b[1], a[1] * b[0]])
}

export function pointAt(segment: Segment, t: Rational): Point {
  const dx = sub(segment.end.x, segment.start.x)
  const dy = sub(segment.end.y, segment.start.y)
  return {
    x: add(segment.start.x, mul(dx, t)),
    y: add(segment.start.y, mul(dy, t))
  }
}
