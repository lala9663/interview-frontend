<script setup>
// 관리 메뉴의 하위 탭. 탭을 더하면 여기와 router/index.js, AppShell.vue의 match에 한 줄씩.
import { useRoute } from 'vue-router'
import { Activity, FileSpreadsheet, Gauge, Scale } from 'lucide-vue-next'

const route = useRoute()
const tabs = [
  { name: 'admin', label: '운영 현황', icon: Activity },
  { name: 'admin-setup', label: '등록 · 매칭', icon: FileSpreadsheet },
  { name: 'admin-quality', label: 'AI 품질', icon: Gauge },
  { name: 'admin-interviewers', label: '면접관 편차', icon: Scale },
]
</script>

<template>
  <nav class="mt-2 flex w-fit gap-0.5 rounded-xl bg-sunken p-1" aria-label="관리 하위 메뉴">
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="{ name: t.name }"
      class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.9rem] font-semibold transition"
      :class="route.name === t.name ? 'bg-surface text-ink shadow-card' : 'text-sub hover:text-ink'"
      :aria-current="route.name === t.name ? 'page' : undefined"
    >
      <component :is="t.icon" :size="15" />{{ t.label }}
    </RouterLink>
  </nav>
</template>
