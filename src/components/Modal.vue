<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
defineProps({ title: { type: String, required: true }, wide: Boolean })
const emit = defineEmits(['close'])
const onKey = (e) => e.key === 'Escape' && emit('close')
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" @mousedown.self="emit('close')">
      <div class="card flex max-h-[88vh] w-full animate-rise flex-col shadow-pop" :class="wide ? 'max-w-3xl' : 'max-w-lg'" role="dialog" aria-modal="true" :aria-label="title">
        <header class="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 class="h-sec">{{ title }}</h2>
          <button class="btn btn-ghost btn-icon btn-sm" aria-label="닫기" @click="emit('close')"><X :size="18" /></button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4"><slot /></div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-5 py-3"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>
