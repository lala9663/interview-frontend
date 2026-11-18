<script setup>
// 내 평가: 공식 평가는 채용 시스템에 입력한다. 여기는 정리하고 복사해 가는 곳이다.
import { computed, nextTick, ref, watch } from 'vue'
import { ClipboardCopy, Info, Send, Sparkles } from 'lucide-vue-next'
import { interviewApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const props = defineProps({ interviewId: { type: [String, Number], required: true }, criteria: { type: Array, required: true }, aiScores: { type: Array, default: () => [] },
  // 평가 의견 초안(점수 없이 글만). 비어 있으면 버튼이 나오지 않는다
  opinionDraft: { type: String, default: '' },
})
const emit = defineEmits(['submitted'])
const ui = useUi()

const form = ref({ memo: '', scores: [], grade: null, submitted: false })
const saveState = ref('idle')
const loaded = ref(false)
const BASE_GRADES = ['A', 'B', 'C', 'D']
// 저장된 등급이 기본 네 단계에 없으면(예: B+) 그 값도 고를 수 있게 보여 준다.
const grades = computed(() => (form.value.grade && !BASE_GRADES.includes(form.value.grade) ? [...BASE_GRADES, form.value.grade] : BASE_GRADES))

// 평가 항목마다 점수 칸을 하나씩 만들어 둔다(렌더 중에 만들지 않는다).
function ensureRows() {
  props.criteria.forEach((c) => {
    if (!form.value.scores.some((s) => s.criterionCode === c.code)) form.value.scores.push({ criterionCode: c.code, score: null, comment: '' })
  })
}
const EMPTY = { score: null, comment: '' }
const row = (code) => form.value.scores.find((s) => s.criterionCode === code) || EMPTY

interviewApi
  .myEvaluation(props.interviewId)
  .then((ev) => (form.value = { memo: ev.memo || '', scores: ev.scores || [], grade: ev.grade ?? null, submitted: !!ev.submitted }))
  .catch(() => {})
  .finally(async () => {
    ensureRows()
    await nextTick()
    loaded.value = true
  })
watch(() => props.criteria, ensureRows)
// AI 점수는 내 점수를 넣은 항목만 보여 준다(먼저 보면 따라가게 된다).
const aiOf = (code) => props.aiScores.find((s) => s.criterionCode === code)
const complete = computed(() => props.criteria.every((c) => row(c.code).score) && form.value.grade)

let timer = null
watch(
  form,
  () => {
    if (!loaded.value) return
    saveState.value = 'saving'
    clearTimeout(timer)
    timer = setTimeout(save, 900)
  },
  { deep: true },
)
async function save() {
  try {
    await interviewApi.saveMyEvaluation(props.interviewId, form.value)
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

async function submit() {
  form.value.submitted = true
  clearTimeout(timer)
  await save()
  if (saveState.value === 'saved') {
    ui.toast('평가를 제출했습니다.', 'ok')
    emit('submitted')
  } else {
    form.value.submitted = false
    ui.toast('저장하지 못했습니다. 다시 시도해 주세요.', 'bad')
  }
}

/** 의견 초안을 메모 아래에 붙인다(이미 적은 메모는 지우지 않는다) */
function insertDraft() {
  if (form.value.memo.includes(props.opinionDraft)) return ui.toast('이미 넣은 초안입니다.')
  form.value.memo = [form.value.memo.trim(), props.opinionDraft].filter(Boolean).join('\n\n')
  ui.toast('의견 초안을 넣었습니다. 읽고 고쳐 주세요.', 'ok')
}

async function copy() {
  const lines = [
    `등급: ${form.value.grade || '-'}`,
    ...props.criteria.map((c) => `${c.name}: ${row(c.code).score ?? '-'}/${c.maxScore}${row(c.code).comment ? ` — ${row(c.code).comment}` : ''}`),
    '',
    form.value.memo,
  ]
  try {
    await navigator.clipboard.writeText(lines.join('\n').trim())
    ui.toast('평가 내용을 복사했습니다. 채용 시스템에 붙여 넣으세요.', 'ok')
  } catch {
    ui.toast('복사하지 못했습니다. 직접 선택해 복사해 주세요.', 'bad')
  }
}
</script>

<template>
  <section class="card flex flex-col">
    <header class="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 class="h-sec">내 평가</h2>
      <span class="text-[0.78rem]" :class="saveState === 'error' ? 'text-bad' : 'text-faint'">
        {{ { saving: '저장하는 중…', saved: '저장됨', error: '저장 실패' }[saveState] || '자동 저장' }}
      </span>
    </header>

    <p class="flex gap-2 border-b border-line bg-warn-soft/50 px-4 py-2.5 text-[0.84rem] leading-snug text-warn">
      <Info :size="15" class="mt-0.5 shrink-0" />
      <span>공식 평가는 <b>채용 시스템</b>에 입력해야 합니다. 여기 적은 내용은 그곳에 자동으로 들어가지 않습니다.</span>
    </p>

    <div class="space-y-4 p-4">
      <div v-for="c in criteria" :key="c.code">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.93rem] font-semibold" :title="c.description">{{ c.name }}</p>
          <div class="flex gap-1" role="radiogroup" :aria-label="`${c.name} 점수`">
            <button
              v-for="n in c.maxScore"
              :key="n"
              class="h-8 w-8 rounded border text-[0.9rem] font-bold transition"
              :class="row(c.code).score === n ? 'border-brand bg-brand text-white dark:text-[#0d0f16]' : 'border-line text-sub hover:border-brand/50'"
              role="radio"
              :aria-checked="row(c.code).score === n"
              @click="row(c.code).score = row(c.code).score === n ? null : n"
            >
              {{ n }}
            </button>
          </div>
        </div>
        <p v-if="row(c.code).score && aiOf(c.code)" class="mt-1 text-[0.8rem] text-faint">
          AI 참고: {{ aiOf(c.code).score ?? '근거 부족' }}<template v-if="aiOf(c.code).score">/{{ c.maxScore }}</template>
        </p>
        <input v-model="row(c.code).comment" class="input mt-1.5 h-8 text-[0.88rem]" :placeholder="c.description" :aria-label="`${c.name} 코멘트`" />
      </div>

      <div>
        <p class="label mb-1.5">종합 등급</p>
        <div class="flex gap-1.5">
          <button v-for="g in grades" :key="g" class="h-9 flex-1 rounded-md border text-[0.95rem] font-bold transition" :class="form.grade === g ? 'border-brand bg-brand text-white dark:text-[#0d0f16]' : 'border-line text-sub hover:border-brand/50'" @click="form.grade = form.grade === g ? null : g">{{ g }}</button>
        </div>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <p class="label">메모 · 종합 의견</p>
          <button v-if="opinionDraft && !form.submitted" class="btn btn-sm" title="보고서 내용으로 의견 초안을 메모 아래에 붙입니다. 점수는 넣지 않습니다" @click="insertDraft"><Sparkles :size="14" />의견 초안 넣기</button>
        </div>
        <textarea v-model="form.memo" :rows="opinionDraft ? 9 : 6" class="input" placeholder="면접 중 적은 메모가 이어집니다." />
        <p v-if="opinionDraft" class="mt-1 text-[0.78rem] leading-snug text-faint">초안은 AI가 쓴 참고용 글이고 점수는 들어 있지 않습니다. 전사 공통 평가 양식을 받으면 그 항목에 맞춰 드립니다.</p>
      </div>
    </div>

    <footer class="flex gap-2 border-t border-line p-3">
      <button class="btn flex-1" @click="copy"><ClipboardCopy :size="16" />복사</button>
      <button class="btn btn-primary flex-1" :disabled="!complete || form.submitted" :title="complete ? '' : '모든 항목의 점수와 등급을 넣어 주세요'" @click="submit">
        <Send :size="15" />{{ form.submitted ? '제출됨' : '평가 제출' }}
      </button>
    </footer>
  </section>
</template>
