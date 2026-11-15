<script setup>
// 엑셀 업로드: 파일 고르기 → 결과(성공 수, 실패 행 목록). 실패 행은 행 번호·열·값·이유를 그대로 보여 준다.
import { ref } from 'vue'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { candidateApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const props = defineProps({ recruitmentId: { type: Number, required: true } })
const emit = defineEmits(['close', 'uploaded'])
const ui = useUi()

const file = ref(null)
const dragging = ref(false)
const busy = ref(false)
const result = ref(null)
const error = ref('')

function pick(f) {
  error.value = ''
  if (!f) return
  if (!/\.xlsx?$/i.test(f.name)) {
    error.value = '엑셀 파일(.xlsx)만 올릴 수 있습니다.'
    return
  }
  file.value = f
}

async function upload() {
  if (!file.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    result.value = await candidateApi.upload(props.recruitmentId, file.value)
    emit('uploaded', result.value)
  } catch (e) {
    error.value = e.code === 'FILE_UNREADABLE' ? `${e.message} DRM이 걸린 파일은 해제한 뒤 올려 주세요.` : e.message
  } finally {
    busy.value = false
  }
}

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
  file.value = null
  result.value = null
  error.value = ''
}
</script>

<template>
  <Modal title="면접자 엑셀 업로드" :wide="!!result" @close="emit('close')">
    <!-- 1. 파일 고르기 -->
    <div v-if="!result" class="space-y-3">
      <label
        class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-9 text-center transition"
        :class="dragging ? 'border-brand bg-sunken' : 'border-line hover:bg-sunken'"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="dragging = false; pick($event.dataTransfer.files[0])"
      >
        <input type="file" accept=".xlsx,.xls" class="sr-only" @change="pick($event.target.files[0])" />
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-sunken text-sub">
          <FileSpreadsheet v-if="file" :size="24" /><UploadCloud v-else :size="24" />
        </span>
        <template v-if="file">
          <p class="font-semibold">{{ file.name }}</p>
          <p class="text-[0.86rem] text-sub">{{ (file.size / 1024).toFixed(0) }} KB · 다른 파일을 고르려면 누르세요</p>
        </template>
        <template v-else>
          <p class="font-semibold">엑셀 파일을 끌어다 놓거나 눌러서 고르세요</p>
          <p class="text-[0.86rem] text-sub">한 파일에 면접자 여러 명 · 첫 행은 열 이름</p>
        </template>
      </label>
      <p v-if="error" class="flex items-start gap-2 border-l-2 border-bad pl-3 text-[0.9rem] font-medium text-bad" role="alert">
        <AlertTriangle :size="16" class="mt-0.5 shrink-0" />{{ error }}
      </p>
      <ul class="space-y-1 text-[0.86rem] text-sub">
        <li>· 성별·생년월일·가족사항 같은 블라인드 항목은 저장하지 않습니다.</li>
        <li>· 같은 수험번호가 다시 올라오면 새 내용으로 바뀝니다.</li>
      </ul>
    </div>

    <!-- 2. 결과 -->
    <div v-else class="space-y-4">
      <div class="flex">
        <div class="min-w-[110px] pr-5"><p class="label">전체 행</p><p class="text-2xl font-bold tabular-nums">{{ result.totalRows }}</p></div>
        <div class="min-w-[110px] border-l border-line px-5"><p class="label">등록됨</p><p class="text-2xl font-bold tabular-nums text-ok">{{ result.successRows }}</p></div>
        <div class="min-w-[110px] border-l border-line px-5"><p class="label">실패</p><p class="text-2xl font-bold tabular-nums" :class="result.failedRows ? 'text-bad' : 'text-faint'">{{ result.failedRows }}</p></div>
      </div>
      <p v-if="!result.failedRows" class="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 :size="18" />모든 행을 등록했습니다.</p>
      <div v-else>
        <p class="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle :size="17" class="text-bad" />등록하지 못한 행 — 엑셀에서 고친 뒤 다시 올리세요</p>
        <div class="overflow-hidden rounded-md border border-line">
          <table class="w-full">
            <thead class="bg-sunken"><tr><th class="th w-16">행</th><th class="th w-36">열</th><th class="th w-32">값</th><th class="th">이유</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in result.errors" :key="i" class="row-line">
                <td class="td font-bold tabular-nums">{{ e.rowNumber }}</td>
                <td class="td">{{ e.column }}</td>
                <td class="td text-sub">{{ e.value || '(빈 칸)' }}</td>
                <td class="td text-bad">{{ e.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <template v-if="!result">
        <button class="btn btn-ghost mr-auto" @click="template"><Download :size="16" />샘플 파일</button>
        <button class="btn" @click="emit('close')">취소</button>
        <button class="btn btn-primary" :disabled="!file || busy" @click="upload">{{ busy ? '올리는 중…' : '업로드' }}</button>
      </template>
      <template v-else>
        <button class="btn" @click="reset">다른 파일 올리기</button>
        <button class="btn btn-primary" @click="emit('close')">확인</button>
      </template>
    </template>
  </Modal>
</template>
