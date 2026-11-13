<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import Toasts from '@/components/Toasts.vue'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'

const route = useRoute()
const ui = useUi()
useAuth().bindRouter(useRouter())
onMounted(() => ui.applyTheme())
</script>

<template>
  <RouterView v-if="route.meta.bare" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
  <Toasts />
</template>
