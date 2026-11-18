<script setup>
// 관리 메뉴의 하위 탭. 탭을 더하면 여기와 router/index.js, AppShell.vue의 match에 한 줄씩.
import { useRoute } from 'vue-router'
import { Activity, CalendarDays, Cpu, Drama, FileSpreadsheet, Gauge, HeartPulse, Scale } from 'lucide-vue-next'
import { has } from '@/lib/features.js'

const route = useRoute()
const tabs = [
  { name: 'admin', label: '운영 현황', icon: Activity, feature: 'operations' },
  // 자동 매칭을 뺀 화면 시안(feedback1118)에서는 이름이 "등록"이다
  { name: 'admin-setup', label: has('feedback1118') ? '등록' : '등록 · 매칭', icon: FileSpreadsheet },
  { name: 'admin-calendar', label: '일정 달력', icon: CalendarDays, feature: 'calendar' },
  { name: 'admin-quality', label: 'AI 품질', icon: Gauge, feature: 'quality' },
  { name: 'admin-interviewers', label: '면접관 편차', icon: Scale, feature: 'interviewerStats' },
  { name: 'admin-personas', label: '면접 페르소나', icon: Drama, feature: 'persona' },
  { name: 'admin-models', label: 'AI 모델', icon: Cpu, feature: 'modelSwitch' },
  { name: 'admin-system', label: '시스템 상태', icon: HeartPulse, feature: 'systemStatus' },
].filter((t) => !t.feature || has(t.feature))
</script>

<template>
  <nav class="mt-1 flex border-b border-line" aria-label="관리 하위 메뉴">
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="{ name: t.name }"
      class="tab"
      :class="{ 'tab-on': route.name === t.name }"
      :aria-current="route.name === t.name ? 'page' : undefined"
    >
      <component :is="t.icon" :size="15" />{{ t.label }}
    </RouterLink>
  </nav>
</template>
