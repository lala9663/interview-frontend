import { createRouter, createWebHistory } from 'vue-router'
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
  { path: '/question-bank', name: 'bank', component: () => import('@/features/bank/QuestionBankPage.vue') },
  { path: '/:rest(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuth()
  if (!to.meta.public && !auth.isLoggedIn) return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'today' }
  return true
})
