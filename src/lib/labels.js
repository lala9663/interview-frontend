// 계약(docs/contract/api-contract.md)의 열거형 → 화면에 쓰는 한국어와 색.
// 열거형이 늘면 여기만 고친다. tone은 main.css의 .tone-* 이름이다.

export const TRACK = {
  NEW_GRAD: { label: '신입', tone: 'brand' },
  EXPERIENCED: { label: '경력', tone: 'ok' },
}

export const INTERVIEW_TYPE = {
  PT: { label: 'PT 면접' },
  PERSONALITY: { label: '인성 면접' },
  PORTFOLIO: { label: '포트폴리오' },
  JOB: { label: '직무 면접' },
}

export const INTERVIEW_MODE = {
  OFFLINE: { label: '대면' },
  ONLINE: { label: '화상' },
}

export const INTERVIEW_STATUS = {
  WAITING: { label: '일정 전', tone: 'neutral' },
  SCHEDULED: { label: '예정', tone: 'brand' },
  IN_PROGRESS: { label: '진행 중', tone: 'live' },
  EVALUATING: { label: '평가 대기', tone: 'warn' },
  DONE: { label: '완료', tone: 'ok' },
  CANCELED: { label: '취소', tone: 'neutral' },
}

export const JOB_STATUS = {
  PENDING: { label: '대기', tone: 'neutral' },
  RUNNING: { label: '생성 중', tone: 'brand' },
  SUCCEEDED: { label: '준비됨', tone: 'ok' },
  FAILED: { label: '실패', tone: 'bad' },
}

export const SPEAKER = {
  INTERVIEWER: { label: '면접관', short: '면' },
  CANDIDATE: { label: '지원자', short: '지' },
  UNKNOWN: { label: '미확인', short: '?' },
}

export const SPEAKER_METHOD = {
  MANUAL: '사람이 지정',
  QUESTION_MATCH: '질문과 일치',
  RULE: '말투 규칙',
  LLM: 'AI 문맥 판정',
  CHANNEL: '마이크 분리',
  NONE: '',
}

export const QUESTION_SOURCE = {
  JD: { label: 'JD', tone: 'brand' },
  RESUME: { label: '이력서', tone: 'ok' },
  BANK: { label: '질문 은행', tone: 'neutral' },
  FOLLOW_UP: { label: '꼬리질문', tone: 'warn' },
  MANUAL: { label: '직접 추가', tone: 'neutral' },
}

export const REPORT_BASIS = {
  LIVE: { label: '실시간 전사 기반 초안', tone: 'warn' },
  REFINED: { label: '보정본', tone: 'ok' },
}

export const BLIND_FIELD = {
  gender: '성별',
  birthDate: '생년월일',
  family: '가족사항',
  photo: '사진',
  address: '주소',
  hometown: '출신 지역',
  religion: '종교',
  marriage: '결혼 여부',
  age: '나이',
}

// 면접자 profile.extra의 키 → 화면 이름. 표에 없는 키는 그대로 보여 준다.
export const PROFILE_EXTRA = {
  languages: '어학',
  awards: '수상',
}

export function labelOf(map, key, fallback = '-') {
  return map[key]?.label ?? fallback
}
export function toneOf(map, key) {
  return map[key]?.tone ?? 'neutral'
}
