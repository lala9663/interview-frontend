<script setup>
// 열거형 값을 받아 한국어 배지로 그린다. map은 lib/labels.js의 표.
import { computed } from 'vue'
const props = defineProps({ map: { type: Object, required: true }, value: { type: String, default: null }, dot: Boolean })
const item = computed(() => props.map[props.value] || { label: '-', tone: 'neutral' })
</script>

<template>
  <span class="badge" :class="`tone-${item.tone || 'neutral'}`">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" :class="{ 'animate-dot': item.tone === 'live' }" />
    {{ item.label }}
  </span>
</template>
