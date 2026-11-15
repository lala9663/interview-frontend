<script setup>
// 로그인 뒤의 공통 틀: 왼쪽 좁은 메뉴 + 위쪽 채용 선택 줄. 면접 방과 로그인 화면은 이 틀을 쓰지 않는다(meta.bare).
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarClock, Users, GitBranch, Library, LayoutDashboard, Moon, Sun, LogOut, FlaskConical } from 'lucide-vue-next'
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
// admin: true인 메뉴는 관리자에게만 보인다.
const allNav = [
  { to: { name: 'today' }, label: '오늘', icon: CalendarClock, match: ['today', 'prep', 'review'] },
  { to: { name: 'candidates' }, label: '면접자', icon: Users, match: ['candidates', 'candidate'] },
  { to: { name: 'pipeline' }, label: '진행 현황', icon: GitBranch, match: ['pipeline'] },
  { to: { name: 'bank' }, label: '질문 은행', icon: Library, match: ['bank'] },
  { to: { name: 'admin' }, label: '관리', icon: LayoutDashboard, match: ['admin', 'admin-setup', 'admin-quality', 'admin-interviewers'], admin: true },
]
const nav = computed(() => allNav.filter((item) => !item.admin || auth.isAdmin))
const active = (item) => item.match.includes(route.name)
// 신입/경력 탭은 목록 화면에서만 보인다. 면접 한 건의 화면(면접 전·후, 면접자 상세)에서는 숨긴다.
const showTrackTabs = computed(() => ['today', 'candidates', 'pipeline'].includes(route.name) || String(route.name).startsWith('admin'))
const TRACK_TAB = { NEW_GRAD: '신입 공채', EXPERIENCED: '경력 채용' }

onMounted(() => ui.loadRecruitments().catch((e) => ui.fail(e)))

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <aside class="flex w-[76px] shrink-0 flex-col items-center border-r border-line bg-sunken/50 py-3">
      <RouterLink :to="{ name: 'today' }" class="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-brand text-[0.84rem] font-extrabold tracking-tight text-white dark:text-[#0d0f16]" aria-label="DSInterview 홈">
        DS
      </RouterLink>
      <nav class="flex flex-1 flex-col gap-1" aria-label="주 메뉴">
        <RouterLink
          v-for="item in nav"
          :key="item.label"
          :to="item.to"
          class="flex w-[64px] flex-col items-center gap-1 rounded-md py-2 text-[0.74rem] font-semibold transition"
          :class="active(item) ? 'bg-surface text-brand shadow-[0_0_0_1px_rgb(var(--line))]' : 'text-sub hover:bg-sunken hover:text-ink'"
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
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-5">
        <span class="text-[1rem] font-extrabold tracking-[-0.02em]">DS<span class="text-brand">Interview</span></span>
        <span class="h-4 w-px bg-line" />
        <template v-if="showTrackTabs && ui.tracks.length">
          <div class="flex h-full items-stretch gap-1" role="tablist" aria-label="채용 구분">
            <button
              v-for="t in ui.tracks"
              :key="t"
              class="relative flex items-center gap-2 px-3 text-[0.95rem] font-bold transition-colors"
              :class="t === ui.track ? 'text-ink' : 'text-faint hover:text-sub'"
              role="tab"
              :aria-selected="t === ui.track"
              @click="ui.selectTrack(t)"
            >
              <span class="h-2 w-2 rounded-full" :class="t === 'NEW_GRAD' ? 'bg-brand' : 'bg-ok'" />
              {{ TRACK_TAB[t] || TRACK[t]?.label }}
              <span v-if="t === ui.track" class="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />
            </button>
          </div>
          <select
            v-if="ui.trackRecruitments.length > 1"
            class="input h-8 w-auto max-w-[260px] text-[0.88rem]"
            aria-label="채용 선택"
            :value="ui.recruitmentId"
            @change="ui.selectRecruitment(Number($event.target.value))"
          >
            <option v-for="r in ui.trackRecruitments" :key="r.id" :value="r.id">{{ r.title }}</option>
          </select>
          <span v-else class="hidden text-[0.86rem] text-faint md:inline">{{ ui.recruitment?.title }}</span>
        </template>
        <slot name="title" />
        <div class="ml-auto flex items-center gap-3">
          <span v-if="isMock" class="badge tone-warn" title="백엔드 없이 모의 데이터로 동작 중"><FlaskConical :size="13" />모의 데이터</span>
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-[0.86rem] font-bold text-sub">{{ initials(auth.user?.name) }}</span>
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
