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
  // 11/18 회의에서 경력 채용을 먼저 하기로 해 5주 차에서 4주 차로 당겼다
  experienced: 4, // 경력 채용 탭(차수, 상세 보고서 포함)
  aiEvaluation: 4, // 면접 후 "AI 참고 평가" 탭. feedback1118 이 켜지면 채용 담당자에게만 보인다
  // 11/18 회의 의견을 반영한 화면 묶음(아래 "11/18 회의 반영" 참고)
  feedback1118: 4,
  // 화면 시안(가짜 데이터로 돌 때만 켜진다). API 명세에 아직 없다
  persona: 4, // 관리 > 면접 페르소나, 면접 전 화면의 페르소나 선택
  systemStatus: 4, // 위쪽 줄의 시스템 상태, 관리 > 시스템 상태
  modelSwitch: 4, // 관리 > AI 모델(작업별 모델 바꾸기)
  calendar: 4, // 관리 > 일정 달력. 면접 목록 API 의 값만 쓴다(API 명세에 없는 값은 없다)
  // 6주 차
  operations: 6, // 관리 > 운영 현황
  quality: 6, // 관리 > AI 품질
  interviewerStats: 6, // 관리 > 면접관 편차
}

/** 이 빌드가 주차별 목업이면 그 주차 이름, 아니면 null */
export const demoWeek = import.meta.env.VITE_DEMO_WEEK || null
const level = demoWeek ? weekOf(demoWeek).no : Infinity

// 가짜 데이터로 돌 때만 켜는 화면 시안: 주차별 목업과 모의 개발 서버(npm run dev).
// 실제 백엔드에 붙는 빌드(npm run dev:api, 실제 배포)에서는 꺼져 있어 예전 화면이 그대로 나온다.
const MOCKUP_ONLY = ['feedback1118', 'persona', 'systemStatus', 'modelSwitch', 'calendar']
const mockData = !!demoWeek || import.meta.env.VITE_API_MODE === 'mock'

export const has = (name) => (MOCKUP_ONLY.includes(name) && !mockData ? false : (FIRST_SHOWN[name] ?? 0) <= level)

// ---- 11/18 회의 반영 (feedback1118) ----
// 켜지면 달라지는 것: 경력 탭이 먼저, 면접 방은 질문·꼬리질문 트리가 가운데이고 대화는 접힘, 신입은 실시간 기능 잠금과 예상 꼬리질문,
// 준비 화면은 질문을 하나씩 고치지 않고 전체 재생성만, AI 점수는 채용 담당자만, 자동 매칭 대신 파일·채용 시스템에서 받기, 면접자 유형 표시.
// 화면 시안이다. 면접자 유형·질문 피드백·실시간 잠금 값은 API 명세에 아직 없어 모의 데이터와 화면 안에서만 다룬다.

/**
 * 신입(대면) 면접은 실시간 녹음과 꼬리질문을 잠가 둔다(11/18 회의). 코드는 그대로 두고 이 값으로만 가린다.
 * 풀 때는 빌드 환경변수 VITE_NEW_GRAD_LIVE=on. 실제로는 백엔드가 내려 주는 설정이 되어야 한다(API 명세에 아직 없음).
 */
export const liveLocked = (track) => has('feedback1118') && track === 'NEW_GRAD' && import.meta.env.VITE_NEW_GRAD_LIVE !== 'on'

/** 그 주차까지의 변경 요약만(달라진 것 창) */
export const shownUpTo = (weeks) => weeks.filter((w) => w.no <= level)
