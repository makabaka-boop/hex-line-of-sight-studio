<script setup lang="ts">
import type { VisibilityAnalysis } from '../geometry/visibility'

defineProps<{
  analysis: VisibilityAnalysis
  selectedKey: string
}>()

const emit = defineEmits<{
  select: [key: string]
  toggleBlocked: [key: string]
}>()
</script>

<template>
  <section class="list-panel">
    <div class="list-title">
      <h2>格列表</h2>
      <span>与画布共用同一份分析结果</span>
    </div>

    <div class="list" role="list">
      <button
        v-for="target in analysis.targets"
        :key="target.cell.key"
        type="button"
        class="row"
        :class="[
          target.blocked ? 'blocked' : target.visible ? 'visible' : 'hidden',
          { active: target.cell.key === selectedKey }
        ]"
        @click="emit('select', target.cell.key)"
      >
        <span class="coord">({{ target.cell.q }}, {{ target.cell.r }})</span>
        <span class="state">
          {{ target.blocked ? '阻挡格' : target.visible ? '可见' : '不可见' }}
        </span>
        <span
          v-if="target.firstBlocker"
          class="blocker"
        >
          首挡 ({{ target.firstBlocker.q }}, {{ target.firstBlocker.r }})
        </span>
        <span
          class="toggle"
          role="switch"
          :aria-checked="target.blocked"
          @click.stop="emit('toggleBlocked', target.cell.key)"
        >
          {{ target.blocked ? '解除' : '阻挡' }}
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.list-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.list-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.list-title h2 {
  margin: 0;
  font-size: 16px;
}

.list-title span {
  font-size: 12px;
  color: #64748b;
}

.list {
  overflow: auto;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: white;
}

.row {
  width: 100%;
  display: grid;
  grid-template-columns: 64px 58px 1fr 52px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-bottom: 1px solid #e2e8f0;
  padding: 7px 10px;
  background: white;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.row:last-child {
  border-bottom: 0;
}

.row:hover {
  background: #f8fafc;
}

.row.active {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.row.blocked {
  background: #334155;
  color: white;
}

.row.blocked .state,
.row.blocked .blocker {
  color: #e2e8f0;
}

.row.blocked:hover {
  background: #1e293b;
}

.row.hidden .state {
  color: #dc2626;
  font-weight: 700;
}

.row.visible .state {
  color: #15803d;
  font-weight: 700;
}

.row.blocked .state {
  color: #e2e8f0;
}

.coord {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.state {
  font-size: 13px;
}

.blocker {
  font-size: 12px;
  color: #c2410c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle {
  justify-self: end;
  border: 1px solid currentColor;
  border-radius: 6px;
  padding: 2px 5px;
  font-size: 12px;
}

.row.blocked .toggle {
  border-color: white;
}
</style>
