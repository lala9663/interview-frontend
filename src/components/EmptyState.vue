<script setup>
defineProps({ title: { type: String, required: true }, hint: { type: String, default: '' } })
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
    <div class="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-sunken text-faint"><slot name="icon" /></div>
    <p class="font-semibold">{{ title }}</p>
    <p v-if="hint" class="max-w-sm text-[0.9rem] text-sub">{{ hint }}</p>
    <div class="mt-2"><slot /></div>
  </div>
</template>
