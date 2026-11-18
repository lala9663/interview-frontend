<script setup>
// 엑셀 업로드(관리 > 등록과 면접자 목록이 같이 쓴다): 파일 고르기 → 결과(성공 수, 실패 행 목록).
// 파일을 여러 개 고를 수 있다. 백엔드는 요청 한 번에 파일 하나를 받으므로(API 명세 POST /recruitments/{id}/uploads),
// 고른 순서대로 하나씩 올리고 파일마다 결과를 보여 준다. 한 파일이 실패해도 나머지는 계속 올린다.
// 실패 행은 행 번호·열·값·이유를 그대로 보여 준다.
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { candidateApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const props = defineProps({ recruitmentId: { type: Number, required: true } })
const emit = defineEmits(['close', 'uploaded'])
const ui = useUi()

const files = ref([]) // 고른 파일들(File)
const dragging = ref(false)
const busy = ref(false)
// 올리기 시작하면 파일마다 한 줄: { name, state: 'WAITING' | 'UPLOADING' | 'DONE' | 'FAILED', result, error }
const jobs = ref(null)
const error = ref('')

function pick(list) {
  error.value = ''
  const picked = [...(list || [])]
  if (!picked.length) return
  const bad = picked.filter((f) => !/\.xlsx?$/i.test(f.name))
  if (bad.length) error.value = `엑셀 파일(.xlsx)만 올릴 수 있습니다. 뺀 파일: ${bad.map((f) => f.name).join(', ')}`
  // 같은 파일(이름과 크기가 같은 것)을 두 번 넣지 않는다
  const fresh = picked.filter((f) => /\.xlsx?$/i.test(f.name) && !files.value.some((x) => x.name === f.name && x.size === f.size))
  files.value = [...files.value, ...fresh]
}
const removeFile = (i) => (files.value = files.value.filter((_, n) => n !== i))

async function upload() {
  if (!files.value.length || busy.value) return
  busy.value = true
  error.value = ''
  jobs.value = files.value.map((f) => ({ name: f.name, state: 'WAITING', result: null, error: '' }))
  for (let i = 0; i < files.value.length; i += 1) {
    const job = jobs.value[i]
    job.state = 'UPLOADING'
    try {
      job.result = await candidateApi.upload(props.recruitmentId, files.value[i])
      job.state = 'DONE'
    } catch (e) {
      job.error = e.code === 'FILE_UNREADABLE' ? `${e.message} DRM이 걸린 파일은 해제한 뒤 올려 주세요.` : e.message || '올리지 못했습니다.'
      job.state = 'FAILED'
    }
  }
  busy.value = false
  const done = jobs.value.filter((j) => j.state === 'DONE').map((j) => j.result)
  if (done.length) emit('uploaded', done[done.length - 1])
}

const finished = computed(() => !!jobs.value && !busy.value)
const totals = computed(() => {
  const done = (jobs.value || []).filter((j) => j.result)
  const sum = (k) => done.reduce((n, j) => n + (j.result[k] || 0), 0)
  return { files: jobs.value?.length || 0, failedFiles: (jobs.value || []).filter((j) => j.state === 'FAILED').length, totalRows: sum('totalRows'), successRows: sum('successRows'), failedRows: sum('failedRows') }
})
const many = computed(() => (jobs.value?.length || 0) > 1)

async function template() {
  try {
    const blob = await candidateApi.template()
    if (!blob) return ui.toast('모의 데이터 모드에서는 샘플 파일을 받을 수 없습니다.')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '면접대상자_샘플.xlsx'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) {
    ui.fail(e)
  }
}

function reset() {
  files.value = []
  jobs.value = null
  error.value = ''
}
function close() {
  if (!busy.value) emit('close')
}
</script>

<template>
  <Modal title="면접자 엑셀 업로드" :wide="!!jobs" @close="close">
    <!-- 1. 파일 고르기 -->
    <div v-if="!jobs" class="space-y-3">
      <label
        class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 text-center transition"
        :class="[dragging ? 'border-brand bg-sunken' : 'border-line hover:bg-sunken', files.length ? 'py-5' : 'py-9']"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="dragging = false; pick($event.dataTransfer.files)"
      >
        <input type="file" accept=".xlsx,.xls" multiple class="sr-only" @change="pick($event.target.files); $event.target.value = ''" />
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-sunken text-sub"><UploadCloud :size="24" /></span>
        <p class="font-semibold">{{ files.length ? '파일을 더 끌어다 놓거나 눌러서 더하세요' : '엑셀 파일을 끌어다 놓거나 눌러서 고르세요' }}</p>
        <p class="text-[0.86rem] text-sub">여러 파일을 한 번에 고를 수 있습니다 · 한 파일에 면접자 여러 명 · 첫 행은 열 이름</p>
      </label>

      <ul v-if="files.length" class="max-h-44 divide-y divide-line overflow-y-auto rounded-md border border-line">
        <li v-for="(f, i) in files" :key="f.name + f.size" class="flex items-center gap-2.5 px-3 py-2">
          <FileSpreadsheet :size="17" class="shrink-0 text-faint" />
          <span class="min-w-0 flex-1 truncate text-[0.93rem] font-medium">{{ f.name }}</span>
          <span class="shrink-0 text-[0.8rem] tabular-nums text-faint">{{ (f.size / 1024).toFixed(0) }} KB</span>
          <button class="btn btn-ghost btn-icon btn-sm" :aria-label="`${f.name} 빼기`" title="빼기" @click="removeFile(i)"><X :size="15" /></button>
        </li>
      </ul>

      <p v-if="error" class="flex items-start gap-2 border-l-2 border-bad pl-3 text-[0.9rem] font-medium text-bad" role="alert">
        <AlertTriangle :size="16" class="mt-0.5 shrink-0" />{{ error }}
      </p>
      <ul class="space-y-1 text-[0.86rem] text-sub">
        <li>· 성별·생년월일·가족사항 같은 블라인드 항목은 저장하지 않습니다.</li>
        <li>· 같은 수험번호가 다시 올라오면 새 내용으로 바뀝니다. 여러 파일에 같은 수험번호가 있으면 나중에 올린 파일의 내용이 남습니다.</li>
        <li v-if="files.length > 1">· 고른 순서대로 하나씩 올립니다. 한 파일이 실패해도 나머지는 계속 올립니다.</li>
      </ul>
    </div>

    <!-- 2. 올리는 중 · 결과 -->
    <div v-else class="space-y-4">
      <div class="flex flex-wrap gap-y-2">
        <div v-if="many" class="min-w-[100px] pr-5"><p class="label">파일</p><p class="text-2xl font-bold tabular-nums">{{ totals.files }}</p></div>
        <div class="min-w-[100px] px-5" :class="many ? 'border-l border-line' : 'pl-0'"><p class="label">전체 행</p><p class="text-2xl font-bold tabular-nums">{{ totals.totalRows }}</p></div>
        <div class="min-w-[100px] border-l border-line px-5"><p class="label">등록됨</p><p class="text-2xl font-bold tabular-nums text-ok">{{ totals.successRows }}</p></div>
        <div class="min-w-[100px] border-l border-line px-5"><p class="label">실패한 행</p><p class="text-2xl font-bold tabular-nums" :class="totals.failedRows ? 'text-bad' : 'text-faint'">{{ totals.failedRows }}</p></div>
        <div v-if="totals.failedFiles" class="min-w-[100px] border-l border-line px-5"><p class="label">못 올린 파일</p><p class="text-2xl font-bold tabular-nums text-bad">{{ totals.failedFiles }}</p></div>
      </div>

      <p v-if="busy" class="flex items-center gap-2 font-semibold text-brand"><Loader2 :size="17" class="animate-spin" />올리는 중입니다. 창을 닫지 마세요.</p>
      <p v-else-if="!totals.failedRows && !totals.failedFiles" class="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 :size="18" />모든 행을 등록했습니다.</p>
      <p v-else class="flex items-center gap-2 font-semibold"><AlertTriangle :size="17" class="text-bad" />등록하지 못한 것이 있습니다. 엑셀에서 고친 뒤 그 파일만 다시 올리세요.</p>

      <ul class="space-y-2">
        <li v-for="(j, i) in jobs" :key="i" class="overflow-hidden rounded-md border border-line">
          <div class="flex items-center gap-2.5 px-3 py-2">
            <Loader2 v-if="j.state === 'UPLOADING'" :size="16" class="shrink-0 animate-spin text-brand" />
            <CheckCircle2 v-else-if="j.state === 'DONE' && !j.result.failedRows" :size="16" class="shrink-0 text-ok" />
            <AlertTriangle v-else-if="j.state === 'DONE' || j.state === 'FAILED'" :size="16" class="shrink-0 text-bad" />
            <FileSpreadsheet v-else :size="16" class="shrink-0 text-faint" />
            <span class="min-w-0 flex-1 truncate text-[0.93rem] font-medium">{{ j.name }}</span>
            <span v-if="j.state === 'WAITING'" class="shrink-0 text-[0.82rem] text-faint">기다리는 중</span>
            <span v-else-if="j.state === 'UPLOADING'" class="shrink-0 text-[0.82rem] font-semibold text-brand">올리는 중…</span>
            <span v-else-if="j.state === 'DONE'" class="shrink-0 text-[0.84rem] tabular-nums text-sub">등록 <b class="text-ok">{{ j.result.successRows }}</b> · 실패 <b :class="j.result.failedRows ? 'text-bad' : 'text-faint'">{{ j.result.failedRows }}</b></span>
            <span v-else class="shrink-0 text-[0.84rem] font-semibold text-bad">올리지 못함</span>
          </div>
          <p v-if="j.state === 'FAILED'" class="border-t border-line bg-bad-soft/40 px-3 py-2 text-[0.88rem] text-bad">{{ j.error }}</p>
          <table v-if="j.result?.errors?.length" class="w-full border-t border-line">
            <thead class="bg-sunken"><tr><th class="th w-16">행</th><th class="th w-36">열</th><th class="th w-32">값</th><th class="th">이유</th></tr></thead>
            <tbody>
              <tr v-for="(e, n) in j.result.errors" :key="n" class="row-line">
                <td class="td font-bold tabular-nums">{{ e.rowNumber }}</td>
                <td class="td">{{ e.column }}</td>
                <td class="td text-sub">{{ e.value || '(빈 칸)' }}</td>
                <td class="td text-bad">{{ e.message }}</td>
              </tr>
            </tbody>
          </table>
        </li>
      </ul>
    </div>

    <template #footer>
      <template v-if="!jobs">
        <button class="btn btn-ghost mr-auto" @click="template"><Download :size="16" />샘플 파일</button>
        <button class="btn" @click="emit('close')">취소</button>
        <button class="btn btn-primary" :disabled="!files.length" @click="upload">{{ files.length > 1 ? `${files.length}개 파일 업로드` : '업로드' }}</button>
      </template>
      <template v-else>
        <button class="btn" :disabled="!finished" @click="reset">다른 파일 올리기</button>
        <button class="btn btn-primary" :disabled="!finished" @click="emit('close')">확인</button>
      </template>
    </template>
  </Modal>
</template>
