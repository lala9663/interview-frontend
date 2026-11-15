<script setup>
// 시연용 설명 띠: 모의 대본이 도는 동안 "지금 시스템이 무엇을 하는지"를 보여 주고, 재생을 멈추거나 빠르게 한다.
// 시연용 빌드(VITE_DEMO_GUIDE=on)에서만 쓴다. 실제 Agent에 붙었을 때는 나오지 않는다.
import { has } from '@/lib/features.js'
import { computed } from 'vue'
import { Check, FastForward, Pause, Play, RotateCcw } from 'lucide-vue-next'
import { demo } from '@/mocks/demo.js'

const STEPS = [
  { key: 'LISTEN', label: '음성을 글로', by: 'Whisper' },
  { key: 'REFINE', label: '문장 다듬기 · 화자 구분', by: 'LLM' },
  { key: 'MATCH', label: '준비한 질문 찾기', by: '유사도 비교' },
  { key: 'FOLLOWUP', label: '꼬리질문 만들기', by: 'LLM' },
]
const WHO = { INTERVIEWER: '면접관', CANDIDATE: '지원자' }
const CAPTION = {
  LISTEN: (who) => `${who}의 말을 받아 적고 있습니다. 말하는 동안 글자가 조금씩 늘어납니다.`,
  REFINE: () => '군말과 반복을 걷어내 읽기 좋은 문장으로 바꾸고, 누가 한 말인지 가립니다.',
  MATCH: () => '준비한 질문 중에서 방금 한 질문을 찾아 왼쪽 목록에 체크합니다.',
  FOLLOWUP: () => '지원자의 답에서 더 물어볼 것을 찾아 오른쪽에 후보로 올립니다.',
  IDLE: () => '다음 말을 기다립니다.',
  END: () => `대본이 끝났습니다. 위쪽의 "면접 종료"를 누르면 ${has('aiEvaluation') ? 'AI 참고 평가와 보고서' : '보고서'}를 볼 수 있습니다.`,
}

const caption = computed(() => {
  if (demo.paused) return '멈춰 있습니다. 재생을 누르면 이어서 진행합니다.'
  return (CAPTION[demo.stage] || CAPTION.IDLE)(WHO[demo.speaker] || '말하는 사람')
})
const stateOf = (key) => (demo.stage === key ? 'now' : demo.done.includes(key) ? 'done' : 'todo')
const restart = () => window.location.reload()
</script>

<template>
  <div class="flex shrink-0 items-center gap-3 border-b border-line bg-sunken px-4 py-1.5 text-[0.84rem]" role="status" aria-label="시연 안내">
    <span class="badge tone-warn shrink-0">시연</span>

    <ol class="flex shrink-0 items-center gap-1.5">
      <li
        v-for="(s, i) in STEPS"
        :key="s.key"
        class="flex h-7 items-center gap-1.5 rounded border px-2.5 font-semibold transition"
        :class="{
          'border-brand bg-surface text-brand shadow-card': stateOf(s.key) === 'now' && !demo.paused,
          'border-brand/40 bg-surface text-sub': stateOf(s.key) === 'now' && demo.paused,
          'border-transparent text-ok': stateOf(s.key) === 'done',
          'border-transparent text-faint': stateOf(s.key) === 'todo',
        }"
        :title="s.by"
      >
        <Check v-if="stateOf(s.key) === 'done'" :size="13" />
        <span v-else-if="stateOf(s.key) === 'now' && !demo.paused" class="h-1.5 w-1.5 animate-dot rounded-full bg-current" />
        <span v-else class="text-[0.76rem] tabular-nums">{{ i + 1 }}</span>
        {{ s.label }}
      </li>
    </ol>

    <p class="min-w-0 flex-1 truncate text-sub" :title="caption">{{ caption }}</p>

    <span v-if="demo.total" class="shrink-0 tabular-nums text-faint">{{ demo.line }} / {{ demo.total }}</span>
    <div class="flex shrink-0 items-center gap-1">
      <button class="btn btn-sm gap-1.5" :disabled="demo.stage === 'END'" @click="demo.paused = !demo.paused">
        <Play v-if="demo.paused" :size="13" /><Pause v-else :size="13" />{{ demo.paused ? '재생' : '멈춤' }}
      </button>
      <button class="btn btn-sm gap-1.5" :class="demo.speed > 1 ? 'border-brand text-brand' : ''" :aria-pressed="demo.speed > 1" title="대본을 두 배 빠르게 진행합니다" @click="demo.speed = demo.speed > 1 ? 1 : 2">
        <FastForward :size="13" />2배
      </button>
      <button class="btn btn-sm gap-1.5" title="모의 데이터를 처음 상태로 되돌리고 이 면접을 다시 시작합니다" @click="restart"><RotateCcw :size="13" />처음부터</button>
    </div>
  </div>
</template>
