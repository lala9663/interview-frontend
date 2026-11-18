<script setup>
// 관리 > AI 모델(관리자 전용, 화면 시안): AI 작업마다 어떤 모델을 쓸지 보고 바꾼다.
// 빠른 응답이 필요한 작업(문장 다듬기, 꼬리질문)과 품질이 중요한 작업(사전 리포트, 평가, 보고서), 음성 인식을 따로 정한다.
// 바꾼 모델은 그 뒤에 시작하는 작업부터 쓰인다. API 명세에 아직 없다(api/index.js 의 modelApi).
// 실제로는 Agent 의 설정(config/providers.yaml)을 바꾸는 일이라, 화면에서 바꾸게 하려면 백엔드와 Agent 에 통로가 필요하다.
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, Cpu, History, Info } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import Modal from '@/components/Modal.vue'
import { modelApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { SYSTEM_STATUS, labelOf, toneOf } from '@/lib/labels.js'
import { mdhm } from '@/lib/format.js'

const ui = useUi()
const data = ref(null) // { models, tasks, history }
const draft = ref({}) // 작업 key → 고른 모델 id
const pending = ref(null) // 확인 창에 띄운 변경 { task, from, to }
const busy = ref(false)

const KIND = { LLM: 'LLM', STT: '음성 인식' }
const modelOf = (id) => data.value?.models.find((m) => m.id === id)
const choices = (task) => data.value.models.filter((m) => m.kind === task.kind)
const changed = (task) => draft.value[task.key] && draft.value[task.key] !== task.modelId
const groups = computed(() => {
  const order = [
    { key: 'REALTIME', label: '면접 중(빠른 응답이 필요한 작업)' },
    { key: 'QUALITY', label: '면접 전 · 후(품질이 중요한 작업)' },
    { key: 'STT', label: '음성 인식' },
  ]
  return order.map((g) => ({ ...g, tasks: data.value.tasks.filter((t) => t.group === g.key) })).filter((g) => g.tasks.length)
})
const secs = (s) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60 ? `${s % 60}초` : ''}`.trim() : `${s}초`)

async function load() {
  data.value = await modelApi.get()
  draft.value = Object.fromEntries(data.value.tasks.map((t) => [t.key, t.modelId]))
}
onMounted(() => load().catch((e) => ui.fail(e)))

function ask(task) {
  pending.value = { task, from: modelOf(task.modelId), to: modelOf(draft.value[task.key]) }
}
async function apply() {
  const { task, to } = pending.value
  busy.value = true
  try {
    await modelApi.assign(task.key, to.id)
    pending.value = null
    await load()
    ui.toast(`${task.label}의 모델을 ${to.name}(으)로 바꿨습니다.`, 'ok')
  } catch (e) {
    ui.fail(e)
  } finally {
    busy.value = false
  }
}
function cancel() {
  draft.value[pending.value.task.key] = pending.value.task.modelId
  pending.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="h-page">관리</h1>
      <AdminTabs />
    </div>

    <div v-if="!data" class="space-y-2"><div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-md bg-sunken" /></div>
    <div v-else class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section class="card">
        <header class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="h-sec flex items-center gap-2"><Cpu :size="17" class="text-brand" />작업별 모델</h2>
          <span class="text-[0.82rem] text-faint">바꾼 모델은 그 뒤에 시작하는 작업부터 쓰입니다</span>
        </header>
        <table class="w-full">
          <thead>
            <tr class="border-b border-line"><th class="th">작업</th><th class="th">지금 모델</th><th class="th text-right">평소 걸리는 시간</th><th class="th w-[250px]">바꿀 모델</th><th class="th w-20" /></tr>
          </thead>
          <tbody v-for="g in groups" :key="g.key">
            <tr><td colspan="5" class="bg-sunken/60 px-3 py-1.5 text-[0.78rem] font-bold text-sub">{{ g.label }}</td></tr>
            <tr v-for="t in g.tasks" :key="t.key" class="row-line">
              <td class="td">
                <span class="font-semibold">{{ t.label }}</span>
                <p class="text-[0.8rem] leading-snug text-faint">{{ t.description }}</p>
              </td>
              <td class="td whitespace-nowrap">
                {{ modelOf(t.modelId)?.name }}
                <span v-if="modelOf(t.modelId)?.status !== 'OK'" class="badge ml-1" :class="`tone-${toneOf(SYSTEM_STATUS, modelOf(t.modelId)?.status)}`">{{ labelOf(SYSTEM_STATUS, modelOf(t.modelId)?.status) }}</span>
              </td>
              <td class="td whitespace-nowrap text-right tabular-nums text-sub">{{ secs(t.usualSeconds) }}</td>
              <td class="td">
                <select v-model="draft[t.key]" class="input h-8 text-[0.88rem]" :aria-label="`${t.label}에 쓸 모델`" :disabled="choices(t).length < 2">
                  <option v-for="m in choices(t)" :key="m.id" :value="m.id" :disabled="m.status === 'DOWN'">{{ m.name }}{{ m.status === 'DOWN' ? ' (멈춤)' : '' }}</option>
                </select>
              </td>
              <td class="td text-right"><button class="btn btn-sm" :disabled="!changed(t)" @click="ask(t)">바꾸기</button></td>
            </tr>
          </tbody>
        </table>
        <p class="flex gap-2 border-t border-line bg-sunken/50 px-4 py-2.5 text-[0.82rem] leading-snug text-sub">
          <Info :size="15" class="mt-0.5 shrink-0 text-faint" />
          <span>진행 중인 면접 방은 다음 발화부터 새 모델을 씁니다. 이미 만든 사전 리포트와 보고서는 바뀌지 않으며, 다시 만들면 새 모델로 만듭니다.</span>
        </p>
      </section>

      <div class="space-y-4">
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">쓸 수 있는 모델</h2>
            <span class="badge tone-neutral">{{ data.models.length }}</span>
          </header>
          <ul>
            <li v-for="m in data.models" :key="m.id" class="row-line px-4 py-2.5">
              <div class="flex items-center justify-between gap-2">
                <b class="text-[0.93rem]">{{ m.name }}</b>
                <span class="badge" :class="`tone-${toneOf(SYSTEM_STATUS, m.status)}`">{{ labelOf(SYSTEM_STATUS, m.status) }}</span>
              </div>
              <p class="text-[0.8rem] text-faint">{{ m.note === KIND[m.kind] ? m.note : `${KIND[m.kind]} · ${m.note}` }}</p>
            </li>
          </ul>
        </section>

        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec flex items-center gap-2"><History :size="16" class="text-faint" />최근에 바꾼 것</h2></header>
          <p v-if="!data.history.length" class="px-4 py-4 text-[0.9rem] text-sub">바꾼 기록이 없습니다.</p>
          <ul v-else>
            <li v-for="(h, i) in data.history" :key="i" class="row-line px-4 py-2.5 text-[0.88rem]">
              <p class="font-semibold">{{ h.taskLabel }}</p>
              <p class="flex flex-wrap items-center gap-1 text-sub">{{ h.fromName }}<ArrowRight :size="13" class="text-faint" />{{ h.toName }}</p>
              <p class="text-[0.78rem] text-faint">{{ mdhm(h.changedAt) }} · {{ h.changedBy }}</p>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <Modal v-if="pending" :title="`${pending.task.label}의 모델을 바꿀까요?`" @close="cancel">
      <p class="flex flex-wrap items-center gap-2 text-[1rem] font-semibold">{{ pending.from.name }}<ArrowRight :size="16" class="text-faint" /><span class="text-brand">{{ pending.to.name }}</span></p>
      <p class="mt-2 leading-relaxed text-sub">{{ pending.to.note }}</p>
      <p class="mt-2 text-[0.88rem] leading-relaxed text-sub">바꾼 뒤에 시작하는 작업부터 새 모델을 씁니다. 진행 중인 면접 방은 다음 발화부터 적용됩니다.</p>
      <p v-if="pending.to.status !== 'OK'" class="mt-2 text-[0.88rem] font-semibold text-warn">이 모델은 지금 "{{ labelOf(SYSTEM_STATUS, pending.to.status) }}" 상태입니다.</p>
      <template #footer>
        <button class="btn" :disabled="busy" @click="cancel">취소</button>
        <button class="btn btn-primary" :disabled="busy" @click="apply">바꾸기</button>
      </template>
    </Modal>
  </div>
</template>
