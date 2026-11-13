// 모의 데이터 (전부 가상의 인물). 모양은 계약 문서의 응답과 같다.
// 백엔드의 local 시드와 비슷하게 맞춰 두면 mock ↔ api 전환 때 화면이 덜 달라진다.

const today = (h, m = 0) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const dayOffset = (days, h) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(h, 0, 0, 0)
  return d.toISOString()
}

export const users = [
  { id: 1, employeeNo: 'E1001', name: '김서연', department: 'People팀', role: 'ADMIN', jobCodes: ['SW', 'AI'] },
  { id: 2, employeeNo: 'E1002', name: '박준호', department: 'SW개발1그룹', role: 'INTERVIEWER', jobCodes: ['SW'] },
  { id: 3, employeeNo: 'E1003', name: '이하린', department: 'HW설계팀', role: 'INTERVIEWER', jobCodes: ['HW', 'AI'] },
  { id: 4, employeeNo: 'E1004', name: '최민재', department: 'AI연구소', role: 'INTERVIEWER', jobCodes: ['AI', 'SW', 'HW'] },
]

export const recruitments = [
  { id: 1, title: '2026 하반기 신입 공채', track: 'NEW_GRAD', startDate: '2026-11-09', endDate: '2026-11-20' },
  { id: 2, title: '경력 상시 채용', track: 'EXPERIENCED', startDate: '2026-01-01', endDate: '2026-12-31' },
]

export const jobs = [
  { id: 1, recruitmentId: 1, jobCode: 'SW', title: 'SW개발', jdText: '임베디드·플랫폼 소프트웨어 설계와 구현. C/C++, 자료구조, 운영체제 기초.' },
  { id: 2, recruitmentId: 1, jobCode: 'AI', title: 'AI연구', jdText: '머신러닝 모델 연구와 서비스 적용. 선형대수, 확률통계, PyTorch.' },
  { id: 3, recruitmentId: 1, jobCode: 'HW', title: 'HW설계', jdText: '디지털·아날로그 회로 설계와 검증.' },
  { id: 4, recruitmentId: 2, jobCode: 'SW', title: '플랫폼 백엔드(경력)', jdText: '대규모 트래픽 서비스의 백엔드 설계와 운영. Java/Spring, 분산 시스템.' },
]

const N = (id, applicantNo, name, jobCode, jobTitle, school, major, extra = {}) => ({
  id, applicantNo, name, track: 'NEW_GRAD', recruitmentId: 1, jobCode, jobTitle,
  profile: {
    education: [{ school, major, degree: '학사', gpa: extra.gpa || '3.8/4.5' }],
    courses: extra.courses || ['자료구조', '운영체제', '컴퓨터구조', '알고리즘'],
    essays: [
      { title: '지원 동기', text: `${jobTitle} 직무에서 제품의 기반이 되는 기술을 만들고 싶어 지원했습니다. 학부 연구생으로 일하며 문제를 끝까지 파고드는 습관을 길렀습니다.` },
      { title: '가장 도전적이었던 경험', text: extra.essay || '캡스톤 프로젝트에서 센서 데이터 유실 문제를 맡아 원인을 추적했고, 버퍼 구조를 바꿔 유실률을 4%에서 0.2%로 낮췄습니다.' },
    ],
    projects: [{ title: extra.project || '캡스톤: 스마트 물류 로봇', text: '4인 팀에서 펌웨어와 통신 모듈을 맡았습니다. RTOS 기반 태스크 설계, UART/CAN 드라이버 작성.' }],
    careers: [],
    certificates: extra.certs || ['정보처리기사'],
    extra: { languages: 'OPIc IH', awards: extra.award || '교내 SW 경진대회 은상' },
  },
  blindedFields: ['gender', 'birthDate', 'family'],
})

