<script setup lang="ts">
import { computed } from 'vue'
import type { VisibilityAnalysis } from '../geometry/visibility'
import { rationalToNumber, rationalToString, type Rational } from '../geometry/rational'
import type { Point } from '../geometry/clip'

const props = defineProps<{
  analysis: VisibilityAnalysis
  selectedKey: string
  zoom: number
}>()

const emit = defineEmits<{
  cellClick: [key: string]
}>()

const bounds = computed(() => {
  const radius = props.analysis.radius
  const minX = -2 * radius - 3
  const width = 4 * radius + 6
  const minY = -3 * radius - 4
  const height = 6 * radius + 8
  return { minX, minY, width, height }
})

const selected = computed(() => props.analysis.byKey.get(props.selectedKey) ?? null)

function pointValue(point: Point): [number, number] {
  return [rationalToNumber(point.x), rationalToNumber(point.y)]
}

function polygonPoints(vertices: Point[]): string {
  return vertices.map((point) => pointValue(point).join(',')).join(' ')
}

function coordinate(point: Point, axis: 'x' | 'y'): string {
  const value: Rational = point[axis]
  return rationalToString(value)
}

function cellClass(key: string): string {
  const target = props.analysis.byKey.get(key)
  if (!target) return 'cell'
  if (target.blocked) return 'cell blocked'
  if (target.visible) return 'cell visible'
  return 'cell hidden'
}
</script>

<template>
  <div class="canvas-wrap">
    <svg
      :width="bounds.width * zoom"
      :height="bounds.height * zoom"
      :viewBox="`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`"
      role="img"
      aria-label="六角棋盘视线图"
    >
      <g>
        <polygon
          v-for="target in analysis.targets"
          :key="target.cell.key"
          :points="polygonPoints(target.cell.vertices)"
          :class="[
            cellClass(target.cell.key),
            { selected: target.cell.key === selectedKey },
            {
              'first-blocker':
                selected?.firstBlocker?.key === target.cell.key
            }
          ]"
          @click="emit('cellClick', target.cell.key)"
        >
          <title>
            ({{ target.cell.q }}, {{ target.cell.r }}){{
              target.blocked ? ' · 阻挡' : target.visible ? ' · 可见' : ' · 不可见'
            }}
          </title>
        </polygon>

        <text
          v-for="target in analysis.targets"
          :key="`${target.cell.key}-label`"
          :x="coordinate(target.cell.center, 'x')"
          :y="coordinate(target.cell.center, 'y')"
          class="cell-label"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {{ target.cell.q }},{{ target.cell.r }}
        </text>

        <line
          v-if="selected"
          :x1="coordinate(analysis.observer.point, 'x')"
          :y1="coordinate(analysis.observer.point, 'y')"
          :x2="coordinate(selected.cell.center, 'x')"
          :y2="coordinate(selected.cell.center, 'y')"
          class="sight-line"
          :class="{ blocked: !selected.visible }"
        />

        <circle
          v-if="selected?.firstBlocker"
          :cx="coordinate(selected.firstBlocker.entryPoint, 'x')"
          :cy="coordinate(selected.firstBlocker.entryPoint, 'y')"
          r="0.28"
          class="entry-point"
        >
          <title>
            最先进入阻挡格 ({{ selected.firstBlocker.q }},
            {{ selected.firstBlocker.r }})
          </title>
        </circle>

        <circle
          :cx="coordinate(analysis.observer.point, 'x')"
          :cy="coordinate(analysis.observer.point, 'y')"
          r="0.42"
          class="observer"
        />
        <circle
          :cx="coordinate(analysis.observer.point, 'x')"
          :cy="coordinate(analysis.observer.point, 'y')"
          r="0.16"
          class="observer-core"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas-wrap {
  overflow: auto;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  padding: 10px;
  min-width: 0;
}

svg {
  display: block;
  margin: 0 auto;
  max-width: none;
}

.cell {
  cursor: pointer;
  stroke: #334155;
  stroke-width: 0.08;
  vector-effect: non-scaling-stroke;
  transition: fill 120ms ease;
}

.cell.visible {
  fill: #bbf7d0;
}

.cell.hidden {
  fill: #fecaca;
}

.cell.blocked {
  fill: #334155;
}

.cell.selected {
  stroke: #2563eb;
  stroke-width: 0.22;
}

.cell.first-blocker {
  stroke: #f97316;
  stroke-width: 0.28;
}

.cell-label {
  pointer-events: none;
  user-select: none;
  font-size: 0.72px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  fill: #0f172a;
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.75);
  stroke-width: 0.12px;
}

.sight-line {
  stroke: #16a34a;
  stroke-width: 0.09;
  stroke-dasharray: 0.45 0.25;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.sight-line.blocked {
  stroke: #dc2626;
}

.entry-point {
  fill: #f97316;
  stroke: white;
  stroke-width: 0.06;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.observer {
  fill: white;
  stroke: #0f172a;
  stroke-width: 0.09;
  vector-effect: non-scaling-stroke;
}

.observer-core {
  fill: #0f172a;
  pointer-events: none;
}
</style>
