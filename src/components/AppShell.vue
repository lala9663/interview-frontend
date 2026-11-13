<script setup>
// 로그인 뒤의 공통 틀: 왼쪽 좁은 메뉴 + 위쪽 채용 선택 줄. 면접 방과 로그인 화면은 이 틀을 쓰지 않는다(meta.bare).
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarClock, Users, GitBranch, Library, Moon, Sun, LogOut, FlaskConical } from 'lucide-vue-next'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { isMock } from '@/api/http.js'
import { TRACK } from '@/lib/labels.js'
import { initials } from '@/lib/format.js'

const auth = useAuth()
const ui = useUi()
const route = useRoute()
const router = useRouter()

// 메뉴를 더할 때 여기에 한 줄. match는 이 메뉴가 켜져 보일 라우트 이름들.
const nav = [
  { to: { name: 'today' }, label: '오늘', icon: CalendarClock, match: ['today', 'prep', 'review'] },
  { to: { name: 'candidates' }, label: '면접자', icon: Users, match: ['candidates', 'candidate'] },
  { to: { name: 'pipeline' }, label: '전형 현황', icon: GitBranch, match: ['pipeline'] },
  { to: { name: 'bank' }, label: '질문 은행', icon: Library, match: ['bank'] },
]
const active = (item) => item.match.includes(route.name)
const showRecruitment = computed(() => ['candidates', 'pipeline', 'today'].includes(route.name))

onMounted(() => ui.loadRecruitments().catch((e) => ui.fail(e)))

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <aside class="flex w-[76px] shrink-0 flex-col items-center border-r border-line bg-surface py-3">
      <RouterLink :to="{ name: 'today' }" class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white dark:text-[#0d0f16]" aria-label="홈">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M4 8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5v5a3.5 3.5 0 0 1-3.5 3.5H12l-5 3.5V17A3.5 3.5 0 0 1 4 13.5z" /></svg>
      </RouterLink>
      <nav class="flex flex-1 flex-col gap-1" aria-label="주 메뉴">
        <RouterLink
          v-for="item in nav"
          :key="item.label"
          :to="item.to"
          class="flex w-[64px] flex-col items-center gap-1 rounded-xl py-2 text-[0.74rem] font-semibold transition"
          :class="active(item) ? 'bg-brand-soft text-brand-ink' : 'text-sub hover:bg-sunken hover:text-ink'"
          :aria-current="active(item) ? 'page' : undefined"
        >
          <component :is="item.icon" :size="20" :stroke-width="active(item) ? 2.4 : 2" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <button class="btn btn-ghost btn-icon mb-1" :aria-label="ui.theme === 'dark' ? '밝은 화면으로' : '어두운 화면으로'" @click="ui.toggleTheme()">
        <Sun v-if="ui.theme === 'dark'" :size="18" /><Moon v-else :size="18" />
      </button>
      <button class="btn btn-ghost btn-icon" aria-label="로그아웃" title="로그아웃" @click="logout"><LogOut :size="18" /></button>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-5 backdrop-blur">
        <div v-if="showRecruitment && ui.recruitments.length" class="flex items-center gap-1 rounded-xl bg-sunken p-1">
          <button
            v-for="r in ui.recruitments"
            :key="r.id"
            class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.9rem] font-semibold transition"
            :class="r.id === ui.recruitmentId ? 'bg-surface text-ink shadow-card' : 'text-sub hover:text-ink'"
            @click="ui.selectRecruitment(r.id)"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="r.track === 'NEW_GRAD' ? 'bg-brand' : 'bg-ok'" />
            {{ r.title }}
            <span class="text-[0.76rem] font-medium text-faint">{{ TRACK[r.track]?.label }}</span>
          </button>
        </div>
        <slot name="title" />
        <div class="ml-auto flex items-center gap-3">
          <span v-if="isMock" class="badge tone-warn" title="백엔드 없이 모의 데이터로 동작 중"><FlaskConical :size="13" />모의 데이터</span>
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[0.9rem] font-bold text-brand-ink">{{ initials(auth.user?.name) }}</span>
            <div class="leading-tight">
              <p class="text-[0.9rem] font-semibold">{{ auth.user?.name }}</p>
              <p class="text-[0.76rem] text-faint">{{ auth.user?.department }} · {{ auth.isAdmin ? '관리자' : '면접관' }}</p>
            </div>
          </div>
        </div>
      </header>
      <main class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-[1280px] px-5 py-5"><slot /></div>
      </main>
    </div>
  </div>
</template>
