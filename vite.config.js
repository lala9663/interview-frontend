import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { CHANGELOG, weekOf } from './src/mocks/changelog.js'

// 시연용 빌드(npm run build:demo): 스크립트·스타일·글꼴을 HTML 한 파일에 넣는다.
// 파일은 주차 이름(interview-mockup-<week>.html)으로 남는다. 주차는 환경변수 VITE_DEMO_WEEK 로 받고
// (scripts/build-mockups.mjs 가 주차마다 넣는다), 없으면 src/mocks/changelog.js 의 가장 최근 주차다.
// 다른 주차의 파일은 지우지 않는다(emptyOutDir: false). 가장 최근 주차는 interview-mockup.html 로도 나온다.
// 서버 없이 파일을 더블클릭해 열 수 있어야 하므로 바깥 파일을 하나도 참조하지 않는다.
function singleFile(fileName, alsoAs) {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'))
      if (!html) return
      let out = String(html.source).replace(/<link rel="icon"[^>]*>\s*/, '')
      for (const f of Object.values(bundle)) {
        if (f === html) continue
        const name = f.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (f.type === 'chunk') {
          const tag = new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`)
          // 화면을 한 덩어리로 합치면 Vite가 미리 불러올 목록의 자리 표시를 못 채운다. 목록이 없다고 알려 준다.
          const code = f.code.replace(/"__VITE_PRELOAD__"/g, 'void 0').replace(/<\/script/g, '<\\/script')
          out = out.replace(tag, () => `<script type="module">\n${code}\n</script>`)
        } else if (f.fileName.endsWith('.css')) {
          const tag = new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`)
          out = out.replace(tag, () => `<style>\n${f.source}\n</style>`)
        }
        delete bundle[f.fileName]
      }
      html.source = out
      html.fileName = fileName
      // 같은 내용을 고정된 이름으로도 남긴다(가장 최근 것을 찾기 쉽게)
      if (alsoAs) this.emitFile({ type: 'asset', fileName: alsoAs, source: out })
    },
  }
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  const week = weekOf(process.env.VITE_DEMO_WEEK).week
  const latest = week === CHANGELOG[0].week
  return {
    plugins: [vue(), demo && singleFile(`interview-mockup-${week}.html`, latest ? 'interview-mockup.html' : null)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: true },
    test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.js'] },
    ...(demo && {
      base: './',
      publicDir: false,
      build: {
        outDir: 'dist-demo',
        emptyOutDir: false,
        cssCodeSplit: false,
        assetsInlineLimit: 100 * 1024 * 1024,
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    }),
  }
})
