// 모의 데이터 (전부 가상의 인물). 모양은 API 명세의 응답과 같다.
// 백엔드의 local 시드와 비슷하게 맞춰 두면 mock ↔ api 전환 때 화면이 덜 달라진다.

// 오늘 일정은 지금 시각을 기준으로 잡는다: 언제 열어도 "곧 시작할 면접"과 "진행 중인 방"이 자연스럽게 보인다.
const MIN = 60000
const floorTo = (ms, minutes) => Math.floor(ms / (minutes * MIN)) * minutes * MIN
const loadedAt = Date.now()
// 기준 칸은 02:30~21:00 사이로 묶는다: 앞뒤 다섯 칸이 모두 오늘 날짜에 들어가야 "오늘 일정"에 나온다.
const dayStart = new Date(loadedAt).setHours(0, 0, 0, 0)
const baseSlot = Math.min(Math.max(floorTo(loadedAt, 30), dayStart + 150 * MIN), dayStart + 21 * 60 * MIN)
/** 지금이 속한 30분 칸에서 n칸 뒤(음수면 앞)의 시각 */
const slot = (n) => new Date(baseSlot + n * 30 * MIN).toISOString()
/** m분 전 */
const ago = (m) => new Date(loadedAt - m * MIN).toISOString()
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
  { id: 5, employeeNo: 'E1005', name: '정다인', department: 'SW개발2그룹', role: 'INTERVIEWER', jobCodes: ['SW', 'HW'] },
  { id: 6, employeeNo: 'E1006', name: '송우진', department: 'AI연구소', role: 'INTERVIEWER', jobCodes: ['AI'] },
  { id: 7, employeeNo: 'E1007', name: '유채은', department: 'HW설계팀', role: 'INTERVIEWER', jobCodes: ['HW'] },
  { id: 8, employeeNo: 'E1008', name: '권지호', department: 'SW개발1그룹', role: 'INTERVIEWER', jobCodes: ['SW', 'AI'] },
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

