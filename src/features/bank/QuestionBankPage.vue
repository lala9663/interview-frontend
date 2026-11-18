<script setup>
// 질문 은행: 직무별로 자주 쓰는 질문. 사전 질문 생성과, 면접 중 "면접관의 말" 판정에 함께 쓰인다.
import { onMounted, ref, watch } from 'vue'
import { Library, Plus, Search, Trash2 } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { miscApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'
import { has } from '@/lib/features.js'

// 경력용 면접 종류는 주차별 목업에서 경력 채용이 보이는 주차부터 고를 수 있다(lib/features.js)
// 신입도 경력도 직무·인성 면접만 본다(2026-11-18 확인): 11/18 회의 반영이 켜지면 포트폴리오와 PT를 고르는 곳에서 뺀다
const typeChoices = Object.keys(INTERVIEW_TYPE).filter((k) => (has('experienced') || !['JOB', 'PORTFOLIO'].includes(k)) && !(has('feedback1118') && ['PORTFOLIO', 'PT'].includes(k)))

const auth = useAuth()
const ui = useUi()
const rows = ref([])
const q = ref('')
const jobCode = ref('')
const adding = ref(false)
const form = ref({ jobCode: 'SW', interviewType: has('feedback1118') ? 'JOB' : 'PT', category: '', text: '' })
const jobCodes = ref([])

async function load() {
  try {
    rows.value = (await miscApi.questionBank({ q: q.value, jobCode: jobCode.value })).items
    if (!jobCode.value && !q.value) jobCodes.value = [...new Set(rows.value.map((r) => r.jobCode))].sort()
  } catch (e) {
    ui.fail(e)
  }
}
onMounted(load)
watch(jobCode, load)
let timer = null
watch(q, () => { clearTimeout(timer); timer = setTimeout(load, 250) })

async function add() {
  if (!form.value.text.trim()) return
  try {
    await miscApi.addBankQuestion({ ...form.value, text: form.value.text.trim() })
    adding.value = false
    form.value.text = ''
    ui.toast('질문을 추가했습니다.', 'ok')
    load()
  } catch (e) {
    ui.fail(e)
  }
}
async function remove(row) {
  try {
    await miscApi.removeBankQuestion(row.id)
    rows.value = rows.value.filter((r) => r.id !== row.id)
  } catch (e) {
    ui.fail(e)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">질문 은행</h1>
        <p class="text-[0.9rem] text-sub">면접 중에 면접관이 여기 있는 질문을 말하면 자동으로 알아봅니다 · {{ rows.length }}개</p>
      </div>
      <button v-if="auth.isAdmin" class="btn btn-primary" @click="adding = true"><Plus :size="16" />질문 추가</button>
    </div>

    <section class="card">
      <div class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <div class="relative w-64">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input v-model="q" class="input pl-9" placeholder="질문 검색" aria-label="질문 검색" />
        </div>
        <div class="ml-1 flex items-center border-l border-line pl-2" role="tablist" aria-label="직무">
          <button class="tab h-9" :class="{ 'tab-on': jobCode === '' }" role="tab" :aria-selected="jobCode === ''" @click="jobCode = ''">전체</button>
          <button v-for="j in jobCodes" :key="j" class="tab h-9" :class="{ 'tab-on': jobCode === j }" role="tab" :aria-selected="jobCode === j" @click="jobCode = j">{{ j }}</button>
        </div>
      </div>
      <EmptyState v-if="!rows.length" title="질문이 없습니다"><template #icon><Library :size="22" /></template></EmptyState>
      <ul v-else class="divide-y divide-line">
        <li v-for="r in rows" :key="r.id" class="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sunken/70">
          <span class="w-10 shrink-0 text-[0.84rem] font-semibold tabular-nums text-sub">{{ r.jobCode }}</span>
          <span class="w-24 shrink-0 text-[0.84rem] text-sub">{{ labelOf(INTERVIEW_TYPE, r.interviewType, '공통') }}</span>
          <span class="w-24 shrink-0 truncate text-[0.84rem] text-faint">{{ r.category }}</span>
          <span class="min-w-0 flex-1 font-medium">{{ r.text }}</span>
          <button v-if="auth.isAdmin" class="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="삭제" @click="remove(r)"><Trash2 :size="15" /></button>
        </li>
      </ul>
    </section>

    <Modal v-if="adding" title="질문 추가" @close="adding = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label mb-1.5 block" for="jc">직무 코드</label><input id="jc" v-model="form.jobCode" class="input" /></div>
          <div><label class="label mb-1.5 block" for="cat">분류</label><input id="cat" v-model="form.category" class="input" placeholder="예: CS기초" /></div>
        </div>
        <div>
          <p class="label mb-1.5">면접 유형</p>
          <div class="flex flex-wrap gap-1.5"><button v-for="k in typeChoices" :key="k" class="btn btn-sm" :class="form.interviewType === k ? 'btn-primary' : ''" @click="form.interviewType = k">{{ labelOf(INTERVIEW_TYPE, k) }}</button></div>
        </div>
        <div><label class="label mb-1.5 block" for="qt">질문</label><textarea id="qt" v-model="form.text" rows="3" class="input" /></div>
      </div>
      <template #footer>
        <button class="btn" @click="adding = false">취소</button>
        <button class="btn btn-primary" :disabled="!form.text.trim()" @click="add">추가</button>
      </template>
    </Modal>
  </div>
</template>
