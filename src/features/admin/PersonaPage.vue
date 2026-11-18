<script setup>
// 관리 > 면접 페르소나(관리자 전용, 화면 시안): 면접관에게 추천할 페르소나와 사용 여부를 정하고, 새 페르소나를 더하거나 고친다.
// 정해진 칸(질문 유형, 꼬리질문 유형, 어울리는 때, 지키는 것)으로만 받는다. 자유로운 글 한 덩어리로 받지 않는다.
// 직접 만든 페르소나만 지울 수 있고, 기본 페르소나는 사용을 끈다.
// 페르소나는 준비된 질문과 꼬리질문의 표현만 바꾼다. 평가 항목과 금지 질문 검사는 모든 페르소나에서 같다.
// API 명세에 아직 없다(api/index.js 의 personaApi).
import { computed, onMounted, ref } from 'vue'
import { Drama, Info, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import Modal from '@/components/Modal.vue'
import { personaApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const ui = useUi()
const personas = ref([])
const loading = ref(true)
const busy = ref(null) // 바꾸는 중인 페르소나 id

const enabled = computed(() => personas.value.filter((p) => p.enabled))
const recommended = computed(() => enabled.value.filter((p) => p.recommended))

async function load() {
  personas.value = (await personaApi.list()).items
  loading.value = false
}
onMounted(() => load().catch((e) => ui.fail(e)))

async function change(p, body, message) {
  busy.value = p.id
  try {
    await personaApi.update(p.id, body)
    await load()
    ui.toast(message, 'ok')
  } catch (e) {
    ui.fail(e)
  } finally {
    busy.value = null
  }
}
const setRecommended = (p, v) => change(p, { recommended: v }, v ? `${p.name}을(를) 추천에 넣었습니다.` : `${p.name}을(를) 추천에서 뺐습니다.`)

// ---- 더하기 · 고치기 · 지우기 ----
const TONES = [
  { key: 'brand', label: '파랑' },
  { key: 'ok', label: '초록' },
  { key: 'warn', label: '주황' },
  { key: 'bad', label: '빨강' },
  { key: 'neutral', label: '회색' },
]
const EMPTY = { name: '', description: '', questionType: '', followUpType: '', fit: '', guard: '', tone: 'brand' }
const form = ref(null) // 열려 있는 입력 창의 값. id 가 있으면 고치기
const removing = ref(null)
const saving = ref(false)
const canSave = computed(() => form.value && ['name', 'description', 'questionType', 'followUpType'].every((k) => form.value[k].trim()))

const openNew = () => (form.value = { ...EMPTY })
const openEdit = (p) => (form.value = { id: p.id, name: p.name, description: p.description, questionType: p.questionType, followUpType: p.followUpType, fit: p.fit || '', guard: p.guard || '', tone: p.tone })
async function save() {
  saving.value = true
  try {
    const { id, ...body } = form.value
    if (id) await personaApi.update(id, body)
    else await personaApi.create(body)
    await load()
    ui.toast(id ? `${body.name}을(를) 고쳤습니다.` : `${body.name}을(를) 더했습니다. 추천에 넣으려면 스위치를 켜 주세요.`, 'ok')
    form.value = null
  } catch (e) {
    ui.fail(e)
  } finally {
    saving.value = false
  }
}
async function remove() {
  const p = removing.value
  saving.value = true
  try {
    await personaApi.remove(p.id)
    removing.value = null
    await load()
    ui.toast(`${p.name}을(를) 지웠습니다.`, 'ok')
  } catch (e) {
    ui.fail(e)
  } finally {
    saving.value = false
  }
}
const setEnabled = (p, v) => change(p, { enabled: v }, v ? `${p.name}을(를) 쓰도록 켰습니다.` : `${p.name} 사용을 껐습니다.`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">관리</h1>
        <AdminTabs />
      </div>
      <button class="btn btn-primary" @click="openNew"><Plus :size="16" />페르소나 더하기</button>
    </div>

    <div v-if="loading" class="space-y-2"><div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-md bg-sunken" /></div>
    <div v-else class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section class="card">
        <header class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="h-sec flex items-center gap-2"><Drama :size="17" class="text-brand" />페르소나 <span class="font-semibold text-faint">{{ personas.length }}</span></h2>
          <span class="text-[0.82rem] text-faint">추천으로 켠 페르소나가 면접 전 화면 맨 앞에 카드로 나옵니다</span>
        </header>
        <table class="w-full">
          <thead>
            <tr class="border-b border-line"><th class="th">페르소나</th><th class="th">질문</th><th class="th">꼬리질문</th><th class="th w-16 text-center">추천</th><th class="th w-16 text-center">사용</th><th class="th w-[76px]" /></tr>
          </thead>
          <tbody>
            <tr v-for="p in personas" :key="p.id" class="row-line" :class="p.enabled ? '' : 'opacity-60'">
              <td class="td">
                <span class="badge" :class="`tone-${p.tone}`">{{ p.name }}</span><span v-if="p.custom" class="ml-1.5 text-[0.76rem] font-semibold text-faint">직접 만든 것</span>
                <p class="mt-1 text-[0.84rem] leading-snug text-sub">{{ p.description }}</p>
              </td>
              <td class="td whitespace-nowrap text-[0.9rem]">{{ p.questionType }}</td>
              <td class="td whitespace-nowrap text-[0.9rem]">{{ p.followUpType }}</td>
              <td class="td text-center"><ToggleSwitch :model-value="p.recommended" :label="`${p.name} 추천`" :disabled="busy === p.id" @update:model-value="(v) => setRecommended(p, v)" /></td>
              <td class="td text-center"><ToggleSwitch :model-value="p.enabled" :label="`${p.name} 사용`" :disabled="busy === p.id" @update:model-value="(v) => setEnabled(p, v)" /></td>
              <td class="td whitespace-nowrap text-right">
                <button class="btn btn-ghost btn-icon btn-sm" :aria-label="`${p.name} 고치기`" title="고치기" @click="openEdit(p)"><Pencil :size="15" /></button>
                <button v-if="p.custom" class="btn btn-ghost btn-icon btn-sm" :aria-label="`${p.name} 지우기`" title="지우기" @click="removing = p"><Trash2 :size="15" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="space-y-4">
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">면접관에게 추천되는 순서</h2>
            <span class="badge" :class="recommended.length ? 'tone-brand' : 'tone-neutral'">{{ recommended.length }}</span>
          </header>
          <p v-if="!recommended.length" class="px-4 py-4 text-[0.9rem] text-sub">추천으로 켠 페르소나가 없습니다. 면접관은 목록에서 직접 고릅니다.</p>
          <ol v-else>
            <li v-for="(p, i) in recommended" :key="p.id" class="row-line flex items-start gap-3 px-4 py-2.5">
              <span class="mt-0.5 w-4 shrink-0 text-right text-[0.86rem] font-bold tabular-nums text-faint">{{ i + 1 }}</span>
              <span class="min-w-0">
                <span class="block font-semibold">{{ p.name }}<span v-if="i === 0" class="ml-2 text-[0.78rem] font-medium text-brand">새 면접의 기본 선택</span></span>
                <span class="block text-[0.82rem] text-faint">{{ p.fit }}</span>
              </span>
            </li>
          </ol>
          <p class="border-t border-line px-4 py-2.5 text-[0.8rem] leading-snug text-faint">이미 시작한 면접의 페르소나는 바뀌지 않습니다.</p>
        </section>

        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec">페르소나마다 지키는 것</h2></header>
          <ul class="space-y-2 px-4 py-3 text-[0.9rem] leading-snug">
            <li v-for="p in enabled" :key="p.id"><b class="font-semibold">{{ p.name }}</b> <span class="text-sub">· {{ p.guard }}</span></li>
          </ul>
          <p class="flex gap-2 border-t border-line bg-sunken/50 px-4 py-2.5 text-[0.82rem] leading-snug text-sub">
            <Info :size="15" class="mt-0.5 shrink-0 text-faint" />
            <span>페르소나는 질문의 표현만 바꿉니다. 평가 항목과 금지 질문 검사는 모든 페르소나에서 같습니다.</span>
          </p>
        </section>
      </div>
    </div>

    <!-- 더하기 · 고치기 -->
    <Modal v-if="form" :title="form.id ? '페르소나 고치기' : '페르소나 더하기'" wide @close="form = null">
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="canSave && save()">
        <label class="block sm:col-span-2">
          <span class="label mb-1 block">이름</span>
          <input v-model="form.name" class="input" maxlength="20" placeholder="예: 사례 검증형" />
        </label>
        <label class="block sm:col-span-2">
          <span class="label mb-1 block">어떻게 묻는가</span>
          <textarea v-model="form.description" rows="2" class="input" maxlength="120" placeholder="면접관에게 보이는 한두 문장 설명. 예: 실제 사례를 하나 고르게 하고 그 사례만 끝까지 묻습니다." />
        </label>
        <label class="block">
          <span class="label mb-1 block">질문 유형</span>
          <input v-model="form.questionType" class="input" maxlength="20" placeholder="예: 사례 선택 질문" />
        </label>
        <label class="block">
          <span class="label mb-1 block">꼬리질문 유형</span>
          <input v-model="form.followUpType" class="input" maxlength="20" placeholder="예: 같은 사례 심화" />
        </label>
        <label class="block sm:col-span-2">
          <span class="label mb-1 block">어울리는 때 <span class="font-medium">(선택)</span></span>
          <input v-model="form.fit" class="input" maxlength="60" placeholder="예: 경험이 많아 이야기가 넓게 퍼지는 지원자를 만날 때" />
        </label>
        <label class="block sm:col-span-2">
          <span class="label mb-1 block">지키는 것 <span class="font-medium">(선택)</span></span>
          <input v-model="form.guard" class="input" maxlength="80" placeholder="예: 고른 사례 밖의 일은 묻지 않습니다." />
        </label>
        <div class="sm:col-span-2">
          <span class="label mb-1 block">표시 색</span>
          <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="표시 색">
            <button v-for="t in TONES" :key="t.key" type="button" class="badge h-7 cursor-pointer px-2.5" :class="[`tone-${t.key}`, form.tone === t.key ? 'ring-2 ring-brand' : '']" role="radio" :aria-checked="form.tone === t.key" @click="form.tone = t.key">{{ t.label }}</button>
          </div>
        </div>
      </form>
      <p class="mt-3 flex gap-2 text-[0.82rem] leading-snug text-sub">
        <Info :size="15" class="mt-0.5 shrink-0 text-faint" />
        <span>페르소나는 질문의 표현만 바꿉니다. 여기에 무엇을 적어도 금지 질문 검사와 평가 항목은 그대로 적용됩니다.</span>
      </p>
      <template #footer>
        <button class="btn" :disabled="saving" @click="form = null">취소</button>
        <button class="btn btn-primary" :disabled="!canSave || saving" :title="canSave ? '' : '이름, 설명, 질문 유형, 꼬리질문 유형을 적어 주세요'" @click="save">{{ form.id ? '고치기' : '더하기' }}</button>
      </template>
    </Modal>

    <Modal v-if="removing" :title="`${removing.name}을(를) 지울까요?`" @close="removing = null">
      <p class="leading-relaxed text-sub">지우면 면접관의 선택 화면에서 사라집니다. 이 페르소나로 이미 시작한 면접은 그대로 남습니다.</p>
      <template #footer>
        <button class="btn" :disabled="saving" @click="removing = null">취소</button>
        <button class="btn btn-danger" :disabled="saving" @click="remove">지우기</button>
      </template>
    </Modal>
  </div>
</template>
