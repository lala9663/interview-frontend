<script setup>
// 개발용 로그인(사번 선택). 사내에서는 AD SSO로 바뀐다: docs/auth.md
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, ShieldCheck } from 'lucide-vue-next'
import { useAuth } from '@/stores/auth.js'

const auth = useAuth()
const route = useRoute()
const router = useRouter()

const presets = [
  { employeeNo: 'E1001', name: '김서연', hint: '관리자 · People팀' },
  { employeeNo: 'E1002', name: '박준호', hint: '면접관 · SW개발' },
  { employeeNo: 'E1003', name: '이하린', hint: '면접관 · HW설계' },
]
const employeeNo = ref('E1001')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (!employeeNo.value.trim() || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.devLogin(employeeNo.value.trim())
    router.replace(route.query.next ? String(route.query.next) : { name: 'today' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg p-6">
    <div class="w-full max-w-[400px] animate-rise">
      <div class="mb-6 flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-[1rem] font-extrabold tracking-tight text-white dark:text-[#0d0f16]">
          DS
        </span>
        <div>
          <h1 class="text-xl font-extrabold tracking-[-0.02em]">DS<span class="text-brand">Interview</span></h1>
          <p class="text-[0.9rem] text-sub">면접 전 준비부터 보고서까지 한곳에서</p>
        </div>
      </div>

      <form class="card card-pad space-y-4 p-5" @submit.prevent="submit">
        <p v-if="route.query.expired" class="rounded-md bg-warn-soft px-3 py-2 text-[0.9rem] font-medium text-warn">로그인 시간이 지났습니다. 다시 로그인해 주세요.</p>
        <div>
          <p class="label mb-2">개발용 계정</p>
          <div class="grid gap-2">
            <button
              v-for="p in presets"
              :key="p.employeeNo"
              type="button"
              class="flex items-center justify-between rounded-md border px-3.5 py-2.5 text-left transition"
              :class="employeeNo === p.employeeNo ? 'border-brand bg-brand-soft' : 'border-line hover:bg-sunken'"
              @click="employeeNo = p.employeeNo"
            >
              <span>
                <span class="block font-semibold">{{ p.name }}</span>
                <span class="text-[0.84rem] text-sub">{{ p.hint }}</span>
              </span>
              <span class="text-[0.84rem] font-semibold text-faint">{{ p.employeeNo }}</span>
            </button>
          </div>
        </div>
        <div>
          <label class="label mb-1.5 block" for="emp">사번</label>
          <input id="emp" v-model="employeeNo" class="input" autocomplete="off" />
        </div>
        <p v-if="error" class="text-[0.9rem] font-medium text-bad" role="alert">{{ error }}</p>
        <button class="btn btn-primary btn-lg w-full" :disabled="busy">
          {{ busy ? '로그인하는 중…' : '로그인' }} <ArrowRight v-if="!busy" :size="18" />
        </button>
      </form>
      <p class="mt-4 flex items-center justify-center gap-1.5 text-[0.84rem] text-faint">
        <ShieldCheck :size="15" /> 사내에서는 AD 계정(SSO)으로 로그인합니다
      </p>
    </div>
  </div>
</template>
