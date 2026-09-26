<script setup lang="ts">
import type { TargetVisibility } from '../geometry/visibility'
import { rationalMixedString } from '../geometry/rational'

defineProps<{
  target: TargetVisibility
}>()
</script>

<template>
  <section class="detail">
    <h2>选中目标：({{ target.cell.q }}, {{ target.cell.r }})</h2>

    <p class="verdict" :class="target.blocked ? 'blocked' : target.visible ? 'visible' : 'hidden'">
      {{ target.blocked ? '该格本身是阻挡格' : target.visible ? '视线可达' : '开线段进入阻挡格内部' }}
    </p>

    <dl v-if="target.firstBlocker">
      <dt>最先遮挡格</dt>
      <dd>({{ target.firstBlocker.q }}, {{ target.firstBlocker.r }})</dd>

      <dt>交入参数 t</dt>
      <dd>{{ rationalMixedString(target.firstBlocker.entryParameter) }}</dd>

      <dt>有理交入位置</dt>
      <dd>
        ({{ rationalMixedString(target.firstBlocker.entryPoint.x) }},
        {{ rationalMixedString(target.firstBlocker.entryPoint.y) }})
      </dd>
    </dl>

    <p v-else class="note">
      没有任何阻挡六边形与开线段有正长度内部相交；只擦边或擦顶点仍判为可见。
    </p>
  </section>
</template>

<style scoped>
.detail {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 12px 14px;
}

h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.verdict {
  margin: 0 0 10px;
  font-weight: 800;
}

.verdict.visible {
  color: #15803d;
}

.verdict.hidden {
  color: #dc2626;
}

.verdict.blocked {
  color: #334155;
}

dl {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 6px 10px;
  margin: 0;
  font-size: 13px;
}

dt {
  color: #64748b;
}

dd {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}

.note {
  margin: 0;
  color: #475569;
  font-size: 13px;
}
</style>
