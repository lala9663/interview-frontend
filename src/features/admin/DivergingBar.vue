<script setup>
// 0을 가운데 둔 양쪽 막대(편차용). 값은 늘 숫자로도 함께 적어 색에만 기대지 않는다.
// 양수는 오른쪽(pole-a), 음수는 왼쪽(pole-b). max는 막대가 끝까지 차는 절댓값.
import { computed } from 'vue'

const props = defineProps({ value: { type: Number, default: null }, max: { type: Number, default: 1 }, title: { type: String, default: '' } })
const width = computed(() => (props.value == null ? 0 : Math.min(100, (Math.abs(props.value) / props.max) * 100)))
const text = computed(() => (props.value == null ? '–' : `${props.value > 0 ? '+' : ''}${props.value.toFixed(2)}`))
</script>

<template>
  <span class="flex items-center gap-2" :title="title">
    <span class="relative flex h-2.5 w-full min-w-[80px] items-center">
      <span class="absolute inset-x-0 h-px bg-line" />
      <span class="absolute left-1/2 h-3.5 w-px -translate-x-1/2 bg-faint" />
      <span
        v-if="value"
        class="absolute h-2.5"
        :class="value > 0 ? 'left-1/2 rounded-r bg-pole-a' : 'right-1/2 rounded-l bg-pole-b'"
        :style="{ width: `${width / 2}%` }"
      />
    </span>
    <span class="w-12 shrink-0 text-right text-[0.9rem] font-semibold tabular-nums" :class="value == null ? 'text-faint' : 'text-ink'">{{ text }}</span>
  </span>
</template>
