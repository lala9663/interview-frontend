<script setup>
// 면접 한 건의 화면(면접 전·후) 맨 위: 누구의 어떤 면접인지 + 세 단계.
import { MapPin, Video } from 'lucide-vue-next'
import PhaseSteps from './PhaseSteps.vue'
import StatusBadge from './StatusBadge.vue'
import { APPLICANT_TYPE, INTERVIEW_STATUS, INTERVIEW_TYPE, TRACK, labelOf } from '@/lib/labels.js'
import { mdhm } from '@/lib/format.js'

defineProps({ interview: { type: Object, required: true }, current: { type: String, required: true } })
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="mb-1 flex flex-wrap items-center gap-1.5">
        <span class="badge" :class="`tone-${TRACK[interview.track]?.tone}`">{{ labelOf(TRACK, interview.track) }}</span>
        <span v-if="interview.candidate.applicantType" class="badge tone-neutral">{{ labelOf(APPLICANT_TYPE, interview.candidate.applicantType) }}</span>
        <span class="badge tone-neutral">{{ interview.seq }}차 · {{ labelOf(INTERVIEW_TYPE, interview.type) }}</span>
        <StatusBadge :map="INTERVIEW_STATUS" :value="interview.status" dot />
      </div>
      <h1 class="h-page truncate leading-tight">
        <RouterLink :to="{ name: 'candidate', params: { id: interview.candidate.id } }" class="hover:underline">{{ interview.candidate.name }}</RouterLink>
        <span class="ml-1.5 text-[1rem] font-medium text-sub">{{ interview.candidate.jobTitle }}</span>
      </h1>
      <p class="mt-0.5 flex items-center gap-1.5 text-[0.88rem] text-sub">
        <Video v-if="interview.mode === 'ONLINE'" :size="15" /><MapPin v-else :size="15" />
        {{ interview.mode === 'ONLINE' ? '화상' : '대면' }} · {{ mdhm(interview.scheduledAt) }} · {{ interview.durationMinutes }}분 · 면접관 {{ interview.interviewers.map((x) => x.name).join(', ') || '미배정' }}
      </p>
    </div>
    <PhaseSteps :interview="interview" :current="current" />
  </div>
</template>
