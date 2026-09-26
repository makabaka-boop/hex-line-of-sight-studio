import { clipOpenSegmentToPlanes, pointAt, type Point, type Segment } from './clip'
import {
  cellsInRadius,
  hexPlanes,
  makeHexCell,
  type CellKey,
  type HexCell
} from './hex'
import { compare, lessThan, rat, type Rational } from './rational'

export interface Observer {
  point: Point
  label: string
}

export interface FirstBlocker {
  q: number
  r: number
  key: CellKey
  entryParameter: Rational
  entryPoint: Point
}

export interface TargetVisibility {
  cell: HexCell
  visible: boolean
  blocked: boolean
  firstBlocker: FirstBlocker | null
}

export interface VisibilityAnalysis {
  radius: number
  scale: Rational
  observer: Observer
  cells: HexCell[]
  blockedKeys: ReadonlySet<CellKey>
  targets: TargetVisibility[]
  byKey: ReadonlyMap<CellKey, TargetVisibility>
  visibleCount: number
  blockedTargetCount: number
}

export interface AnalysisOptions {
  radius: number
  observer: Observer
  blockedKeys: ReadonlySet<CellKey>
  scale?: Rational
}

export function analyzeVisibility(options: AnalysisOptions): VisibilityAnalysis {
  const scale = options.scale ?? rat(1n)
  const cells = cellsInRadius(options.radius).map(({ q, r }) => makeHexCell(q, r, scale))
  const targets: TargetVisibility[] = []
  const byKey = new Map<CellKey, TargetVisibility>()

  for (const cell of cells) {
    const blocked = options.blockedKeys.has(cell.key)
    const segment: Segment = { start: options.observer.point, end: cell.center }
    let firstBlocker: FirstBlocker | null = null

    if (!blocked) {
      firstBlocker = findFirstBlocker(segment, cells, options.blockedKeys)
    }

    const result: TargetVisibility = {
      cell,
      blocked,
      visible: !blocked && firstBlocker === null,
      firstBlocker
    }
    targets.push(result)
    byKey.set(cell.key, result)
  }

  const visibleCount = targets.filter((target) => target.visible).length
  const blockedTargetCount = targets.filter((target) => target.blocked).length

  return {
    radius: options.radius,
    scale,
    observer: options.observer,
    cells,
    blockedKeys: new Set(options.blockedKeys),
    targets,
    byKey,
    visibleCount,
    blockedTargetCount
  }
}

function findFirstBlocker(
  segment: Segment,
  cells: HexCell[],
  blockedKeys: ReadonlySet<CellKey>
): FirstBlocker | null {
  let winner: FirstBlocker | null = null

  for (const cell of cells) {
    if (!blockedKeys.has(cell.key)) continue

    const interval = clipOpenSegmentToPlanes(segment, hexPlanes(cell))
    if (!interval) continue

    const candidate: FirstBlocker = {
      q: cell.q,
      r: cell.r,
      key: cell.key,
      entryParameter: interval.enter,
      entryPoint: pointAt(segment, interval.enter)
    }

    if (winner === null || compareFirstBlocker(candidate, winner) < 0) {
      winner = candidate
    }
  }

  return winner
}

/** Ties are broken by rational entry position, then q, then r. */
export function compareFirstBlocker(a: FirstBlocker, b: FirstBlocker): -1 | 0 | 1 {
  const byEntry = compare(a.entryParameter, b.entryParameter)
  if (byEntry !== 0) return byEntry
  if (a.q !== b.q) return a.q < b.q ? -1 : 1
  if (a.r !== b.r) return a.r < b.r ? -1 : 1
  return 0
}

export function observerAtCell(q: number, r: number): Observer {
  const cell = makeHexCell(q, r)
  return {
    point: cell.center,
    label: `(${q}, ${r}) 格心`
  }
}

export function isCellKeyInRadius(key: CellKey, radius: number): boolean {
  const match = /^(-?\d+),(-?\d+)$/.exec(key)
  if (!match) return false
  const q = Number(match[1])
  const r = Number(match[2])
  return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(-q - r) <= radius
}

export function earlierEntry(a: FirstBlocker | null, b: FirstBlocker | null): boolean {
  if (a === null) return false
  if (b === null) return true
  return lessThan(a.entryParameter, b.entryParameter)
}
