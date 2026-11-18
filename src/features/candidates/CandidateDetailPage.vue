<script setup>
// 면접자 상세: 면접 진행(차수), 인적 사항·이력서(블라인드 제외본), 면접 등록.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, EyeOff, Plus } from 'lucide-vue-next'
import StageTrack from '@/components/StageTrack.vue'
import Modal from '@/components/Modal.vue'
import { candidateApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { APPLICANT_TYPE, BLIND_FIELD, INTERVIEW_TYPE, PROFILE_EXTRA, TRACK, labelOf } from '@/lib/labels.js'
import { has } from '@/lib/features.js'

const props = defineProps({ id: { type: [String, Number], required: true } })
const auth = useAuth()
const ui = useUi()
const router = useRouter()

const c = ref(null)
const adding = ref(false)
const form = ref({ type: 'JOB', mode: 'ONLINE', scheduledAt: '', durationMinutes: 60 })
// 등록할 수 있는 면접 종류는 그 면접자의 채용 구분을 따른다: 신입은 PT·인성(대면), 경력은 포트폴리오·직무·인성(화상)
const typeChoices = computed(() => (has('feedback1118') ? ['JOB', 'PERSONALITY'] : c.value?.track === 'EXPERIENCED' ? ['PORTFOLIO', 'JOB', 'PERSONALITY'] : ['PT', 'PERSONALITY']))
function openAdd() {
  const exp = c.value?.track === 'EXPERIENCED'
  form.value = { type: typeChoices.value[0], mode: exp ? 'ONLINE' : 'OFFLINE', scheduledAt: '', durationMinutes: exp ? 60 : 30 }
  adding.value = true
}

async function load() {
  c.value = await candidateApi.get(props.id)
}
onMounted(() => load().catch((e) => ui.fail(e)))

function open(it) {
  router.push({ name: it.status === 'EVALUATING' || it.status === 'DONE' ? 'review' : 'prep', params: { id: it.id } })
}

async function addInterview() {
  try {
    await candidateApi.addInterview(props.id, {
      ...form.value,
      scheduledAt: form.value.scheduledAt ? new Date(form.value.scheduledAt).toISOString() : null,
    })
    adding.value = false
    ui.toast('면접을 등록했습니다.', 'ok')
    await load()
  } catch (e) {
    ui.fail(e)
  }
}
</script>

<template>
  <div v-if="c" class="space-y-4">
    <button class="btn btn-ghost btn-sm -ml-2" @click="router.push({ name: 'candidates' })"><ArrowLeft :size="16" />면접자 목록</button>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-sunken text-xl font-bold text-sub">{{ c.name.slice(0, 1) }}</span>
        <div>
          <h1 class="h-page leading-tight">{{ c.name }}</h1>
          <p class="text-[0.9rem] text-sub">
            <span class="badge mr-1" :class="`tone-${TRACK[c.track]?.tone}`">{{ labelOf(TRACK, c.track) }}</span><span v-if="has('feedback1118') && c.applicantType" class="badge tone-neutral mr-1">{{ labelOf(APPLICANT_TYPE, c.applicantType) }}</span>{{ c.jobTitle }} · {{ c.applicantNo }}
          </p>
        </div>
      </div>
      <button v-if="auth.isAdmin" class="btn" @click="openAdd"><Plus :size="16" />면접 등록</button>
    </div>

    <section>
      <h2 class="h-sec mb-4 border-b border-line pb-2">면접 진행</h2>
      <StageTrack v-if="c.interviews.length" :interviews="c.interviews" @open="open" />
      <p v-else class="text-[0.9rem] text-sub">등록된 면접이 없습니다.</p>
    </section>

    <div class="grid gap-x-10 gap-y-6 pt-2 lg:grid-cols-[300px_1fr]">
      <div class="space-y-6">
        <section class="space-y-3">
          <h2 class="h-sec border-b border-line pb-2">학력</h2>
          <div v-for="(e, i) in c.profile.education" :key="i">
            <p class="font-semibold">{{ e.school }}</p>
            <p class="text-[0.9rem] text-sub">{{ e.major }} · {{ e.degree }}<template v-if="e.gpa"> · {{ e.gpa }}</template></p>
          </div>
          <template v-if="c.profile.courses?.length">
            <p class="label pt-1">주요 수강 과목</p>
            <div class="flex flex-wrap gap-1.5"><span v-for="x in c.profile.courses" :key="x" class="badge tone-neutral">{{ x }}</span></div>
          </template>
          <template v-if="c.profile.certificates?.length">
            <p class="label pt-1">자격증</p>
            <div class="flex flex-wrap gap-1.5"><span v-for="x in c.profile.certificates" :key="x" class="badge tone-neutral">{{ x }}</span></div>
          </template>
          <template v-for="(v, k) in c.profile.extra" :key="k">
            <p class="label pt-1">{{ PROFILE_EXTRA[k] || k }}</p><p class="text-[0.93rem]">{{ v }}</p>
          </template>
        </section>
        <section v-if="c.blindedFields?.length" class="border-l-2 border-line pl-3.5">
          <p class="mb-1.5 flex items-center gap-1.5 text-[0.88rem] font-semibold text-sub"><EyeOff :size="15" />블라인드 처리된 항목</p>
          <p class="text-[0.86rem] text-faint">{{ c.blindedFields.map((f) => BLIND_FIELD[f] || f).join(', ') }} — 화면과 AI 요약·질문에서 제외됩니다.</p>
        </section>
      </div>

      <div class="space-y-6">
        <section v-if="c.profile.careers?.length" class="space-y-3">
          <h2 class="h-sec border-b border-line pb-2">경력</h2>
          <div v-for="(x, i) in c.profile.careers" :key="i">
            <p class="font-semibold">{{ x.company }} <span class="font-normal text-sub">· {{ x.role }} · {{ x.period }}</span></p>
            <p class="mt-1 leading-relaxed text-sub">{{ x.text }}</p>
          </div>
        </section>
        <section v-if="c.profile.projects?.length" class="space-y-3">
          <h2 class="h-sec border-b border-line pb-2">프로젝트</h2>
          <div v-for="(x, i) in c.profile.projects" :key="i">
            <p class="font-semibold">{{ x.title }}</p>
            <p class="mt-1 leading-relaxed text-sub">{{ x.text }}</p>
          </div>
        </section>
        <section v-if="c.profile.essays?.length" class="space-y-4">
          <h2 class="h-sec border-b border-line pb-2">자기소개서</h2>
          <div v-for="(x, i) in c.profile.essays" :key="i">
            <p class="font-semibold">{{ x.title }}</p>
            <p class="mt-1 whitespace-pre-line leading-relaxed text-sub">{{ x.text }}</p>
          </div>
        </section>
      </div>
    </div>

    <Modal v-if="adding" title="면접 등록" @close="adding = false">
      <div class="space-y-3">
        <div>
          <p class="label mb-1.5">면접 유형</p>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="k in typeChoices" :key="k" class="btn btn-sm" :class="form.type === k ? 'btn-primary' : ''" @click="form.type = k">{{ labelOf(INTERVIEW_TYPE, k) }}</button>
          </div>
        </div>
        <div>
          <p class="label mb-1.5">진행 방식</p>
          <div class="flex gap-1.5">
            <button class="btn btn-sm" :class="form.mode === 'OFFLINE' ? 'btn-primary' : ''" @click="form.mode = 'OFFLINE'">대면</button>
            <button class="btn btn-sm" :class="form.mode === 'ONLINE' ? 'btn-primary' : ''" @click="form.mode = 'ONLINE'">화상</button>
          </div>
        </div>
        <div class="grid grid-cols-[1fr_120px] gap-3">
          <div><label class="label mb-1.5 block" for="at">일시 (비워 두면 일정 전)</label><input id="at" v-model="form.scheduledAt" type="datetime-local" class="input" /></div>
          <div><label class="label mb-1.5 block" for="dur">시간(분)</label><input id="dur" v-model.number="form.durationMinutes" type="number" min="10" step="10" class="input" /></div>
        </div>
      </div>
      <template #footer>
        <button class="btn" @click="adding = false">취소</button>
        <button class="btn btn-primary" @click="addInterview">등록</button>
      </template>
    </Modal>
  </div>
  <div v-else class="space-y-3"><div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-sunken" /></div>
</template>
