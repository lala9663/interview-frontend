<script setup>
// 보고서 본문. BRIEF(신입)는 위쪽 네 블록만, DETAILED(경력)는 아래 블록까지 채워져 온다.
import { AlertCircle, CheckCircle2, MessageSquareQuote } from 'lucide-vue-next'

defineProps({ content: { type: Object, required: true } })
defineEmits(['jump'])
</script>

<template>
  <div class="space-y-5">
    <div>
      <p class="text-[1.2rem] font-bold leading-snug tracking-tight">{{ content.headline }}</p>
      <p class="mt-2 whitespace-pre-line leading-relaxed text-sub">{{ content.overallComment }}</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl bg-ok-soft/60 p-3.5">
        <p class="mb-1.5 flex items-center gap-1.5 text-[0.84rem] font-bold text-ok"><CheckCircle2 :size="15" />강점</p>
        <ul class="space-y-1 leading-relaxed"><li v-for="(x, i) in content.strengths" :key="i">{{ x }}</li></ul>
      </div>
      <div class="rounded-xl bg-warn-soft/60 p-3.5">
        <p class="mb-1.5 flex items-center gap-1.5 text-[0.84rem] font-bold text-warn"><AlertCircle :size="15" />우려되는 점</p>
        <ul class="space-y-1 leading-relaxed"><li v-for="(x, i) in content.concerns" :key="i">{{ x }}</li></ul>
        <p v-if="!content.concerns?.length" class="text-sub">특별히 없음</p>
      </div>
    </div>

    <div v-if="content.qaHighlights?.length">
      <p class="label mb-2">주요 문답</p>
      <ul class="space-y-2">
        <li v-for="(qa, i) in content.qaHighlights" :key="i" class="rounded-xl border border-line p-3.5">
          <p class="flex items-start gap-2 font-semibold"><MessageSquareQuote :size="16" class="mt-0.5 shrink-0 text-brand" />{{ qa.question }}</p>
          <p class="mt-1.5 pl-6 leading-relaxed text-sub">{{ qa.answerSummary }}</p>
          <button v-if="qa.seqs?.length" class="ml-6 mt-1.5 text-[0.82rem] font-semibold text-brand hover:underline" @click="$emit('jump', qa.seqs[0])">대화에서 보기</button>
        </li>
      </ul>
    </div>

    <template v-if="content.competencies?.length">
      <div>
        <p class="label mb-2">역량별 분석</p>
        <div class="space-y-2">
          <div v-for="(c, i) in content.competencies" :key="i" class="rounded-xl border border-line p-3.5">
            <p class="font-semibold">{{ c.name }}</p>
            <p class="mt-1 leading-relaxed text-sub">{{ c.assessment }}</p>
            <ul v-if="c.evidence?.length" class="mt-2 space-y-1 border-l-2 border-line pl-3 text-[0.9rem] text-sub">
              <li v-for="(e, j) in c.evidence" :key="j">“{{ e }}”</li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <div v-if="content.careerChecks?.length">
      <p class="label mb-2">이력 확인</p>
      <div class="overflow-hidden rounded-xl border border-line">
        <table class="w-full">
          <thead class="bg-sunken"><tr><th class="th w-2/5">이력서의 내용</th><th class="th">면접에서 확인된 것</th></tr></thead>
          <tbody><tr v-for="(c, i) in content.careerChecks" :key="i" class="row-line"><td class="td font-medium">{{ c.claim }}</td><td class="td text-sub">{{ c.finding }}</td></tr></tbody>
        </table>
      </div>
    </div>

    <div v-if="content.nextRoundChecks?.length || content.risks?.length" class="grid gap-3 sm:grid-cols-2">
      <div v-if="content.nextRoundChecks?.length" class="rounded-xl bg-brand-soft/60 p-3.5">
        <p class="mb-1.5 text-[0.84rem] font-bold text-brand-ink">다음 차수에서 확인할 점</p>
        <ul class="space-y-1 leading-relaxed"><li v-for="(x, i) in content.nextRoundChecks" :key="i">{{ x }}</li></ul>
      </div>
      <div v-if="content.risks?.length" class="rounded-xl bg-bad-soft/60 p-3.5">
        <p class="mb-1.5 text-[0.84rem] font-bold text-bad">리스크</p>
        <ul class="space-y-1 leading-relaxed"><li v-for="(x, i) in content.risks" :key="i">{{ x }}</li></ul>
      </div>
    </div>
  </div>
</template>
