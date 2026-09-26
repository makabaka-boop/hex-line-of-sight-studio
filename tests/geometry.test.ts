import { describe, expect, it } from 'vitest'
import { clipOpenSegmentToPlanes, pointAt, type Point, type Segment } from '../src/geometry/clip'
import { HEX_VERTEX_OFFSETS, cellKey, centerOf, hexPlanes, makeHexCell } from '../src/geometry/hex'
import { analyzeVisibility, observerAtCell } from '../src/geometry/visibility'
import { add, mul, normalize, rat, rationalToString, sub, type Rational } from '../src/geometry/rational'

expect.addEqualityTesters([
  function bigintEquality(a: unknown, b: unknown): boolean | undefined {
    if (typeof a === 'bigint' && typeof b === 'bigint') return a === b
    return undefined
  }
])

function point(x: number | bigint, y: number | bigint): Point {
  return { x: rat(x), y: rat(y) }
}

function segment(x1: number | bigint, y1: number | bigint, x2: number | bigint, y2: number | bigint): Segment {
  return { start: point(x1, y1), end: point(x2, y2) }
}

/**
 * Independent reference implementation used only by the tests.
 * It clips directly against absolute polygon vertices instead of the
 * production half-plane table, then keeps only a positive-length strict
 * interior interval.
 */
function referenceClipOpenSegment(
  segmentValue: Segment,
  vertices: Point[]
): { enter: Rational; leave: Rational } | null {
  let low: Rational = rat(0n)
  let high: Rational = rat(1n)

  for (let index = 0; index < vertices.length; index += 1) {
    const vertex = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    const edgeX = sub(next.x, vertex.x)
    const edgeY = sub(next.y, vertex.y)
    const cross = (p: Point): Rational =>
      sub(mul(edgeX, sub(p.y, vertex.y)), mul(edgeY, sub(p.x, vertex.x)))

    const constant = cross(segmentValue.start)
    const slope = sub(cross(segmentValue.end), constant)

    if (slope[0] === 0n) {
      if (constant[0] >= 0n) return null
      continue
    }

    const boundary: Rational = normalize([-(constant[0] * slope[1]), constant[1] * slope[0]])
    const less = (a: Rational, b: Rational): boolean => a[0] * b[1] < b[0] * a[1]
    const lessOrEqual = (a: Rational, b: Rational): boolean => a[0] * b[1] <= b[0] * a[1]

    if (slope[0] > 0n) {
      // Interior is t < boundary.
      if (lessOrEqual(boundary, low)) return null
      if (less(boundary, high)) high = boundary
    } else {
      // Interior is t > boundary.
      if (lessOrEqual(high, boundary)) return null
      if (less(low, boundary)) low = boundary
    }
  }

  return low[0] * high[1] < high[0] * low[1] ? { enter: low, leave: high } : null
}

function referenceHexClip(
  segmentValue: Segment,
  q: number,
  r: number,
  scale: Rational = rat(1n)
): { enter: Rational; leave: Rational } | null {
  const center = centerOf(q, r, scale)
  const vertices = HEX_VERTEX_OFFSETS.map(([x, y]) => ({
    x: add(center.x, mul(rat(x), scale)),
    y: add(center.y, mul(rat(y), scale))
  }))
  return referenceClipOpenSegment(segmentValue, vertices)
}

function expectSameInterval(
  actual: { enter: Rational; leave: Rational } | null,
  expected: { enter: Rational; leave: Rational } | null
): void {
  if (expected === null) {
    expect(actual).toBeNull()
    return
  }
  expect(actual).not.toBeNull()
  expect(rationalToString(actual!.enter)).toBe(rationalToString(expected.enter))
  expect(rationalToString(actual!.leave)).toBe(rationalToString(expected.leave))
}

