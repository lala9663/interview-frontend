import { fileURLToPath } from 'node:url'

// 설정 경로를 절대 경로로 넘긴다: 다른 폴더에서 vite를 띄워도 Tailwind 설정을 찾는다.
const config = fileURLToPath(new URL('./tailwind.config.js', import.meta.url))

export default { plugins: { tailwindcss: { config }, autoprefixer: {} } }
