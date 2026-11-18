<script setup>
// 켜고 끄는 스위치. 값은 부모가 들고 있고, 누르면 바꿀 값을 알려 준다.
defineProps({ modelValue: Boolean, label: { type: String, required: true }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    class="relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50"
    :class="modelValue ? 'bg-brand' : 'bg-line'"
    :aria-checked="modelValue"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-card transition-all" :class="modelValue ? 'left-[18px]' : 'left-0.5'" />
  </button>
</template>