const E = (id, applicantNo, name, company, role, years) => ({
  id, applicantNo, name, track: 'EXPERIENCED', recruitmentId: 2, jobCode: 'SW', jobTitle: '플랫폼 백엔드(경력)',
  profile: {
    education: [{ school: '한빛대학교', major: '컴퓨터공학', degree: '학사', gpa: '' }],
    courses: [],
    essays: [{ title: '이직 사유와 지원 동기', text: '더 큰 규모의 트래픽을 다루는 플랫폼에서 설계 역량을 넓히고 싶습니다.' }],
    projects: [{ title: '주문 처리 시스템 재설계', text: '모놀리식 주문 서비스를 이벤트 기반으로 분리해 피크 시간 처리량을 3배로 늘렸습니다.' }],
    careers: [{ company, role, period: `${2026 - years}.03 ~ 현재`, text: 'Java/Spring 기반 주문·결제 백엔드 개발과 운영. Kafka, Redis, Oracle.' }],
    certificates: ['SQLD'],
    extra: {},
  },
  blindedFields: ['gender', 'birthDate', 'family'],
})

export const candidates = [
  N(101, '2026H-00014', '이도윤', 'SW', 'SW개발', '한빛대학교', '컴퓨터공학'),
  N(102, '2026H-00027', '한지우', 'SW', 'SW개발', '새솔대학교', '소프트웨어학', { project: '오픈소스 RTOS 포팅', award: '해커톤 대상' }),
  N(103, '2026H-00031', '서하준', 'AI', 'AI연구', '누리대학교', '인공지능학', { courses: ['선형대수', '확률통계', '기계학습', '딥러닝'], project: '경량 음성 인식 모델', certs: [] }),
  N(104, '2026H-00042', '윤서아', 'AI', 'AI연구', '한빛대학교', '통계학', { courses: ['수리통계', '회귀분석', '기계학습'], project: '추천 시스템 A/B 테스트 분석' }),
  N(105, '2026H-00058', '강민서', 'HW', 'HW설계', '가람대학교', '전자공학', { courses: ['회로이론', '전자회로', '디지털논리'], project: 'FPGA 기반 영상 필터' }),
  N(106, '2026H-00063', '조예준', 'SW', 'SW개발', '누리대학교', '컴퓨터공학', { gpa: '4.1/4.5' }),
  N(107, '2026H-00071', '임수아', 'SW', 'SW개발', '새솔대학교', '정보통신공학', { project: 'BLE 메시 네트워크' }),
  N(108, '2026H-00085', '오시우', 'HW', 'HW설계', '한빛대학교', '전자공학', { courses: ['반도체공학', '전자회로'], project: '저전력 ADC 설계' }),
  E(201, 'EXP-2026-0311', '문태현', '(주)다온커머스', '백엔드 개발자', 6),
  E(202, 'EXP-2026-0318', '배소윤', '(주)모아페이', '시니어 백엔드', 9),
  E(203, 'EXP-2026-0325', '신재원', '(주)링크모빌리티', '플랫폼 엔지니어', 5),
]

let iv = 500
const I = (candidateId, type, seq, mode, status, scheduledAt, interviewerIds, extra = {}) => ({
  id: ++iv, candidateId, type, seq, mode, status, scheduledAt, durationMinutes: 30, interviewerIds,
  roomId: null, roomStatus: null, briefingStatus: 'SUCCEEDED', reportStatus: null, reportBasis: null, ...extra,
})

