<script setup>
// 열거형 값을 받아 한국어 배지로 그린다. map은 lib/labels.js의 표. 색 점은 .badge가 tone에 맞춰 그린다(dot 속성은 예전 호출을 위해 남겨 둔다).
import { computed } from 'vue'
const props = defineProps({ map: { type: Object, required: true }, value: { type: String, default: null }, dot: Boolean })
const item = computed(() => props.map[props.value] || { label: '-', tone: 'neutral' })
</script>

<template>
  <span class="badge" :class="`tone-${item.tone || 'neutral'}`">
    {{ item.label }}
  </span>
</template>
