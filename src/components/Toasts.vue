<script setup>
import { useUi } from '@/stores/ui.js'
const ui = useUi()
</script>

<template>
  <div class="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
    <div
      v-for="t in ui.toasts"
      :key="t.id"
      class="pointer-events-auto animate-rise rounded-xl px-4 py-2.5 text-[0.93rem] font-semibold shadow-pop"
      :class="t.tone === 'bad' ? 'bg-bad text-white' : t.tone === 'ok' ? 'bg-ok text-white' : 'bg-ink text-surface'"
      role="status"
    >
      {{ t.message }}
    </div>
  </div>
</template>
