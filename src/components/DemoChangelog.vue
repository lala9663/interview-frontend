<script setup>
// 시연용 빌드(VITE_DEMO_GUIDE=on)에서만 쓴다: 이 목업이 몇 주 차 것인지와 지난주 대비 달라진 것을 보여 주는 버튼과 창.
// 내용은 mocks/changelog.js 에 있다. 실제 서비스 화면에는 나오지 않는다.
import { ref } from 'vue'
import { History } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { CHANGELOG, CURRENT } from '@/mocks/changelog.js'

const open = ref(false)
const KIND = {
  new: { label: '새로 생김', tone: 'brand' },
  improved: { label: '나아짐', tone: 'ok' },
  fixed: { label: '고침', tone: 'warn' },
}
const md = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}
</script>

<template>
  <button class="btn btn-sm" :title="`${CURRENT.week} 목업에서 달라진 것 보기`" @click="open = true">
    <History :size="14" />{{ CURRENT.label }} · 달라진 것
  </button>

  <Modal v-if="open" title="주차별로 달라진 것" wide @close="open = false">
    <div class="space-y-7">
      <section v-for="(w, i) in CHANGELOG" :key="w.week">
        <header class="mb-2 flex flex-wrap items-baseline gap-x-2.5 border-b border-line pb-2">
          <h3 class="h-sec">{{ w.label }}</h3>
          <span class="text-[0.84rem] tabular-nums text-sub">{{ md(w.meeting) }} 회의 · {{ w.week }}</span>
          <span v-if="i === 0" class="badge tone-brand">지금 보는 목업</span>
        </header>
        <p class="mb-2.5 text-[0.93rem] leading-relaxed text-sub">{{ w.summary }}</p>
        <ul class="divide-y divide-line">
          <li v-for="(it, n) in w.items" :key="n" class="flex items-start gap-3 py-2">
            <span class="badge mt-0.5 w-[76px] shrink-0 justify-center" :class="`tone-${KIND[it.kind]?.tone || 'neutral'}`">{{ KIND[it.kind]?.label || it.kind }}</span>
            <span class="w-20 shrink-0 pt-0.5 text-[0.86rem] font-semibold text-sub">{{ it.area }}</span>
            <span class="min-w-0 flex-1 leading-relaxed">{{ it.text }}</span>
          </li>
        </ul>
      </section>
    </div>
    <template #footer><button class="btn btn-primary" @click="open = false">닫기</button></template>
  </Modal>
</template>
