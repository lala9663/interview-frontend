<script setup>
// 면접 후 > 물은 질문: 이번 면접에서 실제로 물은 질문 목록. 잘 쓰인 질문(채택한 꼬리질문, 직접 추가한 질문 등)을
// 질문 은행에 담아 다음 면접에서도 쓰게 한다. 담을 때 글을 고칠 수 있다: 이 지원자에게만 맞는 표현을 일반적인 말로 바꾸기 위해서다.
import { computed, ref } from 'vue'
import { Check, Library, ListChecks } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import Modal from '@/components/Modal.vue'
import { miscApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { QUESTION_SOURCE, labelOf } from '@/lib/labels.js'

const props = defineProps({ questions: { type: Array, required: true } })
const ui = useUi()

const asked = computed(() => props.questions.filter((q) => q.asked && !q.hidden))
const banked = ref(new Set()) // 이 화면에서 담은 질문 id
const target = ref(null)
const form = ref({ text: '', category: '' })
const busy = ref(false)

function open(q) {
  target.value = q
  form.value = { text: q.text, category: q.category || '' }
}
async function save() {
  busy.value = true
  try {
    await miscApi.saveQuestionToBank(target.value.id, { text: form.value.text.trim(), category: form.value.category.trim() })
    banked.value = new Set([...banked.value, target.value.id])
    ui.toast('질문 은행에 담았습니다.', 'ok')
    target.value = null
  } catch (e) {
    ui.fail(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <EmptyState v-if="!asked.length" title="물은 것으로 표시된 질문이 없습니다" hint="면접 중에 물은 질문이 여기에 모입니다.">
      <template #icon><ListChecks :size="22" /></template>
    </EmptyState>
    <template v-else>
      <p class="mb-2 text-[0.86rem] text-sub">잘 쓰인 질문은 질문 은행에 담아 두면 같은 직무의 다음 면접에서 준비된 질문 후보로 쓰입니다.</p>
      <ol class="divide-y divide-line border-y border-line">
        <li v-for="(q, i) in asked" :key="q.id" class="flex items-center gap-3 py-2.5">
          <span class="w-5 shrink-0 text-right text-[0.88rem] font-bold tabular-nums text-faint">{{ i + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold leading-snug">{{ q.text }}</p>
            <p class="mt-0.5 text-[0.8rem] text-faint">{{ labelOf(QUESTION_SOURCE, q.source) }}<template v-if="q.category"> · {{ q.category }}</template></p>
          </div>
          <span v-if="q.source === 'BANK'" class="shrink-0 text-[0.82rem] text-faint">은행에 있는 질문</span>
          <span v-else-if="banked.has(q.id)" class="flex shrink-0 items-center gap-1 text-[0.84rem] font-semibold text-ok"><Check :size="14" :stroke-width="3" />담음</span>
          <button v-else class="btn btn-sm shrink-0" @click="open(q)"><Library :size="14" />은행에 담기</button>
        </li>
      </ol>
    </template>

    <Modal v-if="target" title="질문 은행에 담기" @close="target = null">
      <div class="space-y-3">
        <div>
          <label class="label mb-1.5 block" for="bank-text">질문</label>
          <textarea id="bank-text" v-model="form.text" rows="3" class="input" />
          <p class="mt-1.5 text-[0.82rem] leading-relaxed text-sub">이 지원자에게만 맞는 표현(회사 이름, 수치 등)은 다른 지원자에게도 물을 수 있는 말로 고쳐 주세요.</p>
        </div>
        <div><label class="label mb-1.5 block" for="bank-cat">분류</label><input id="bank-cat" v-model="form.category" class="input" placeholder="예: 문제 해결" /></div>
        <p class="text-[0.82rem] text-faint">직무와 면접 유형은 이 면접의 것으로 들어갑니다. 같은 직무에 같은 질문이 있으면 새로 만들지 않습니다.</p>
      </div>
      <template #footer>
        <button class="btn" @click="target = null">취소</button>
        <button class="btn btn-primary" :disabled="!form.text.trim() || busy" @click="save">담기</button>
      </template>
    </Modal>
  </div>
</template>
