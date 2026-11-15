<script setup>
// 한 면접자의 면접 차수들을 가로 진행 표시로 그린다(경력: 포트폴리오 → 직무 → 인성).
import { Check } from 'lucide-vue-next'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'
import { mdhm } from '@/lib/format.js'

defineProps({ interviews: { type: Array, required: true }, compact: Boolean })
const emit = defineEmits(['open'])

const dot = (s) =>
  ({ DONE: 'bg-ok text-white', IN_PROGRESS: 'bg-live text-white', EVALUATING: 'bg-warn text-white', SCHEDULED: 'bg-brand text-white dark:text-[#0d0f16]' })[s] || 'bg-sunken text-faint'
</script>

<template>
  <ol class="flex items-start">
    <li v-for="(it, i) in interviews" :key="it.id" class="flex min-w-0 flex-1 items-start">
      <button class="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md px-1 py-1 text-center hover:bg-sunken" @click="emit('open', it)">
        <span class="flex w-full items-center">
          <span class="h-0.5 flex-1" :class="i === 0 ? 'bg-transparent' : it.status === 'WAITING' ? 'bg-line' : 'bg-ok/50'" />
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold" :class="[dot(it.status), it.status === 'IN_PROGRESS' ? 'animate-dot' : '']">
            <Check v-if="it.status === 'DONE'" :size="15" :stroke-width="3" /><template v-else>{{ it.seq }}</template>
          </span>
          <span class="h-0.5 flex-1" :class="i === interviews.length - 1 ? 'bg-transparent' : it.status === 'DONE' ? 'bg-ok/50' : 'bg-line'" />
        </span>
        <span class="w-full truncate text-[0.88rem] font-semibold">{{ labelOf(INTERVIEW_TYPE, it.type) }}</span>
        <span class="text-[0.78rem]" :class="it.status === 'WAITING' ? 'text-faint' : 'text-sub'">
          {{ labelOf(INTERVIEW_STATUS, it.status) }}<template v-if="!compact && it.scheduledAt"> · {{ mdhm(it.scheduledAt) }}</template>
        </span>
      </button>
    </li>
  </ol>
</template>
