// 주차별 목업(시연용 HTML)의 변경 요약. 매주 회의에서 "지난주 대비 무엇이 달라졌는지"를 보여 주는 데 쓴다.
//
// 쓰는 곳
//  - vite.config.js: 맨 위 항목의 week 로 파일 이름을 정한다(dist-demo/interview-mockup-<week>.html).
//  - components/DemoChangelog.vue: 시연용 빌드의 화면 위쪽 "달라진 것" 버튼과 창.
//
// 매주 하는 일: 화요일에 main 으로 올린 뒤, 이 배열의 맨 위에 그 주 항목을 하나 더하고 `npm run build:demo`.
// 지난 주 항목은 고치지 않는다(그 주에 보여 준 것의 기록이다). 지난 주의 파일은 dist-demo 에 그대로 남는다.
//
// 이 파일은 vite.config.js 가 Node 에서 읽으므로 다른 모듈을 import 하지 않는다.
//
// kind: 'new'(새로 생김) | 'improved'(나아짐) | 'fixed'(고침)
// week: main 에 붙이는 태그와 같은 이름(예: 2026-w47)

export const CHANGELOG = [
  {
    week: '2026-w47',
    label: '3주 차',
    meeting: '2026-11-18',
    summary: '처음 보여 드리는 목업입니다. 신입·경력의 면접 전·중·후 흐름을 가짜 데이터와 준비된 대본으로 끝까지 볼 수 있습니다.',
    items: [
      { kind: 'new', area: '오늘', text: '로그인하면 오늘의 면접, 다음 면접, 평가를 기다리는 면접이 한 화면에 나옵니다.' },
      { kind: 'new', area: '면접자', text: '면접자 목록과 상세(블라인드 제외본). 직무·상태·면접 종류로 거르고, 담당 직무가 하나인 면접관은 그 직무가 먼저 선택됩니다.' },
      { kind: 'new', area: '면접 전', text: '이력서와 JD를 읽고 만든 사전 리포트와 준비된 질문.' },
      { kind: 'new', area: '면접 중', text: '말을 글로 옮기고 면접관·지원자를 나눠 보여 줍니다. 준비한 질문을 말하면 자동으로 "물었음"이 됩니다.' },
      { kind: 'new', area: '면접 중', text: '답변이 끝나면 꼬리질문을 제안합니다. 제안을 누르거나 말로 물으면 질문 목록에 올라갑니다.' },
      { kind: 'new', area: '면접 후', text: '보고서 초안이 먼저 나오고, 녹취를 다시 정리한 보정본으로 바뀝니다. AI 참고 평가와 내 평가를 나란히 봅니다.' },
      { kind: 'new', area: '면접 후', text: '물은 질문 가운데 잘 쓰인 것을 질문 은행에 담습니다.' },
      { kind: 'new', area: '진행 현황', text: '면접자별로 면접 종류마다의 진행 상태를 한 표로 봅니다.' },
      { kind: 'new', area: '관리', text: '엑셀 올리기와 면접관 자동 매칭, 당일 운영 현황, AI 품질, 면접관 편차.' },
    ],
  },
]

export const CURRENT = CHANGELOG[0]
