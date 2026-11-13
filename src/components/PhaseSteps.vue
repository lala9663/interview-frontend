<script setup>
// 면접 한 건의 세 단계(면접 전 → 면접 중 → 면접 후)를 화면 위에 늘 보여 준다.
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'

const props = defineProps({ interview: { type: Object, required: true }, current: { type: String, required: true } })

const steps = computed(() => {
  const it = props.interview
  const s = it.status
  const roomDone = s === 'EVALUATING' || s === 'DONE'
  return [
    { key: 'prep', label: '면접 전', hint: '사전 리포트 · 질문', to: { name: 'prep', params: { id: it.id } }, done: s !== 'WAITING' && s !== 'SCHEDULED', enabled: true },
    { key: 'room', label: '면접 중', hint: '전사 · 꼬리질문', to: { name: 'room', params: { id: it.id } }, done: roomDone, enabled: s === 'SCHEDULED' || s === 'IN_PROGRESS' },
    { key: 'review', label: '면접 후', hint: '평가 · 보고서', to: { name: 'review', params: { id: it.id } }, done: s === 'DONE', enabled: roomDone },
  ]
})
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="면접 단계">
    <template v-for="(s, i) in steps" :key="s.key">
      <span v-if="i" class="h-px w-5 bg-line" />
      <component
        :is="s.enabled && s.key !== current ? 'RouterLink' : 'span'"
        :to="s.to"
        class="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition"
        :class="[s.key === current ? 'bg-brand-soft text-brand-ink' : s.enabled ? 'text-sub hover:bg-sunken' : 'text-faint']"
        :aria-current="s.key === current ? 'step' : undefined"
      >
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full text-[0.8rem] font-bold"
          :class="s.done ? 'bg-ok text-white' : s.key === current ? 'bg-brand text-white dark:text-[#0d0f16]' : 'bg-sunken text-faint'"
        >
          <Check v-if="s.done" :size="14" :stroke-width="3" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="leading-tight">
          <span class="block text-[0.93rem] font-bold">{{ s.label }}</span>
          <span class="hidden text-[0.76rem] opacity-80 xl:block">{{ s.hint }}</span>
        </span>
      </component>
    </template>
  </nav>
</template>
