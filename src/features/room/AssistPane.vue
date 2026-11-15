<script setup>
// 오른쪽: 꼬리질문 후보(위)와 내 메모(아래). 가장 최근 답변에 대한 후보만 크게 보여 준다.
import { computed } from 'vue'
import { Check, CornerDownRight, NotebookPen, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  followUps: { type: Array, required: true },
  memo: { type: String, default: '' },
  saveState: { type: String, default: 'idle' }, // idle | saving | saved | error
  busy: Boolean,
  readonly: Boolean,
})
const emit = defineEmits(['adopt', 'request', 'update:memo'])

const latest = computed(() => props.followUps[0] || null)
const earlier = computed(() => props.followUps.slice(1).flatMap((g) => g.items).filter((x) => !x.used).slice(0, 4))
const saveLabel = computed(() => ({ saving: '저장하는 중…', saved: '저장됨', error: '저장 실패 — 다시 입력하면 재시도합니다' })[props.saveState] || '자동 저장')
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <section class="flex min-h-0 flex-[3] flex-col">
      <header class="flex h-11 shrink-0 items-center justify-between border-b border-line px-3.5">
        <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><Sparkles :size="16" class="text-faint" />꼬리질문</h2>
        <button v-if="!readonly" class="btn btn-sm btn-ghost" :disabled="busy" @click="emit('request')">지금 만들기</button>
      </header>
      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        <p v-if="!latest" class="px-2 py-6 text-center text-[0.88rem] leading-relaxed text-sub">
          지원자의 답변이 끝나면<br />이어서 물을 질문을 제안합니다.
        </p>
        <template v-else>
          <button
            v-for="(f, i) in latest.items"
            :key="f.id"
            class="flex w-full animate-rise gap-2.5 rounded-r-md border-l-2 px-3 py-2.5 text-left transition-colors"
            :class="f.used ? 'border-ok bg-sunken/60' : 'border-brand hover:bg-sunken'"
            :disabled="readonly || f.used"
            @click="emit('adopt', f)"
          >
            <span class="kbd mt-0.5 shrink-0" :class="f.used ? 'border-ok/40 text-ok' : ''"><Check v-if="f.used" :size="12" :stroke-width="3" /><template v-else>{{ i + 1 }}</template></span>
            <span class="min-w-0">
              <span class="block text-[0.97rem] font-semibold leading-snug">{{ f.text }}</span>
              <span v-if="f.spoken" class="mt-1 block text-[0.78rem] font-semibold text-ok">말로 물어 자동으로 채택됨</span>
              <span v-else-if="f.rationale" class="mt-1 block text-[0.8rem] leading-snug text-sub">{{ f.rationale }}</span>
            </span>
          </button>
          <p v-if="!readonly" class="px-1 text-[0.76rem] text-faint">숫자 키 <span class="kbd">1</span>~<span class="kbd">{{ latest.items.length }}</span>로 질문 목록에 올립니다 (메모 입력 중에는 동작하지 않음)</p>
        </template>
        <div v-if="earlier.length" class="pt-1">
          <p class="label mb-1.5 px-1">이전 제안</p>
          <button v-for="f in earlier" :key="f.id" class="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-[0.86rem] text-sub hover:bg-sunken" :disabled="readonly" @click="emit('adopt', f)">
            <CornerDownRight :size="14" class="mt-0.5 shrink-0 text-faint" />{{ f.text }}
          </button>
        </div>
      </div>
    </section>

    <section class="flex min-h-0 flex-[2] flex-col border-t border-line">
      <header class="flex h-10 shrink-0 items-center justify-between px-3.5">
        <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><NotebookPen :size="16" class="text-faint" />내 메모</h2>
        <span class="text-[0.76rem]" :class="saveState === 'error' ? 'text-bad' : 'text-faint'">{{ saveLabel }}</span>
      </header>
      <textarea
        class="min-h-0 flex-1 resize-none bg-transparent px-3.5 pb-3 text-[0.95rem] leading-relaxed placeholder:text-faint focus:outline-none"
        placeholder="면접 중 떠오른 것을 적어 두세요. 나만 볼 수 있고, 면접 후 평가 화면에 그대로 이어집니다."
        aria-label="내 메모"
        :value="memo"
        :readonly="readonly"
        @input="emit('update:memo', $event.target.value)"
      />
    </section>
  </div>
</template>
