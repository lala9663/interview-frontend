// 주차별 목업을 한 번에 만든다: src/mocks/changelog.js 에 있는 주차마다 dist-demo/interview-mockup-<week>.html 하나.
// 주차마다 그 주에 보여 줄 기능만 켜진다(src/lib/features.js). 쓰는 법: npm run build:demo
// 한 주차만 만들려면: npm run build:demo -- 2026-w48
import { build } from 'vite'
import { CHANGELOG } from '../src/mocks/changelog.js'

const only = process.argv[2]
const weeks = [...CHANGELOG].reverse().filter((w) => !only || w.week === only)
if (!weeks.length) {
  console.error(`주차 ${only} 가 src/mocks/changelog.js 에 없습니다. 있는 주차: ${CHANGELOG.map((w) => w.week).join(', ')}`)
  process.exit(1)
}
for (const w of weeks) {
  process.env.VITE_DEMO_WEEK = w.week
  console.log(`\n== ${w.label} (${w.week}, ${w.meeting} 회의) ==`)
  await build({ mode: 'demo', logLevel: 'warn' })
  console.log(`dist-demo/interview-mockup-${w.week}.html`)
}
