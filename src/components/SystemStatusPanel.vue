<script setup>
// 시스템 상태의 내용(화면 시안): 서비스 연결 상태와 "지금 요청하면 기다리는 시간".
// 위쪽 줄의 상태 버튼(SystemStatusChip)이 띄우는 창과 관리 > 시스템 상태가 같이 쓴다.
import { SYSTEM_STATUS, labelOf, toneOf } from '@/lib/labels.js'
import { hm } from '@/lib/format.js'

defineProps({ status: { type: Object, required: true }, columns: { type: Number, default: 2 } })
const secs = (s) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60 ? `${s % 60}초` : ''}`.trim() : `${s}초`)
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="label mb-1.5 flex items-center justify-between">서비스 연결 상태 <span class="font-medium tabular-nums">{{ hm(status.checkedAt) }} 확인</span></p>
      <ul class="grid gap-px overflow-hidden rounded-md border border-line bg-line" :class="columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
        <li v-for="s in status.services" :key="s.key" class="bg-surface px-3 py-2.5">
          <div class="flex items-center justify-between gap-2">
            <b class="text-[0.93rem]">{{ s.name }}</b>
            <span class="badge" :class="`tone-${toneOf(SYSTEM_STATUS, s.status)}`">{{ labelOf(SYSTEM_STATUS, s.status) }}</span>
          </div>
          <p class="text-[0.8rem] text-faint">{{ s.detail }}</p>
          <p v-if="s.note" class="mt-1 text-[0.82rem] leading-snug text-warn">{{ s.note }}</p>
        </li>
      </ul>
    </div>

    <div>
      <p class="label mb-1.5">지금 요청하면 기다리는 시간</p>
      <ul class="divide-y divide-line rounded-md border border-line">
        <li v-for="w in status.waits" :key="w.key" class="flex items-center justify-between gap-3 px-3 py-2">
          <span class="text-[0.93rem]">{{ w.label }}</span>
          <span class="text-right">
            <b class="tabular-nums" :class="w.seconds > w.usual * 1.5 ? 'text-warn' : ''">약 {{ secs(w.seconds) }}</b>
            <span class="ml-2 text-[0.8rem] tabular-nums text-faint">평소 {{ secs(w.usual) }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