describe('有理线段裁剪与独立实现对拍', () => {
  it('普通遮挡：开线段进入阻挡格内部，交入位置为 (16/7, 12/7)', () => {
    const line = segment(0, 0, 4, 3)
    const actual = clipOpenSegmentToPlanes(line, hexPlanes(makeHexCell(1, 1)))
    const expected = referenceHexClip(line, 1, 1)

    expectSameInterval(actual, expected)
    expect(rationalToString(actual!.enter)).toBe('4/7')
    expect(rationalToString(actual!.leave)).toBe('1')

    const entry = pointAt(line, actual!.enter)
    expect(rationalToString(entry.x)).toBe('16/7')
    expect(rationalToString(entry.y)).toBe('12/7')

    const analysis = analyzeVisibility({
      radius: 4,
      observer: observerAtCell(0, 0),
      blockedKeys: new Set([cellKey(1, 1)])
    })
    // 目标格 (3,1) 的格心为 (7,3)，射线穿过 (1,1) 内部，交入 t=2/5。
    const target = analysis.byKey.get(cellKey(3, 1))
    expect(target?.visible).toBe(false)
    expect(target?.firstBlocker?.key).toBe(cellKey(1, 1))
    expect(rationalToString(target!.firstBlocker!.entryParameter)).toBe('2/5')
    expect(rationalToString(target!.firstBlocker!.entryPoint.x)).toBe('14/5')
    expect(rationalToString(target!.firstBlocker!.entryPoint.y)).toBe('6/5')
  })

  it('擦过共享角点不遮挡；两个障碍在同一距离仅边界接触', () => {
    const line = segment(0, 0, 6, 6)
    const first = makeHexCell(0, 1)
    const second = makeHexCell(1, 0)

    expectSameInterval(clipOpenSegmentToPlanes(line, hexPlanes(first)), referenceHexClip(line, 0, 1))
    expectSameInterval(clipOpenSegmentToPlanes(line, hexPlanes(second)), referenceHexClip(line, 1, 0))
    expect(clipOpenSegmentToPlanes(line, hexPlanes(first))).toBeNull()
    expect(clipOpenSegmentToPlanes(line, hexPlanes(second))).toBeNull()

    const analysis = analyzeVisibility({
      radius: 4,
      observer: observerAtCell(0, 0),
      blockedKeys: new Set([cellKey(0, 1), cellKey(1, 0)])
    })
    expect(analysis.byKey.get(cellKey(2, 2))?.visible).toBe(true)

    // 同一点 (2,2) 也是第三格 (1,1) 的顶点；若它阻挡，射线从顶点进入其
    // 内部，交入参数恰为 1/3。擦角与真正交入在此区分开。
    const cornerEntry = analyzeVisibility({
      radius: 4,
      observer: observerAtCell(0, 0),
      blockedKeys: new Set([cellKey(0, 1), cellKey(1, 0), cellKey(1, 1)])
    })
    const target = cornerEntry.byKey.get(cellKey(2, 2))
    expect(target?.visible).toBe(false)
    expect(target?.firstBlocker?.key).toBe(cellKey(1, 1))
    expect(rationalToString(target!.firstBlocker!.entryParameter)).toBe('1/3')
    expect(rationalToString(target!.firstBlocker!.entryPoint.x)).toBe('2')
    expect(rationalToString(target!.firstBlocker!.entryPoint.y)).toBe('2')
  })

  it('沿共享边行进不遮挡，越过端点进入下一格内部后给出同一有理交入位置', () => {
    // 方向 (1,-1)：射线在 (1,-1) 到 (2,-2) 之间完全贴着 (1,0) 的一条边，
    // 然后从顶点 (2,-2) 进入 (2,-1) 的内部。
    const line = segment(0, 0, 6, -6)
    const alongEdge = makeHexCell(1, 0)
    const interior = makeHexCell(2, -1)

    expectSameInterval(
      clipOpenSegmentToPlanes(line, hexPlanes(alongEdge)),
      referenceHexClip(line, 1, 0)
    )
    expect(clipOpenSegmentToPlanes(line, hexPlanes(alongEdge))).toBeNull()

    const actual = clipOpenSegmentToPlanes(line, hexPlanes(interior))
    expectSameInterval(actual, referenceHexClip(line, 2, -1))
    expect(rationalToString(actual!.enter)).toBe('1/3')
    expect(rationalToString(actual!.leave)).toBe('2/3')

    const analysis = analyzeVisibility({
      radius: 4,
      observer: observerAtCell(0, 0),
      blockedKeys: new Set([cellKey(1, 0), cellKey(2, -1)])
    })
    const target = analysis.byKey.get(cellKey(4, -2))
    expect(target?.visible).toBe(false)
    expect(target?.firstBlocker?.key).toBe(cellKey(2, -1))
    expect(rationalToString(target!.firstBlocker!.entryParameter)).toBe('1/3')
    expect(rationalToString(target!.firstBlocker!.entryPoint.x)).toBe('2')
    expect(rationalToString(target!.firstBlocker!.entryPoint.y)).toBe('-2')
  })

  it('整数平面整体缩放后，参数化交入位置与可见性保持不变', () => {
    const scales = [rat(1n), rat(3n), rat(7n, 2n)]

    for (const scale of scales) {
      const line: Segment = {
        start: { x: rat(0n), y: rat(0n) },
        end: { x: mul(rat(4n), scale), y: mul(rat(3n), scale) }
      }
      const actual = clipOpenSegmentToPlanes(line, hexPlanes(makeHexCell(1, 1, scale)))
      const expected = referenceHexClip(line, 1, 1, scale)
      expectSameInterval(actual, expected)
      expect(rationalToString(actual!.enter)).toBe('4/7')
      expect(rationalToString(actual!.leave)).toBe('1')
    }

    const analysis = analyzeVisibility({
      radius: 4,
      observer: { point: point(0, 0), label: 'scaled' },
      blockedKeys: new Set([cellKey(1, 1)]),
      scale: rat(3n)
    })
    const target = analysis.byKey.get(cellKey(3, 1))
    expect(target?.visible).toBe(false)
    expect(rationalToString(target!.firstBlocker!.entryParameter)).toBe('2/5')
    expect(rationalToString(target!.firstBlocker!.entryPoint.x)).toBe('42/5')
    expect(rationalToString(target!.firstBlocker!.entryPoint.y)).toBe('18/5')
  })
})
