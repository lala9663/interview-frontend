import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth.js'

// 화면을 더할 때: features/<기능>/<Page>.vue를 만들고 여기에 한 줄, components/AppShell.vue의 nav에 한 줄.
const routes = [
  { path: '/login', name: 'login', component: () => import('@/features/auth/LoginPage.vue'), meta: { public: true, bare: true } },
  { path: '/', name: 'today', component: () => import('@/features/today/TodayPage.vue') },
  { path: '/candidates', name: 'candidates', component: () => import('@/features/candidates/CandidatesPage.vue') },
  { path: '/candidates/:id', name: 'candidate', component: () => import('@/features/candidates/CandidateDetailPage.vue'), props: true },
  { path: '/interviews/:id', name: 'prep', component: () => import('@/features/interview/PrepPage.vue'), props: true },
  { path: '/interviews/:id/room', name: 'room', component: () => import('@/features/room/RoomPage.vue'), props: true, meta: { bare: true } },
  { path: '/interviews/:id/review', name: 'review', component: () => import('@/features/review/ReviewPage.vue'), props: true },
  { path: '/pipeline', name: 'pipeline', component: () => import('@/features/pipeline/PipelinePage.vue') },
  // 관리(관리자 전용). 하위 탭은 features/admin/AdminTabs.vue의 표와 맞춘다.
  { path: '/admin', name: 'admin', component: () => import('@/features/admin/OperationsPage.vue'), meta: { admin: true } },
  { path: '/admin/setup', name: 'admin-setup', component: () => import('@/features/admin/SetupPage.vue'), meta: { admin: true } },
  { path: '/admin/quality', name: 'admin-quality', component: () => import('@/features/admin/QualityPage.vue'), meta: { admin: true } },
  { path: '/admin/interviewers', name: 'admin-interviewers', component: () => import('@/features/admin/InterviewersPage.vue'), meta: { admin: true } },
  { path: '/question-bank', name: 'bank', component: () => import('@/features/bank/QuestionBankPage.vue') },
  { path: '/:rest(.*)*', redirect: '/' },
]

// 파일로 여는 시연용 빌드(VITE_ROUTER=hash)는 서버가 없으므로 주소의 # 뒤로 화면을 구분한다
const history = import.meta.env.VITE_ROUTER === 'hash' ? createWebHashHistory() : createWebHistory()

export const router = createRouter({ history, routes })

router.beforeEach((to) => {
  const auth = useAuth()
  if (!to.meta.public && !auth.isLoggedIn) return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'today' }
  // 관리자 전용 화면. 실제 권한 검사는 백엔드가 한다.
  if (to.meta.admin && !auth.isAdmin) return { name: 'today' }
  return true
})