// applicantType: 면접자 유형(11/18 회의). API 명세에 아직 없는 값이다(lib/labels.js 의 APPLICANT_TYPE).
const NEW_TYPES = ['OPEN', 'OPEN', 'SCHOLARSHIP', 'OPEN', 'INTERN']
const N = (id, applicantNo, name, jobCode, jobTitle, school, major, extra = {}) => ({
  id, applicantNo, name, track: 'NEW_GRAD', recruitmentId: 1, jobCode, jobTitle, applicantType: NEW_TYPES[id % NEW_TYPES.length],
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

const E = (id, applicantNo, name, company, role, years, applicantType = 'CAREER') => ({
  id, applicantNo, name, track: 'EXPERIENCED', recruitmentId: 2, jobCode: 'SW', jobTitle: '플랫폼 백엔드(경력)', applicantType,
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
  E(202, 'EXP-2026-0318', '배소윤', '(주)모아페이', '시니어 백엔드', 9, 'PHD'),
  E(203, 'EXP-2026-0325', '신재원', '(주)링크모빌리티', '플랫폼 엔지니어', 5, 'CAREER_MASTER'),
]

let iv = 500
const I = (candidateId, type, seq, mode, status, scheduledAt, interviewerIds, extra = {}) => ({
  id: ++iv, candidateId, type, seq, mode, status, scheduledAt, durationMinutes: 30, interviewerIds,
  roomId: null, roomStatus: null, briefingStatus: 'SUCCEEDED', reportStatus: null, reportBasis: null, ...extra,
})

export const interviews = [
  // 신입도 직무 면접(1차)과 인성 면접(2차) 두 가지만 본다(2026-11-18 확인). PT 면접이라는 종류는 쓰지 않는다
  I(101, 'JOB', 1, 'OFFLINE', 'DONE', slot(-5), [1, 2], { roomId: 9001, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(102, 'JOB', 1, 'OFFLINE', 'EVALUATING', slot(-3), [1, 2], { roomId: 9002, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'LIVE' }),
  I(103, 'JOB', 1, 'OFFLINE', 'SCHEDULED', slot(2), [1, 3]),
  I(104, 'JOB', 1, 'OFFLINE', 'SCHEDULED', slot(3), [1, 3], { briefingStatus: 'RUNNING' }),
  // 다음 면접(시연에서 면접 방으로 들어갈 면접). 대본이 SW개발 내용이라 SW 지원자로 둔다.
  I(106, 'JOB', 1, 'OFFLINE', 'SCHEDULED', slot(1), [1, 2]),
  I(107, 'PERSONALITY', 2, 'OFFLINE', 'SCHEDULED', slot(4), [1, 2]),
  I(105, 'JOB', 1, 'OFFLINE', 'SCHEDULED', slot(2), [4]),
  I(108, 'JOB', 1, 'OFFLINE', 'WAITING', null, [4], { briefingStatus: null }),
  // 경력: 직무 면접(1차)과 인성 면접(2차) 두 가지만 본다(2026-11-18 확인). 포트폴리오 면접은 없다
  I(201, 'JOB', 1, 'ONLINE', 'SCHEDULED', slot(1), [1, 2]), // 시연에서 들어갈 경력 화상 면접. 대본은 liveScriptExperienced
  I(201, 'PERSONALITY', 2, 'ONLINE', 'WAITING', null, [1], { briefingStatus: null }),
  I(202, 'JOB', 1, 'ONLINE', 'DONE', dayOffset(-3, 10), [1, 2], { roomId: 9103, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' }),
  I(202, 'PERSONALITY', 2, 'ONLINE', 'SCHEDULED', dayOffset(2, 15), [1]),
  I(203, 'JOB', 1, 'ONLINE', 'SCHEDULED', dayOffset(1, 11), [1, 2]),
]

// 신입 공채는 인원이 많다: 화면이 수십~수백 명에서도 읽히는지 보려고 가상의 면접자를 더 만든다.
{
  const family = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오']
  const given = ['서준', '하윤', '도현', '지안', '유준', '다은', '민준', '하은', '주원', '나은', '건우', '채원']
  // 오늘 다른 면접실의 면접(운영 현황용). live: 시작한 지 몇 분, late: 시작이 몇 분 늦는 중, slot: 몇 칸 뒤 예정.
  // trouble은 운영 현황에서 마이크·전사 문제로 보여 줄 방이다.
  const todayPlan = {
    3: { live: 12 }, 10: { live: 21 }, 17: { live: 38 }, 24: { live: 6, trouble: 'NO_AUDIO' }, 31: { live: 17, trouble: 'BACKLOG' },
    38: { late: 8 }, 4: { slot: 1 }, 11: { slot: 2 }, 18: { slot: 3 }, 25: { slot: 4 }, 32: { slot: 2 },
  }
  const roomWho = { SW: [5, 8], AI: [6, 8], HW: [7, 5] }
  const jobOf = [['SW', 'SW개발', [1, 2]], ['AI', 'AI연구', [1, 3]], ['HW', 'HW설계', [4, 3]]]
  const states = ['DONE', 'DONE', 'EVALUATING', 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'WAITING']
  for (let i = 0; i < 64; i += 1) {
    const [code, title, who] = jobOf[i % 3]
    const id = 300 + i
    // 이름이 겹치지 않게: 12명마다 이름 쪽을 7칸씩 민다
    candidates.push(N(id, `2026H-${String(1000 + i * 7).padStart(5, '0')}`, family[i % 12] + given[(i * 5 + Math.floor(i / 12) * 7) % 12], code, title, ['한빛대학교', '새솔대학교', '누리대학교', '가람대학교'][i % 4], '컴퓨터공학'))
    const st = states[i % states.length]
    const ended = st === 'DONE' || st === 'EVALUATING'
    const plan = todayPlan[i]
    if (plan?.live) {
      interviews.push(I(id, 'JOB', 1, 'OFFLINE', 'IN_PROGRESS', new Date(floorTo(loadedAt - plan.live * MIN, 5)).toISOString(), roomWho[code], { roomId: 9200 + i, roomStatus: 'LIVE', _startedAt: ago(plan.live), _trouble: plan.trouble || null }))
    } else if (plan) {
      interviews.push(I(id, 'JOB', 1, 'OFFLINE', 'SCHEDULED', plan.late ? new Date(floorTo(loadedAt - plan.late * MIN, 5)).toISOString() : slot(plan.slot), roomWho[code]))
    } else {
      interviews.push(I(id, 'JOB', 1, 'OFFLINE', st, st === 'WAITING' ? null : dayOffset(ended ? -1 - (i % 3) : 1 + (i % 3), 9 + (i % 8)), who, ended ? { roomId: 9200 + i, roomStatus: 'ENDED', reportStatus: 'SUCCEEDED', reportBasis: 'REFINED' } : st === 'WAITING' ? { briefingStatus: null } : {}))
    }
    interviews.push(I(id, 'PERSONALITY', 2, 'OFFLINE', st === 'DONE' && i % 2 ? 'SCHEDULED' : 'WAITING', st === 'DONE' && i % 2 ? dayOffset(1 + (i % 3), 10 + (i % 6)) : null, [1], { briefingStatus: null }))
  }
}

export const questionBank = [
  { id: 31, jobCode: 'SW', interviewType: 'JOB', category: 'CS기초', text: '프로세스와 스레드의 차이를 설명해 주세요.' },
  { id: 32, jobCode: 'SW', interviewType: 'JOB', category: 'CS기초', text: '교착 상태가 생기는 조건과 해결 방법은 무엇인가요?' },
  { id: 33, jobCode: 'SW', interviewType: 'JOB', category: '설계', text: '메모리가 제한된 환경에서 자료구조를 어떻게 고르나요?' },
  { id: 34, jobCode: 'AI', interviewType: 'JOB', category: 'ML기초', text: '과적합을 줄이는 방법을 세 가지 이상 말해 주세요.' },
  { id: 35, jobCode: 'AI', interviewType: 'JOB', category: 'ML기초', text: '편향과 분산의 관계를 설명해 주세요.' },
  { id: 36, jobCode: 'HW', interviewType: 'JOB', category: '회로', text: '셋업 타임과 홀드 타임 위반은 각각 어떻게 해결하나요?' },
  { id: 37, jobCode: 'SW', interviewType: 'PERSONALITY', category: '협업', text: '팀원과 의견이 달랐을 때 어떻게 조율했나요?' },
  // _exp: 경력용 질문(가짜 데이터에서 준비된 질문에 섞을 때만 쓰는 표시. 신입과 경력의 직무 코드가 같아서 둔다)
  { id: 38, jobCode: 'SW', interviewType: 'JOB', category: '설계', text: '트래픽이 열 배가 되면 지금 구조에서 무엇이 먼저 무너지나요?', _exp: true },
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
      // 화면 시안(API 명세에 아직 없다): 확인할 점마다 근거가 된 이력서 문장과, 그것을 확인하는 준비된 질문의 순서(1부터)
      checkItems: exp
        ? [
            { text: '"처리량 3배"에서 본인이 설계한 범위', evidenceFrom: '프로젝트', evidence: proj.text, questionOrder: 1 },
            { text: '분리 과정에서의 데이터 정합성 처리 방식', evidenceFrom: '경력', evidence: p.careers[0].text, questionOrder: 4 },
            { text: '이직 사유가 실제 역할 변화와 맞는지', evidenceFrom: '지원 동기', evidence: p.essays[0].text, questionOrder: null },
          ]
        : [
            { text: '유실률 4% → 0.2% 개선에서 본인이 한 일과 팀이 한 일의 구분', evidenceFrom: '자기소개서', evidence: p.essays[1].text, questionOrder: 1 },
            { text: '전공 기초(운영체제) 이해 깊이', evidenceFrom: '수강 과목', evidence: p.courses.join(', '), questionOrder: 3 },
          ],
      timeline: exp
        ? [{ period: p.careers[0].period, text: `${p.careers[0].company} · ${p.careers[0].role}` }, { period: '', text: `${proj.title}: ${proj.text}` }, { period: '', text: `${p.education[0].school} ${p.education[0].major} ${p.education[0].degree}` }]
        : [{ period: '2025.03 ~ 2025.12', text: proj.title }, { period: '2024.06 ~ 2024.08', text: '학부 연구생 (임베디드 연구실)' }],
    },
    excluded: ['gender', 'family'],
    // 화면 시안(API 명세에 아직 없다): 경력 2차 이상이면 앞 차수 보고서의 "다음 차수에서 확인할 점"
    previousRoundChecks: exp && it.seq > 1 ? { seq: it.seq - 1, type: 'JOB', items: ['정합성 문제를 실제로 겪은 사례', '팀 내 설계 리뷰에서의 역할'] } : null,
    _type: it.type,
  }
}

let qid = 7000
// 인성 면접의 준비된 질문(신입·경력 공통). 자기소개서에서 만든 것으로 본다.
const PERSONALITY_ROWS = [
  ['RESUME', '협업', '팀 프로젝트에서 의견이 갈렸던 경험과 그때 본인이 한 일을 말해 주세요.', '갈등 상황에서의 행동'],
  ['RESUME', '동기', '이 직무를 선택한 계기는 무엇인가요?', '지원 동기의 구체성'],
  ['RESUME', '끈기', '가장 오래 붙잡고 해결한 문제는 무엇이었고, 왜 포기하지 않았나요?', '몰입과 끈기'],
  ['RESUME', '회고', '최근에 받은 피드백 중 가장 받아들이기 어려웠던 것은 무엇이었나요?', '피드백을 받아들이는 태도'],
]
// 신입(대면)은 면접 중에 꼬리질문을 만들지 않으므로 면접 전에 질문마다 예상 꼬리질문을 만들어 둔다(11/18 회의).
const PREDICTED = {
  프로젝트: ['그중 본인이 직접 결정한 부분은 무엇인가요?', '결과가 나아졌다는 것은 어떻게 확인했나요?', '팀원과 역할을 어떻게 나눴나요?'],
  '직무 기초': ['실제로 써 본 경험이 있다면 말해 주세요.', '반대의 경우에는 어떤 문제가 생기나요?', '그렇게 판단한 근거는 무엇인가요?'],
  설계: ['다른 방법과 비교하면 어떤 점이 낫나요?', '제약이 바뀌면 설계가 어떻게 달라지나요?', '그 설계의 약점은 무엇인가요?'],
  성장: ['그때 배운 것을 다른 곳에 적용한 적이 있나요?', '같은 상황이 오면 무엇부터 하겠습니까?', '주변에서는 그 결과를 어떻게 평가했나요?'],
  협업: ['그때 상대의 입장은 무엇이었나요?', '결과적으로 무엇이 달라졌나요?', '다시 한다면 어떻게 하겠습니까?'],
  동기: ['그 계기 뒤에 실제로 해 본 것은 무엇인가요?', '다른 직무와 비교해 본 적이 있나요?', '입사하면 먼저 해 보고 싶은 일은 무엇인가요?'],
  끈기: ['중간에 가장 힘들었던 순간은 언제였나요?', '도움을 요청한 적이 있나요?', '끝낸 뒤에 무엇이 남았나요?'],
  회고: ['그 피드백 뒤에 바꾼 행동이 있나요?', '지금 돌아보면 그 피드백은 맞았나요?', '비슷한 피드백을 남에게 준 적이 있나요?'],
}
PREDICTED.CS기초 = PREDICTED.ML기초 = PREDICTED.회로 = PREDICTED['직무 기초']

/**
 * 준비된 질문. opts.predicted 가 켜지면 질문마다 예상 꼬리질문 3개를 가지(parentQuestionId)로 붙인다.
 * 경력 직무 면접의 순서는 liveScriptExperienced 의 q 와 맞춰 둔다.
 */
export function questionsFor(c, it, opts = {}) {
  const proj = c.profile.projects[0].title
  const exp = c.track === 'EXPERIENCED'
  // 질문 은행은 직무와 면접 종류가 같은 것만 섞는다
  const bank = questionBank.filter((q) => q.jobCode === c.jobCode && q.interviewType === it.type && !!q._exp === exp).slice(0, 2)
  const bankRows = bank.map((b) => ['BANK', b.category, b.text, '질문 은행'])
  let rows
  if (it.type === 'PERSONALITY') {
    rows = [...PERSONALITY_ROWS, ...bankRows]
  } else {
    rows = [
      ['RESUME', '프로젝트', `${proj}에서 맡은 역할과 가장 어려웠던 점은 무엇이었나요?`, '기여도와 문제 해결 과정 확인'],
      ['RESUME', '프로젝트', '그 문제의 원인을 어떻게 찾았고, 다른 방법은 검토했나요?', '원인 분석의 깊이'],
      ['JD', '직무 기초', exp ? 'Kafka 소비가 밀릴 때 무엇부터 확인하고 어떻게 대응하나요?' : c.jobCode === 'AI' ? '모델 성능이 검증 데이터에서만 떨어질 때 무엇부터 확인하나요?' : '인터럽트와 폴링 방식의 장단점을 비교해 주세요.', 'JD의 필수 지식 확인'],
      ['JD', '설계', exp ? '서비스를 나눈 뒤 데이터 정합성은 어떻게 확인하나요?' : '제한된 메모리에서 버퍼를 설계할 때 고려할 점은?', '설계 판단 근거'],
      ...bankRows,
      ['RESUME', '성장', '그 경험을 다시 한다면 무엇을 다르게 하겠습니까?', '회고와 학습'],
    ]
  }
  // 이미 끝난 면접은 물은 질문이 있어야 "면접 후 > 물은 질문"이 보인다: 앞의 다섯 개와 채택한 꼬리질문 하나.
  const ended = it.roomStatus === 'ENDED'
  if (ended && !opts.predicted) rows.push(['FOLLOW_UP', '꼬리질문', exp ? '멱등 처리는 구체적으로 어떻게 구현했나요?' : '유실률을 어떤 방법으로 측정했나요?', exp ? '구현 방식이 답변에 없음' : '이력서의 4% → 0.2% 수치의 근거'])
  const list = rows.map(([source, category, text, intent], i) => ({
    id: ++qid, interviewId: it.id, source, category, text, intent, orderNo: i + 1,
    asked: ended && (i < 5 || source === 'FOLLOW_UP'), askedAtSeq: null, hidden: false, parentQuestionId: null,
  }))
  if (!opts.predicted) return list
  const children = list.flatMap((parent) =>
    (PREDICTED[parent.category] || PREDICTED.프로젝트).map((text) => ({
      id: ++qid, interviewId: it.id, source: 'FOLLOW_UP', category: '예상 꼬리질문', text, intent: '', orderNo: 0,
      asked: false, askedAtSeq: null, hidden: false, parentQuestionId: parent.id,
    })),
  )
  return [...list, ...children].map((q, i) => ({ ...q, orderNo: i + 1 }))
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
  // 면접관이 꼬리질문 후보를 누르지 않고 말로 묻는 장면(준비한 질문이 아니므로 q가 없다). fu = 말로 물은 후보의 id → followup.matched
  { speaker: 'INTERVIEWER', raw: '아까 유실률을 4퍼센트에서 0.2퍼센트로 낮췄다고 하셨는데 그 유실률은 어떤 방법으로 측정하셨어요', refined: '아까 유실률을 4%에서 0.2%로 낮췄다고 하셨는데, 그 유실률은 어떤 방법으로 측정했나요?', fu: 'f-3-3' },
  { speaker: 'CANDIDATE', raw: '센서 쪽에서 패킷마다 일련번호를 붙여서 보내고요 수신 쪽에서 번호가 건너뛴 개수를 세었습니다 한 시간씩 열 번 돌려서 평균을 냈습니다', refined: '센서에서 패킷마다 일련번호를 붙여 보내고, 수신 쪽에서 번호가 건너뛴 개수를 세었습니다. 한 시간씩 열 번 돌려 평균을 냈습니다.', followUps: [
    { text: '열 번의 결과가 서로 얼마나 달랐나요?', rationale: '측정의 신뢰도 확인' },
    { text: '실제 사용 환경과 시험 환경의 차이는 어떻게 고려했나요?', rationale: '검증 범위에 대한 이해' },
  ] },
  { speaker: 'INTERVIEWER', raw: '네 알겠습니다 그러면 메모리가 제한된 상황에서 버퍼를 설계할 때는 뭘 고려해야 할까요', refined: '알겠습니다. 그러면 제한된 메모리에서 버퍼를 설계할 때 고려할 점은 무엇인가요?', q: 3 },
  { speaker: 'CANDIDATE', raw: '먼저 최악의 경우에 데이터가 얼마나 몰리는지를 계산해서 크기를 정하고요 넘칠 때 오래된 걸 버릴지 새 걸 버릴지 정책을 정해야 합니다 그리고 동적 할당은 단편화 때문에 피하고 정적으로 잡았습니다', refined: '먼저 최악의 경우에 데이터가 얼마나 몰리는지 계산해 크기를 정합니다. 넘칠 때 오래된 것을 버릴지 새것을 버릴지 정책도 정해야 합니다. 동적 할당은 단편화 때문에 피하고 정적으로 잡았습니다.', followUps: [
    { text: '프로젝트에서는 넘칠 때 어느 쪽을 버리기로 했고, 이유는 무엇인가요?', rationale: '원칙을 실제 결정에 적용했는지 확인' },
    { text: '최악의 경우를 어떻게 추정했나요?', rationale: '설계 근거의 구체성' },
  ] },
  { speaker: 'INTERVIEWER', raw: '좋습니다 기초 질문 하나 드릴게요 프로세스하고 스레드 차이를 설명해 주세요', refined: '좋습니다. 기초 질문을 하나 드리겠습니다. 프로세스와 스레드의 차이를 설명해 주세요.', q: 4 },
  { speaker: 'CANDIDATE', raw: '프로세스는 독립된 메모리 공간을 가지는 실행 단위고 스레드는 한 프로세스 안에서 메모리를 공유하는 실행 흐름입니다 그래서 스레드는 전환 비용이 적은 대신에 공유 자원을 동기화해야 합니다', refined: '프로세스는 독립된 메모리 공간을 가지는 실행 단위이고, 스레드는 한 프로세스 안에서 메모리를 공유하는 실행 흐름입니다. 스레드는 전환 비용이 적은 대신 공유 자원을 동기화해야 합니다.' },
  { speaker: 'INTERVIEWER', raw: '네 그럼 그 프로젝트를 다시 한다면 뭘 다르게 하시겠어요', refined: '그럼 그 프로젝트를 다시 한다면 무엇을 다르게 하겠습니까?', q: 6 },
  { speaker: 'CANDIDATE', raw: '처음부터 로그를 남기는 구조를 만들 것 같습니다 이번에는 문제가 생기고 나서야 타임스탬프를 넣어서 원인을 찾는 데 2주가 걸렸거든요 그리고 부하 테스트를 일정 초반에 넣겠습니다', refined: '처음부터 로그를 남기는 구조를 만들겠습니다. 이번에는 문제가 생긴 뒤에야 타임스탬프를 넣어서 원인을 찾는 데 2주가 걸렸습니다. 부하 테스트도 일정 초반에 넣겠습니다.', followUps: [
    { text: '그 2주 동안 팀 일정은 어떻게 조정했나요?', rationale: '협업과 일정 관리 경험 확인' },
  ] },
  { speaker: 'INTERVIEWER', raw: '네 시간이 다 돼서요 마지막으로 하고 싶은 말씀 있으면 해 주세요', refined: '시간이 다 됐습니다. 마지막으로 하고 싶은 말씀이 있으면 해 주세요.' },
  { speaker: 'CANDIDATE', raw: '오늘 질문을 받으면서 제가 측정 방법을 먼저 설명하지 않는다는 걸 알았습니다 입사하게 되면 근거를 먼저 말하는 습관을 들이겠습니다 감사합니다', refined: '오늘 질문을 받으면서 제가 측정 방법을 먼저 설명하지 않는다는 것을 알았습니다. 입사하게 되면 근거를 먼저 말하는 습관을 들이겠습니다. 감사합니다.' },
  { speaker: 'INTERVIEWER', raw: '네 수고하셨습니다 결과는 채용 담당자가 따로 안내드릴 거예요', refined: '수고하셨습니다. 결과는 채용 담당자가 따로 안내드리겠습니다.' },
]

/**
 * 경력 화상 직무 면접의 대본(11/18 회의에서 경력 채용을 먼저 하기로 했다). q 는 경력 직무 면접 questionsFor 의 순서:
 * 0 역할과 어려웠던 점, 1 원인과 다른 방법, 2 Kafka 소비, 3 데이터 정합성, 4 질문 은행(트래픽 열 배), 5 다시 한다면.
 * 묻는 순서는 0, 1, (말로 물은 꼬리질문), 3, 2, 4, 5 다: 순서를 바꿔 묻는 장면이 들어 있다.
 */
export const liveScriptExperienced = [
  { speaker: 'INTERVIEWER', raw: '네 안녕하세요 화면이랑 소리 괜찮으시죠 음 먼저 주문 처리 시스템 재설계에서 맡은 역할이랑 제일 어려웠던 점 말씀해 주시겠어요', refined: '안녕하세요. 화면과 소리 괜찮으신가요? 먼저 주문 처리 시스템 재설계에서 맡은 역할과 가장 어려웠던 점을 말씀해 주시겠어요?', q: 0 },
  { speaker: 'CANDIDATE', raw: '네 잘 들립니다 저는 어 주문 도메인을 모놀리식에서 떼어내는 설계를 맡았고요 제일 어려웠던 거는 분리하고 나서 주문 상태랑 결제 상태가 어긋나는 경우였습니다', refined: '잘 들립니다. 저는 주문 도메인을 모놀리식에서 떼어 내는 설계를 맡았습니다. 가장 어려웠던 것은 분리한 뒤 주문 상태와 결제 상태가 어긋나는 경우였습니다.' },
  { speaker: 'CANDIDATE', raw: '결제 완료 이벤트가 주문 생성 이벤트보다 먼저 도착하는 경우가 있었거든요 그래서 주문 번호를 키로 해서 파티션을 고정하고 소비자 쪽을 멱등하게 바꿨습니다', refined: '결제 완료 이벤트가 주문 생성 이벤트보다 먼저 도착하는 경우가 있었습니다. 그래서 주문 번호를 키로 파티션을 고정하고, 소비자 쪽을 멱등하게 바꿨습니다.', followUps: [
    { text: '멱등 처리는 구체적으로 어떻게 구현했나요?', rationale: '구현 방식이 답변에 없음' },
    { text: '파티션을 고정한 뒤 한쪽에 몰리는 문제는 없었나요?', rationale: '부작용을 확인했는지' },
    { text: '상태가 어긋난 건수는 어떻게 측정했나요?', rationale: '수치의 근거 확인' },
  ] },
  { speaker: 'INTERVIEWER', raw: '그 원인은 어떻게 찾으셨는지 그리고 다른 방법은 검토 안 하셨는지요', refined: '그 원인을 어떻게 찾았고, 다른 방법은 검토하지 않았나요?', q: 1 },
  { speaker: 'CANDIDATE', raw: '어긋난 주문을 모아서 이벤트 도착 시각을 비교해 보니까 전부 순서가 뒤바뀐 경우였고요 분산 트랜잭션도 검토했는데 결제사 연동 구간에서는 쓸 수가 없어서 제외했습니다', refined: '어긋난 주문을 모아 이벤트 도착 시각을 비교해 보니 모두 순서가 뒤바뀐 경우였습니다. 분산 트랜잭션도 검토했지만 결제사 연동 구간에서는 쓸 수 없어 제외했습니다.', followUps: [
    { text: '분산 트랜잭션을 쓸 수 있었다면 어떤 구조가 됐을까요?', rationale: '설계 이해도 확인' },
    { text: '같은 문제가 다시 생기지 않게 어떤 검증을 추가했나요?', rationale: '재발 방지 관점' },
  ] },
  // 면접관이 꼬리질문 후보를 누르지 않고 말로 묻는 장면(준비한 질문이 아니므로 q가 없다). fu = 말로 물은 후보의 id → followup.matched
  { speaker: 'INTERVIEWER', raw: '아까 소비자를 멱등하게 바꿨다고 하셨는데 그 멱등 처리는 구체적으로 어떻게 구현하셨어요', refined: '아까 소비자를 멱등하게 바꿨다고 하셨는데, 멱등 처리는 구체적으로 어떻게 구현했나요?', fu: 'f-3-1' },
  { speaker: 'CANDIDATE', raw: '이벤트마다 고유 번호를 넣고요 소비자가 처리한 번호를 레디스에 하루 동안 보관했습니다 같은 번호가 다시 오면 건너뜁니다', refined: '이벤트마다 고유 번호를 넣고, 소비자가 처리한 번호를 Redis에 하루 동안 보관했습니다. 같은 번호가 다시 오면 건너뜁니다.', followUps: [
    { text: 'Redis가 내려가면 중복 처리는 어떻게 막나요?', rationale: '장애 상황을 고려했는지' },
    { text: '보관 기간을 하루로 정한 근거는 무엇인가요?', rationale: '설계 판단의 근거' },
  ] },
  // 준비한 순서와 다르게 묻는 장면: 질문 4(정합성)를 질문 3(Kafka)보다 먼저 묻는다. 질문은 내용으로 찾으므로 순서와 상관없이 체크된다
  { speaker: 'INTERVIEWER', raw: '네 그러면 서비스를 나눈 뒤에 데이터 정합성은 어떻게 확인하셨어요', refined: '그러면 서비스를 나눈 뒤 데이터 정합성은 어떻게 확인했나요?', q: 3 },
  { speaker: 'CANDIDATE', raw: '매일 새벽에 주문 테이블이랑 결제 테이블을 대조하는 배치를 돌렸습니다 어긋난 건은 알림으로 받아서 수동으로 맞췄습니다', refined: '매일 새벽에 주문 테이블과 결제 테이블을 대조하는 배치를 돌렸습니다. 어긋난 건은 알림으로 받아 수동으로 맞췄습니다.', followUps: [
    { text: '수동으로 맞춘 건수는 얼마나 됐나요?', rationale: '정합성 문제의 실제 규모' },
    { text: '대조 배치가 놓칠 수 있는 경우는 무엇인가요?', rationale: '검증의 한계를 아는지' },
  ] },
  { speaker: 'INTERVIEWER', raw: '좋습니다 그럼 카프카 소비가 밀릴 때는 뭐부터 확인하고 어떻게 대응하세요', refined: '좋습니다. 그럼 Kafka 소비가 밀릴 때는 무엇부터 확인하고 어떻게 대응하나요?', q: 2 },
  { speaker: 'CANDIDATE', raw: '먼저 소비 지연 지표에서 어느 파티션이 밀리는지 보고요 한쪽만 밀리면 키가 쏠린 거고 전체가 밀리면 소비자 수를 늘립니다 처리 자체가 느리면 외부 호출을 비동기로 뺍니다', refined: '먼저 소비 지연 지표에서 어느 파티션이 밀리는지 봅니다. 한쪽만 밀리면 키가 쏠린 것이고, 전체가 밀리면 소비자 수를 늘립니다. 처리 자체가 느리면 외부 호출을 비동기로 뺍니다.', followUps: [
    { text: '실제로 키가 쏠렸던 사례가 있었나요?', rationale: '원칙을 겪어 본 것인지 확인' },
  ] },
  { speaker: 'INTERVIEWER', raw: '알겠습니다 트래픽이 열 배가 되면 지금 구조에서 뭐가 먼저 무너질까요', refined: '알겠습니다. 트래픽이 열 배가 되면 지금 구조에서 무엇이 먼저 무너지나요?', q: 4 },
  { speaker: 'CANDIDATE', raw: '주문 디비 쓰기가 먼저 한계에 닿습니다 지금은 한 대에 쓰고 있어서요 열 배가 되면 주문 번호 기준으로 나누는 작업이 필요합니다', refined: '주문 DB의 쓰기가 먼저 한계에 닿습니다. 지금은 한 대에 쓰고 있어서, 열 배가 되면 주문 번호 기준으로 나누는 작업이 필요합니다.' },
  { speaker: 'INTERVIEWER', raw: '네 그럼 그 프로젝트를 다시 한다면 뭘 다르게 하시겠어요', refined: '그럼 그 프로젝트를 다시 한다면 무엇을 다르게 하겠습니까?', q: 5 },
  { speaker: 'CANDIDATE', raw: '이벤트 설계를 먼저 문서로 합의할 것 같습니다 이번에는 팀마다 이벤트 모양을 다르게 이해해서 연동에 3주가 더 걸렸거든요', refined: '이벤트 설계를 먼저 문서로 합의하겠습니다. 이번에는 팀마다 이벤트 모양을 다르게 이해해서 연동에 3주가 더 걸렸습니다.', followUps: [
    { text: '그 3주 동안 일정은 어떻게 조정했나요?', rationale: '협업과 일정 관리 경험 확인' },
  ] },
  { speaker: 'INTERVIEWER', raw: '네 시간이 다 돼서요 마지막으로 하고 싶은 말씀 있으면 해 주세요', refined: '시간이 다 됐습니다. 마지막으로 하고 싶은 말씀이 있으면 해 주세요.' },
  { speaker: 'CANDIDATE', raw: '오늘 질문을 받으면서 제가 수치의 측정 방법을 먼저 말하지 않는다는 걸 알았습니다 감사합니다', refined: '오늘 질문을 받으면서 제가 수치의 측정 방법을 먼저 말하지 않는다는 것을 알았습니다. 감사합니다.' },
  { speaker: 'INTERVIEWER', raw: '네 수고하셨습니다 결과는 채용 담당자가 따로 안내드릴 거예요', refined: '수고하셨습니다. 결과는 채용 담당자가 따로 안내드리겠습니다.' },
]

/** 트랙에 맞는 대본 */
export const scriptFor = (track) => (track === 'EXPERIENCED' ? liveScriptExperienced : liveScript)

const asTranscript = (script) => script.map((u, i) => ({
  seq: i + 1, speaker: u.speaker, speakerMethod: u.q !== undefined ? 'QUESTION_MATCH' : 'LLM',
  rawText: u.raw, refinedText: u.refined, startMs: i * 21000, endMs: i * 21000 + 17000, matchedQuestionId: null, source: 'POST',
}))
export const sampleTranscript = asTranscript(liveScript)
/** 이미 끝난 면접의 대화 기록(트랙에 맞는 대본으로) */
export const transcriptFor = (track) => asTranscript(scriptFor(track))

export function aiEvaluationFor(track) {
  if (track === 'EXPERIENCED') {
    return {
      status: 'SUCCEEDED', model: 'mock-llm', generatedAt: new Date().toISOString(),
      scores: [
        { criterionCode: 'JOB_KNOWLEDGE', criterionName: '직무 지식', score: 4, maxScore: 5, rationale: 'Kafka 소비 지연을 파티션 쏠림과 전체 지연으로 나눠 대응을 설명했다.', evidenceSeqs: [11] },
        { criterionCode: 'PROBLEM_SOLVING', criterionName: '문제 해결', score: 4, maxScore: 5, rationale: '이벤트 도착 시각을 비교해 순서 역전이 원인임을 좁혔다. 분산 트랜잭션도 검토했다.', evidenceSeqs: [3, 5] },
        { criterionCode: 'COMMUNICATION', criterionName: '의사소통', score: 3, maxScore: 5, rationale: '답이 구조적이지만 구현 방식은 묻기 전까지 말하지 않았다.', evidenceSeqs: [7] },
        { criterionCode: 'GROWTH', criterionName: '성장 가능성', score: 4, maxScore: 5, rationale: '연동이 늦어진 원인을 이벤트 설계 합의 부족으로 돌아봤다.', evidenceSeqs: [15] },
      ],
      overallComment: '분리 과정의 문제와 판단 근거를 구체적으로 설명했다. 정합성은 대조 배치와 수동 보정에 기대고 있어 사례를 더 확인할 필요가 있다.',
    }
  }
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
      concerns: detailed ? ['정합성을 대조 배치와 수동 보정에 기대고 있다'] : ['수치(유실률)의 측정 방법은 추가 질문 뒤에야 설명했다'],
      qaHighlights: detailed ? [
        { question: '재설계에서 맡은 역할과 가장 어려웠던 점', answerSummary: '주문 도메인 분리 설계 담당. 이벤트 순서가 뒤바뀌어 주문과 결제 상태가 어긋나는 문제를 파티션 고정과 멱등 처리로 해결.', seqs: [2, 3] },
        { question: '원인을 찾은 방법과 검토한 대안', answerSummary: '어긋난 주문의 이벤트 도착 시각을 비교. 분산 트랜잭션은 결제사 연동 구간에서 쓸 수 없어 제외.', seqs: [5] },
      ] : [
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

// ---- 면접 페르소나 (화면 시안, API 명세에 아직 없다) ----
// 면접관이 면접 전에 고르는 진행 방식. 페르소나에 따라 준비된 질문의 표현이 바뀐다.
// 추천·사용 여부는 관리 > 면접 페르소나에서 정한다. tone 은 main.css 의 .tone-* 이름.
export const personas = [
  { id: 'DEPTH', name: '기술 심층형', tone: 'brand', description: '구조와 원리, 대안 사이의 장단점을 단계별로 파고듭니다.', questionType: '원리·대안 질문', followUpType: '장단점 심화', fit: '설계 판단과 기술 이해를 깊게 볼 때', guard: '정답을 유도하지 않고 지원자가 실제로 한 선택을 묻습니다.', recommended: true, enabled: true },
  { id: 'PRESSURE', name: '압박 검증형', tone: 'bad', description: '서류의 주장에 반론을 걸고, 수치와 근거가 나올 때까지 같은 지점을 다시 묻습니다.', questionType: '반박형 질문', followUpType: '근거 추궁', fit: '성과 주장이 크고 검증되지 않은 항목이 많을 때', guard: '압박은 주장과 근거에만 겁니다. 인격·감정을 자극하는 표현은 만들지 않습니다.', recommended: true, enabled: true },
  { id: 'STAR', name: '경험 행동형', tone: 'ok', description: '상황, 과제, 행동, 결과 순서로 실제 사례를 끌어냅니다.', questionType: '행동 사례 질문', followUpType: '빠진 단계 보완', fit: '본인 역할과 실행의 구체성을 확인할 때', guard: '가정이 아니라 실제로 있었던 일만 묻습니다.', recommended: true, enabled: true },
  { id: 'STANDARD', name: '표준 구조화형', tone: 'neutral', description: '모든 지원자에게 같은 질문을 같은 순서로 묻고, 빠진 근거만 짧게 확인합니다.', questionType: '구조화 질문', followUpType: '근거 확인', fit: '여러 지원자를 같은 기준으로 비교할 때', guard: '준비한 질문 표현을 그대로 씁니다.', recommended: false, enabled: true },
  { id: 'RAPPORT', name: '편안한 대화형', tone: 'warn', description: '열린 질문으로 시작해 지원자가 스스로 이야기를 이어 가도록 돕습니다.', questionType: '열린 질문', followUpType: '이어 말하기 유도', fit: '긴장도가 높은 지원자를 만날 때', guard: '칭찬이나 평가로 들릴 수 있는 표현은 최소로 씁니다.', recommended: false, enabled: true },
]

// 페르소나별 질문 표현. 지금은 경력 직무 면접의 준비된 질문 여섯 개(questionsFor 의 순서)만 있다.
// 표준형과 여기에 없는 면접은 원래 표현을 쓴다.
const PERSONA_TEXT = {
  DEPTH: [
    '주문 처리 시스템 재설계에서 문제를 어떤 단계로 나눠 진단했고, 각 단계에서 무엇을 바꿨나요?',
    '원인을 좁혀 간 과정과, 검토한 대안마다 어떤 장단점이 있었는지 설명해 주세요.',
    'Kafka 소비가 밀리는 원인을 어떻게 나눠 보고, 원인마다 어떤 조치를 고르나요?',
    '서비스를 나눈 뒤 데이터 정합성을 어떤 구조로 확인했고, 그 방식의 한계는 무엇인가요?',
    '트래픽이 열 배가 되면 지금 구조의 어느 구성 요소가 어떤 순서로 한계에 닿나요?',
    '다시 설계한다면 어느 결정을 바꾸겠고, 그 근거는 무엇인가요?',
  ],
  PRESSURE: [
    '이력서에는 처리량을 3배로 늘렸다고만 적혀 있습니다. 그중 본인이 직접 한 일은 무엇이고, 무엇을 근거로 3배라고 보셨습니까?',
    '그 원인이 맞다고 단정할 수 있습니까? 버린 대안과 버린 이유를 말씀해 주세요.',
    'Kafka 소비가 밀렸을 때 소비자를 늘리는 것 말고 실제로 한 조치가 있습니까?',
    '정합성이 지켜졌다는 것을 어떤 수치로 증명할 수 있습니까?',
    '트래픽이 열 배가 되면 지금 설계는 버티지 못합니다. 무엇을 포기하고 무엇을 지키겠습니까?',
    '그 프로젝트에서 본인의 판단이 틀렸던 부분은 어디입니까?',
  ],
  STAR: [
    '주문 처리 시스템 재설계에서 가장 어려웠던 상황과, 그때 본인이 한 일을 순서대로 말씀해 주세요.',
    '원인을 찾아야 했던 때를 떠올려, 어떤 선택지가 있었고 본인이 어떻게 결정했는지 말씀해 주세요.',
    'Kafka 소비가 밀렸던 사례 하나를 골라, 상황과 본인이 한 조치, 결과를 말씀해 주세요.',
    '데이터가 어긋난 것을 발견했던 사례가 있다면, 어떻게 알아챘고 무엇을 했나요?',
    '트래픽이 갑자기 늘었던 경험이 있다면, 그때 상황과 본인의 대응을 말씀해 주세요.',
    '그 경험 뒤에 실제로 다르게 해 본 일이 있다면 말씀해 주세요.',
  ],
  RAPPORT: [
    '주문 처리 시스템 재설계를 흥미롭게 봤습니다. 맡으신 역할과 어려웠던 점을 편하게 들려주시겠어요?',
    '원인을 찾던 때 이야기를 들려주세요. 어떤 고민이 있었나요?',
    'Kafka 소비가 밀릴 때는 주로 어떻게 살펴보시나요?',
    '서비스를 나눈 뒤 데이터가 맞는지는 어떻게 확인하셨는지 들려주세요.',
    '트래픽이 훨씬 늘어난다면 어디부터 손보고 싶으신가요?',
    '다시 한다면 어떻게 해 보고 싶으신가요?',
  ],
}
/** 그 면접에서 페르소나에 맞춘 질문 표현들(없으면 null → 원래 표현을 쓴다) */
export const personaTexts = (c, it, personaId) => (c.track === 'EXPERIENCED' && it.type === 'JOB' ? PERSONA_TEXT[personaId] || null : null)

// ---- 시스템 상태 (화면 시안, API 명세에 아직 없다) ----
// 값은 화면 모양을 보기 위한 가짜 값이다. 실제로는 백엔드가 각 서비스에 물어서 답한다.
export function systemStatus() {
  return {
    checkedAt: new Date().toISOString(),
    services: [
      { key: 'BACKEND', name: '백엔드', detail: '면접 기록과 평가 저장', status: 'OK', note: '' },
      { key: 'AGENT', name: 'Agent', detail: '면접 방 실시간 처리', status: 'OK', note: '' },
      { key: 'STT', name: '음성 인식', detail: 'Whisper', status: 'OK', note: '' },
      { key: 'LLM', name: 'LLM', detail: '질문 · 꼬리질문 · 보고서', status: 'DEGRADED', note: '응답이 평소보다 느립니다. 꼬리질문과 보고서가 늦게 나올 수 있습니다.' },
      { key: 'DB', name: 'DB', detail: 'Oracle', status: 'OK', note: '' },
      { key: 'REDIS', name: 'Redis', detail: '로그인 · 방 이벤트 중계', status: 'OK', note: '' },
    ],
    // 지금 요청하면 얼마나 기다리는지(초). usual 은 평소 값
    waits: [
      { key: 'BRIEFING', label: '사전 리포트와 질문 만들기', seconds: 45, usual: 30 },
      { key: 'FOLLOW_UP', label: '꼬리질문 제안', seconds: 8, usual: 4 },
      { key: 'REPORT', label: '면접 보고서 초안', seconds: 110, usual: 80 },
    ],
    // 분석 작업 대기열: AI 작업 종류마다 기다리는 것과 돌고 있는 것
    queue: [
      { key: 'BRIEFING', label: '사전 리포트와 질문', waiting: 3, running: 2 },
      { key: 'REFINE', label: '문장 다듬기 · 화자 구분', waiting: 2, running: 1 },
      { key: 'FOLLOW_UP', label: '꼬리질문 제안', waiting: 0, running: 1 },
      { key: 'EVALUATION', label: 'AI 참고 평가', waiting: 0, running: 0 },
      { key: 'REPORT', label: '면접 보고서 초안', waiting: 1, running: 1 },
      { key: 'POST_STT', label: '면접 뒤 대화 다시 정리(보정본)', waiting: 0, running: 1 },
    ],
    // 일별 면접 세션: 최근 7일(오늘 포함)에 연 면접 방의 수
    dailySessions: [6, 9, 7, 11, 8, 2, 5].map((count, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { date: d.toISOString().slice(0, 10), count }
    }),
  }
}

// ---- AI 모델 (화면 시안, API 명세에 아직 없다) ----
// 모델을 더하려면 이 목록에 한 줄을 더한다(id, kind: 'LLM' | 'STT', name, note, status). 화면은 목록을 그대로 읽는다.
// 어느 작업이 어느 모델을 쓰는지와 상태는 화면을 보기 위한 가짜 값이다. 실제로는 Agent 의 설정(config/providers.yaml)이 정한다.
export const aiModels = [
  { id: 'gemma4', kind: 'LLM', name: 'Gemma 4', note: 'LLM', status: 'OK' },
  { id: 'gauss', kind: 'LLM', name: '가우스', note: 'LLM', status: 'OK' },
  { id: 'ds-assistant', kind: 'LLM', name: 'DS Assistant', note: 'LLM', status: 'DEGRADED' },
  { id: 'stt-whisper', kind: 'STT', name: 'Whisper large-v3', note: '음성을 글로 옮긴다', status: 'OK' },
]
// AI 작업마다 지금 쓰는 모델. group: REALTIME(면접 중) | QUALITY(면접 전·후) | STT
export const aiModelTasks = [
  { key: 'REFINE', group: 'REALTIME', kind: 'LLM', label: '문장 다듬기 · 화자 구분', description: '받아 적은 말을 읽기 좋게 고치고 누가 한 말인지 가린다', modelId: 'gemma4', usualSeconds: 2 },
  { key: 'FOLLOW_UP', group: 'REALTIME', kind: 'LLM', label: '꼬리질문 제안', description: '지원자의 답이 끝나면 이어서 물을 질문을 만든다', modelId: 'gemma4', usualSeconds: 4 },
  { key: 'BRIEFING', group: 'QUALITY', kind: 'LLM', label: '사전 리포트와 질문', description: '이력서와 JD를 읽고 요약과 준비된 질문을 만든다', modelId: 'ds-assistant', usualSeconds: 30 },
  { key: 'EVALUATION', group: 'QUALITY', kind: 'LLM', label: 'AI 참고 평가', description: '평가 항목마다 참고 점수와 근거가 된 답변을 뽑는다', modelId: 'ds-assistant', usualSeconds: 40 },
  { key: 'REPORT', group: 'QUALITY', kind: 'LLM', label: '면접 보고서', description: '면접이 끝나면 대화 내용으로 보고서를 만든다', modelId: 'ds-assistant', usualSeconds: 80 },
  { key: 'STT', group: 'STT', kind: 'STT', label: '음성 인식', description: '면접 중의 말과 면접 뒤 전체 음성을 글로 옮긴다', modelId: 'stt-whisper', usualSeconds: 2 },
]