export const interviews = [
  I(101, 'PT', 1, 'OFFLINE', 'DONE', today(9, 30), [1, 2], { roomId: 9001, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(102, 'PT', 1, 'OFFLINE', 'EVALUATING', today(10, 30), [1, 2], { roomId: 9002, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'LIVE' }),
  I(103, 'PT', 1, 'OFFLINE', 'SCHEDULED', today(13, 30), [1, 3]),
  I(104, 'PT', 1, 'OFFLINE', 'SCHEDULED', today(14, 30), [1, 3], { briefingStatus: 'RUNNING' }),
  I(106, 'PT', 1, 'OFFLINE', 'SCHEDULED', today(15, 30), [1, 2]),
  I(107, 'PERSONALITY', 2, 'OFFLINE', 'SCHEDULED', today(16, 30), [1, 2]),
  I(105, 'PT', 1, 'OFFLINE', 'SCHEDULED', today(14, 0), [4]),
  I(108, 'PT', 1, 'OFFLINE', 'WAITING', null, [4], { briefingStatus: null }),
  // 경력: 한 사람이 여러 차수를 본다
  I(201, 'PORTFOLIO', 1, 'ONLINE', 'DONE', dayOffset(-6, 14), [1, 2], { roomId: 9101, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(201, 'JOB', 2, 'ONLINE', 'SCHEDULED', today(17, 0), [1, 2]),
  I(201, 'PERSONALITY', 3, 'ONLINE', 'WAITING', null, [1], { briefingStatus: null }),
  I(202, 'PORTFOLIO', 1, 'ONLINE', 'DONE', dayOffset(-9, 10), [2], { roomId: 9102, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(202, 'JOB', 2, 'ONLINE', 'DONE', dayOffset(-3, 10), [1, 2], { roomId: 9103, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(202, 'PERSONALITY', 3, 'ONLINE', 'SCHEDULED', dayOffset(2, 15), [1]),
  I(203, 'PORTFOLIO', 1, 'ONLINE', 'SCHEDULED', dayOffset(1, 11), [1, 2]),
]

export const questionBank = [
  { id: 31, jobCode: 'SW', interviewType: 'PT', category: 'CS기초', text: '프로세스와 스레드의 차이를 설명해 주세요.' },
  { id: 32, jobCode: 'SW', interviewType: 'PT', category: 'CS기초', text: '교착 상태가 생기는 조건과 해결 방법은 무엇인가요?' },
  { id: 33, jobCode: 'SW', interviewType: 'PT', category: '설계', text: '메모리가 제한된 환경에서 자료구조를 어떻게 고르나요?' },
  { id: 34, jobCode: 'AI', interviewType: 'PT', category: 'ML기초', text: '과적합을 줄이는 방법을 세 가지 이상 말해 주세요.' },
  { id: 35, jobCode: 'AI', interviewType: 'PT', category: 'ML기초', text: '편향과 분산의 관계를 설명해 주세요.' },
  { id: 36, jobCode: 'HW', interviewType: 'PT', category: '회로', text: '셋업 타임과 홀드 타임 위반은 각각 어떻게 해결하나요?' },
  { id: 37, jobCode: 'SW', interviewType: 'PERSONALITY', category: '협업', text: '팀원과 의견이 달랐을 때 어떻게 조율했나요?' },
  { id: 38, jobCode: 'SW', interviewType: 'JOB', category: '설계', text: '트래픽이 열 배가 되면 지금 구조에서 무엇이 먼저 무너지나요?' },
]

export const criteria = [
  { code: 'JOB_KNOWLEDGE', name: '직무 지식', description: '전공·직무 기초를 정확히 이해하고 설명한다', maxScore: 5 },
  { code: 'PROBLEM_SOLVING', name: '문제 해결', description: '문제를 구조화하고 근거를 들어 해결한다', maxScore: 5 },
  { code: 'COMMUNICATION', name: '의사소통', description: '질문의 뜻을 파악하고 명확하게 답한다', maxScore: 5 },
  { code: 'GROWTH', name: '성장 가능성', description: '배운 것을 돌아보고 다음에 적용한다', maxScore: 5 },
]

export function briefingFor(c, it) {
  const p = c.profile
  const proj = p.projects[0]
  const exp = c.track === 'EXPERIENCED'
  return {
    status: 'SUCCEEDED',
    generatedAt: new Date(Date.now() - 3600e3).toISOString(),
    model: 'mock-llm',
    summary: {
      headline: exp
        ? `${p.careers[0].company} ${p.careers[0].role} 출신, 이벤트 기반 재설계 경험`
        : `${proj.title.replace('캡스톤: ', '')} 경험이 뚜렷한 ${c.jobTitle} 지원자`,
      keyPoints: exp
        ? ['주문 처리 시스템을 이벤트 기반으로 분리, 피크 처리량 3배', 'Java/Spring, Kafka, Redis, Oracle 운영 경험', '이직 사유: 더 큰 규모의 트래픽과 설계 역할']
        : [`${p.education[0].school} ${p.education[0].major}, 학점 ${p.education[0].gpa}`, `${proj.title}: ${proj.text.split('.')[0]}`, `수상: ${p.extra.awards}`],
      strengths: exp
        ? ['성과를 숫자로 설명한다', '운영 장애 대응 경험이 있다']
        : ['문제 원인을 끝까지 추적한 경험이 구체적이다', '역할과 기여가 분명하게 적혀 있다'],
      checkPoints: exp
        ? ['"처리량 3배"에서 본인이 설계한 범위', '분리 과정에서의 데이터 정합성 처리 방식']
        : ['유실률 4% → 0.2% 개선에서 본인이 한 일과 팀이 한 일의 구분', '전공 기초(운영체제) 이해 깊이'],
      timeline: exp
        ? [{ period: p.careers[0].period, text: `${p.careers[0].company} · ${p.careers[0].role}` }]
        : [{ period: '2025.03 ~ 2025.12', text: proj.title }, { period: '2024.06 ~ 2024.08', text: '학부 연구생 (임베디드 연구실)' }],
    },
    excluded: ['gender', 'family'],
    _type: it.type,
  }
}

let qid = 7000
export function questionsFor(c, it) {
  const proj = c.profile.projects[0].title
  const bank = questionBank.filter((q) => q.jobCode === c.jobCode).slice(0, 2)
  const rows = [
    ['RESUME', '프로젝트', `${proj}에서 맡은 역할과 가장 어려웠던 점은 무엇이었나요?`, '기여도와 문제 해결 과정 확인'],
    ['RESUME', '프로젝트', '그 문제의 원인을 어떻게 찾았고, 다른 방법은 검토했나요?', '원인 분석의 깊이'],
    ['JD', '직무 기초', c.jobCode === 'AI' ? '모델 성능이 검증 데이터에서만 떨어질 때 무엇부터 확인하나요?' : '인터럽트와 폴링 방식의 장단점을 비교해 주세요.', 'JD의 필수 지식 확인'],
    ['JD', '설계', c.track === 'EXPERIENCED' ? '이벤트 기반으로 분리할 때 순서 보장은 어떻게 했나요?' : '제한된 메모리에서 버퍼를 설계할 때 고려할 점은?', '설계 판단 근거'],
    ...bank.map((b) => ['BANK', b.category, b.text, '질문 은행']),
    ['RESUME', '성장', '그 경험을 다시 한다면 무엇을 다르게 하겠습니까?', '회고와 학습'],
  ]
  return rows.map(([source, category, text, intent], i) => ({
    id: ++qid, interviewId: it.id, source, category, text, intent, orderNo: i + 1,
    asked: false, askedAtSeq: null, hidden: false, parentQuestionId: null,
  }))
}

/** 실시간 방 데모 대본. speaker와 다듬기 전/후 문장. q는 questionsFor의 몇 번째 질문과 맞는지(0부터). */
export const liveScript = [
  { speaker: 'INTERVIEWER', raw: '네 안녕하세요 자리에 앉으시고요 음 먼저 프로젝트에서 맡은 역할이랑 제일 어려웠던 점 말씀해 주시겠어요', refined: '안녕하세요. 먼저 프로젝트에서 맡은 역할과 가장 어려웠던 점을 말씀해 주시겠어요?', q: 0 },
  { speaker: 'CANDIDATE', raw: '네 저는 어 4인 팀에서 펌웨어랑 통신 모듈을 맡았고요 제일 어려웠던 거는 그 센서 데이터가 중간중간 유실되는 문제였습니다', refined: '저는 4인 팀에서 펌웨어와 통신 모듈을 맡았습니다. 가장 어려웠던 것은 센서 데이터가 중간중간 유실되는 문제였습니다.' },
  { speaker: 'CANDIDATE', raw: '처음에는 하드웨어 문제인 줄 알았는데 로그를 찍어보니까 인터럽트가 몰릴 때 링 버퍼가 덮어써지고 있었습니다 그래서 버퍼 크기를 키우고 태스크 우선순위를 조정했습니다', refined: '처음에는 하드웨어 문제라고 생각했지만, 로그를 확인해 보니 인터럽트가 몰릴 때 링 버퍼가 덮어써지고 있었습니다. 그래서 버퍼 크기를 키우고 태스크 우선순위를 조정했습니다.', followUps: [
    { text: '버퍼 크기를 키우는 것 말고 검토한 다른 방법이 있었나요?', rationale: '대안 검토 여부가 답변에 없음' },
    { text: '우선순위를 조정했을 때 다른 태스크에 생긴 영향은 어떻게 확인했나요?', rationale: '부작용 검증 과정 확인' },
    { text: '유실률을 어떤 방법으로 측정했나요?', rationale: '이력서의 4% → 0.2% 수치의 근거' },
  ] },
  { speaker: 'INTERVIEWER', raw: '그 원인을 어떻게 찾으셨는지 그리고 다른 방법은 검토 안 하셨는지', refined: '그 원인을 어떻게 찾았고, 다른 방법은 검토하지 않았나요?', q: 1 },
  { speaker: 'CANDIDATE', raw: '원인은 타임스탬프를 넣어서 유실 시점을 모아 보니까 다 통신 인터럽트 직후였고요 다른 방법으로는 DMA로 바꾸는 걸 검토했는데 보드에서 채널이 부족해서 못 썼습니다', refined: '타임스탬프를 넣어 유실 시점을 모아 보니 모두 통신 인터럽트 직후였습니다. DMA로 바꾸는 방법도 검토했지만 보드의 채널이 부족해 쓰지 못했습니다.', followUps: [
    { text: 'DMA 채널이 충분했다면 어떤 구조로 바꿨을까요?', rationale: '설계 이해도 확인' },
    { text: '같은 문제가 다시 생기지 않게 어떤 테스트를 추가했나요?', rationale: '재발 방지 관점' },
  ] },
  { speaker: 'INTERVIEWER', raw: '좋습니다 그럼 인터럽트 방식이랑 폴링 방식 장단점 비교해 주시겠어요', refined: '좋습니다. 그럼 인터럽트 방식과 폴링 방식의 장단점을 비교해 주시겠어요?', q: 2 },
  { speaker: 'CANDIDATE', raw: '인터럽트는 이벤트가 생길 때만 처리해서 응답이 빠르고 CPU를 아끼는데 너무 자주 발생하면 오버헤드가 커지고요 폴링은 구현이 단순하고 예측 가능하지만 주기만큼 지연이 생깁니다', refined: '인터럽트는 이벤트가 생길 때만 처리하므로 응답이 빠르고 CPU를 아끼지만, 너무 자주 발생하면 오버헤드가 커집니다. 폴링은 구현이 단순하고 예측 가능하지만 주기만큼 지연이 생깁니다.', followUps: [
    { text: '인터럽트가 너무 잦을 때 실제로 어떤 방법으로 줄일 수 있나요?', rationale: '개념을 실무에 적용하는지 확인' },
  ] },
]

export const sampleTranscript = liveScript.map((u, i) => ({
  seq: i + 1, speaker: u.speaker, speakerMethod: u.q !== undefined ? 'QUESTION_MATCH' : 'LLM',
  rawText: u.raw, refinedText: u.refined, startMs: i * 21000, endMs: i * 21000 + 17000, matchedQuestionId: null, source: 'POST',
}))

export function aiEvaluationFor() {
  return {
    status: 'SUCCEEDED', model: 'mock-llm', generatedAt: new Date().toISOString(),
    scores: [
      { criterionCode: 'JOB_KNOWLEDGE', criterionName: '직무 지식', score: 4, maxScore: 5, rationale: '인터럽트와 폴링의 차이를 정확히 설명하고 오버헤드까지 언급했다.', evidenceSeqs: [7] },
      { criterionCode: 'PROBLEM_SOLVING', criterionName: '문제 해결', score: 4, maxScore: 5, rationale: '타임스탬프로 유실 시점을 모아 원인을 좁혔다. 대안(DMA)도 검토했다.', evidenceSeqs: [3, 5] },
      { criterionCode: 'COMMUNICATION', criterionName: '의사소통', score: 3, maxScore: 5, rationale: '답이 구조적이지만 측정 방법은 묻기 전까지 말하지 않았다.', evidenceSeqs: [2] },
      { criterionCode: 'GROWTH', criterionName: '성장 가능성', score: null, maxScore: 5, rationale: '회고에 대한 질문이 없어 근거가 부족하다.', evidenceSeqs: [] },
    ],
    overallComment: '프로젝트의 문제 해결 과정을 구체적인 근거로 설명했다. 성장 가능성은 판단할 발화가 없어 점수를 내지 않았다.',
  }
}

export function reportFor(c, it, basis = 'REFINED') {
  const detailed = c.track === 'EXPERIENCED'
  return {
    version: basis === 'REFINED' ? 2 : 1, basis, detail: detailed ? 'DETAILED' : 'BRIEF', status: 'SUCCEEDED',
    generatedAt: new Date(Date.now() - (basis === 'REFINED' ? 600e3 : 1500e3)).toISOString(), model: 'mock-llm',
    content: {
      headline: detailed ? '설계 판단의 근거가 분명한 백엔드 경력자' : '원인 분석이 구체적인 지원자, 전공 기초 양호',
      overallComment: detailed
        ? '주문 처리 시스템 재설계에서 본인이 맡은 범위와 판단 근거를 일관되게 설명했다. 처리량 3배 수치는 피크 시간 기준이며 측정 방법도 확인됐다. 정합성 처리에 대한 답은 원칙 수준에 머물러 다음 차수에서 사례로 확인할 필요가 있다.'
        : '센서 데이터 유실 문제를 타임스탬프로 추적해 원인을 좁힌 과정을 구체적으로 설명했다. 인터럽트와 폴링의 차이도 정확했다. 회고에 대한 질문은 하지 못했다.',
      strengths: ['문제의 원인을 데이터로 좁혀 간다', '대안을 검토하고 선택 이유를 설명한다'],
      concerns: detailed ? ['분산 환경의 정합성 처리 경험은 사례가 부족하다'] : ['수치(유실률)의 측정 방법은 추가 질문 뒤에야 설명했다'],
      qaHighlights: [
        { question: '프로젝트에서 맡은 역할과 가장 어려웠던 점', answerSummary: '펌웨어와 통신 모듈 담당. 인터럽트가 몰릴 때 링 버퍼가 덮어써지는 문제를 찾아 해결.', seqs: [2, 3] },
        { question: '원인을 찾은 방법과 검토한 대안', answerSummary: '타임스탬프로 유실 시점을 수집. DMA를 검토했으나 채널 부족으로 제외.', seqs: [5] },
      ],
      competencies: detailed ? [
        { name: '시스템 설계', assessment: '분리 기준과 이벤트 설계의 근거를 설명한다.', evidence: ['주문 상태 변경을 이벤트로 발행하고 소비자별로 멱등 처리'] },
        { name: '운영·장애 대응', assessment: '피크 시간 장애를 지표로 설명한다.', evidence: ['처리 지연이 생긴 구간을 큐 적체 지표로 확인'] },
      ] : [],
      careerChecks: detailed ? [{ claim: '피크 시간 처리량 3배', finding: '부하 테스트와 운영 지표 둘 다로 확인했다고 답함. 본인은 주문 도메인 분리를 설계.' }] : [],
      nextRoundChecks: detailed ? ['정합성 문제를 실제로 겪은 사례', '팀 내 설계 리뷰에서의 역할'] : [],
      risks: detailed ? ['Oracle 대용량 운영 경험은 제한적'] : [],
    },
  }
}
