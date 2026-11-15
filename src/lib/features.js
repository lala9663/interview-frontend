// 주차별 목업에서 "그 주에 보여 줄 기능"만 켜는 스위치.
//
// 시연용 빌드가 주차를 정해 만들 때(VITE_DEMO_WEEK=2026-w48)에만 동작한다. 그 밖의 빌드(개발, 실제 배포)에서는
// 주차가 없으므로 모든 기능이 켜진다. 실제 서비스의 권한이나 기능 플래그가 아니다.
//
// 값은 그 기능이 처음 보이는 과제 주차(mocks/changelog.js 의 no)다. 여기에 없는 기능은 처음(3주 차)부터 보인다.
// 기능을 가릴 때는 화면·메뉴·라우트(router 의 meta.feature)·모의 서버에서 has('이름')으로 확인한다.
import { weekOf } from '@/mocks/changelog.js'

const FIRST_SHOWN = {
  // 4주 차
  candidateFilters: 4, // 면접자 목록의 면접 종류 탭, 담당 직무 미리 선택
  pipeline: 4, // 진행 현황 화면
  spokenFollowUp: 4, // 말로 물은 꼬리질문 자동 채택(followup.matched)
  refinedReport: 4, // 보정본 보고서(사후 정리)
  questionBank: 4, // 질문 은행 화면, 면접 후 "물은 질문"과 은행에 담기
  // 5주 차
  experienced: 5, // 경력 채용 탭(차수, 상세 보고서 포함)
  aiEvaluation: 5, // 면접 후 "AI 참고 평가" 탭과 내 평가 옆의 참고 점수
  // 6주 차
  operations: 6, // 관리 > 운영 현황
  quality: 6, // 관리 > AI 품질
  interviewerStats: 6, // 관리 > 면접관 편차
}

/** 이 빌드가 주차별 목업이면 그 주차 이름, 아니면 null */
export const demoWeek = import.meta.env.VITE_DEMO_WEEK || null
const level = demoWeek ? weekOf(demoWeek).no : Infinity

export const has = (name) => (FIRST_SHOWN[name] ?? 0) <= level
/** 그 주차까지의 변경 요약만(달라진 것 창) */
export const shownUpTo = (weeks) => weeks.filter((w) => w.no <= level)
