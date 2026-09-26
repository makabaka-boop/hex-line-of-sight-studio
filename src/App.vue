<script setup lang="ts">
import { computed, ref } from 'vue'
import HexCanvas from './components/HexCanvas.vue'
import HexList from './components/HexList.vue'
import SelectedDetail from './components/SelectedDetail.vue'
import {
  analyzeVisibility,
  isCellKeyInRadius,
  observerAtCell
} from './geometry/visibility'
import { cellKey } from './geometry/hex'
import { parseRational, rat, type Rational } from './geometry/rational'

type EditMode = 'blocks' | 'observer' | 'target'

const radius = ref(4)
const editMode = ref<EditMode>('blocks')
const zoom = ref(1)
const blockedKeys = ref<Set<string>>(new Set())
const selectedKey = ref(cellKey(2, 2))
const observerXText = ref('0')
const observerYText = ref('0')
const observerError = ref('')

const observerPoint = ref(observerAtCell(0, 0).point)

const analysis = computed(() =>
  analyzeVisibility({
    radius: radius.value,
    observer: {
      point: observerPoint.value,
      label: `(${observerXText.value}, ${observerYText.value})`
    },
    blockedKeys: blockedKeys.value
  })
)

const effectiveSelectedKey = computed(() => {
  if (analysis.value.byKey.has(selectedKey.value)) return selectedKey.value
  return analysis.value.targets[0]?.cell.key ?? cellKey(0, 0)
})

const selectedTarget = computed(
  () => analysis.value.byKey.get(effectiveSelectedKey.value) ?? analysis.value.targets[0]
)

function commitRadius(event: Event): void {
  const input = event.target as HTMLInputElement
  const next = Math.min(12, Math.max(2, Math.round(Number(input.value) || 2)))
  radius.value = next
  input.value = String(next)
  pruneBlockedKeys()
}

function pruneBlockedKeys(): void {
  blockedKeys.value = new Set(
    [...blockedKeys.value].filter((key) => isCellKeyInRadius(key, radius.value))
  )
}

function toggleBlocked(key: string): void {
  const next = new Set(blockedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  blockedKeys.value = next
}

function clearBlocked(): void {
  blockedKeys.value = new Set()
}

function loadExample(): void {
  radius.value = 4
  editMode.value = 'target'
  observerPoint.value = observerAtCell(0, 0).point
  observerXText.value = '0'
  observerYText.value = '0'
  observerError.value = ''
  blockedKeys.value = new Set([cellKey(0, 1), cellKey(1, 0), cellKey(1, 1)])
  selectedKey.value = cellKey(2, 2)
}

function onCellClick(key: string): void {
  if (editMode.value === 'blocks') {
    toggleBlocked(key)
    return
  }

  if (editMode.value === 'observer') {
    const cell = analysis.value.byKey.get(key)
    if (!cell) return
    setObserverToPoint(cell.cell.center, String(cell.cell.q), String(cell.cell.r))
    return
  }

  selectedKey.value = key
}

function setObserverToPoint(point: { x: Rational; y: Rational }, xText: string, yText: string): void {
  observerPoint.value = point
  observerXText.value = xText
  observerYText.value = yText
  observerError.value = ''
}

function applyTypedObserver(): void {
  const x = parseRational(observerXText.value)
  const y = parseRational(observerYText.value)
  if (!x || !y) {
    observerError.value = '请输入整数或分数，例如 3、-2、4/3。'
    return
  }
  observerError.value = ''
  observerPoint.value = { x, y }
}

function resetObserver(): void {
  setObserverToPoint({ x: rat(0n), y: rat(0n) }, '0', '0')
}
</script>

<template>
  <main class="app-shell">
    <header>
      <h1>六角棋盘视线</h1>
      <p>
        整数平面嵌入格心为 <code>(2q+r, 3r)</code>。开线段只有进入阻挡六边形
        <strong>内部</strong> 才遮挡；仅沿边或擦过角点不改变可见性。
      </p>
    </header>

    <section class="controls" aria-label="棋盘控制">
      <label>
        半径
        <input
          v-model.number="radius"
          type="number"
          min="2"
          max="12"
          step="1"
          @change="commitRadius"
        />
        <small>2～12</small>
      </label>

      <fieldset>
        <legend>点击画布</legend>
        <label><input v-model="editMode" type="radio" value="blocks" /> 编辑阻挡</label>
        <label><input v-model="editMode" type="radio" value="target" /> 选择目标</label>
        <label><input v-model="editMode" type="radio" value="observer" /> 设置观察点</label>
      </fieldset>

      <div class="observer-edit">
        <label>
          观察点 x
          <input v-model="observerXText" type="text" inputmode="numeric" @change="applyTypedObserver" />
        </label>
        <label>
          y
          <input v-model="observerYText" type="text" inputmode="numeric" @change="applyTypedObserver" />
        </label>
        <button type="button" @click="applyTypedObserver">应用</button>
        <button type="button" @click="resetObserver">归零</button>
      </div>

      <label class="zoom">
        缩放
        <input v-model.number="zoom" type="range" min="0.5" max="4" step="0.25" />
        <small>{{ zoom }}×（仅屏幕显示）</small>
      </label>

      <div class="actions">
        <button type="button" @click="clearBlocked">清空阻挡</button>
        <button type="button" @click="loadExample">擦角示例</button>
      </div>
    </section>

    <p v-if="observerError" class="error" role="alert">{{ observerError }}</p>

    <section class="stats">
      <span>总格 {{ analysis.targets.length }}</span>
      <span class="visible-count">可见 {{ analysis.visibleCount }}</span>
      <span class="blocked-count">阻挡格 {{ analysis.blockedTargetCount }}</span>
      <span class="hidden-count">
        被遮挡 {{ analysis.targets.length - analysis.visibleCount - analysis.blockedTargetCount }}
      </span>
    </section>

    <div class="workspace">
      <HexCanvas
        :analysis="analysis"
        :selected-key="effectiveSelectedKey"
        :zoom="zoom"
        @cell-click="onCellClick"
      />

      <aside class="sidebar">
        <SelectedDetail v-if="selectedTarget" :target="selectedTarget" />
        <HexList
          :analysis="analysis"
          :selected-key="effectiveSelectedKey"
          @select="selectedKey = $event"
          @toggle-blocked="toggleBlocked"
        />
      </aside>
    </div>
  </main>
</template>
