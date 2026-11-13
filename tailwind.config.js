/** 색은 src/styles/main.css의 CSS 변수에서 온다. 여기서는 이름만 잇는다. */
import { fileURLToPath } from 'node:url'

const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
const here = (p) => fileURLToPath(new URL(p, import.meta.url)).replace(/\\/g, '/')

export default {
  content: [here('./index.html'), here('./src') + '/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', '-apple-system', 'Segoe UI', 'Malgun Gothic', 'sans-serif'],
      },
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        sunken: v('sunken'),
        line: v('line'),
        ink: v('ink'),
        sub: v('sub'),
        faint: v('faint'),
        brand: { DEFAULT: v('brand'), soft: v('brand-soft'), ink: v('brand-ink') },
        ok: { DEFAULT: v('ok'), soft: v('ok-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
        bad: { DEFAULT: v('bad'), soft: v('bad-soft') },
        live: { DEFAULT: v('live'), soft: v('live-soft') },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 1px rgb(15 23 42 / 0.03)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.18), 0 2px 6px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
      },
      animation: { rise: 'rise .22s ease-out both', dot: 'pulseDot 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
}
