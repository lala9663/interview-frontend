// 모의 관리자 집계(계약 2.11). 값은 화면 모양을 보기 위한 것이고 실제 계산은 백엔드가 한다.
// server.js가 routes에 펼쳐 넣는다: adminRoutes({ db, cand, interviewView })
import * as D from './data.js'

const round2 = (n) => Math.round(n * 100) / 100

export function adminRoutes({ db, cand, interviewView }) {
  const ofRecruitment = (params) => db.interviews.filter((i) => cand(i.candidateId).recruitmentId === Number(params?.recruitmentId))

  function operations(_, { params }) {
    const now = Date.now()
    const today = new Date().toDateString()
    const rows = ofRecruitment(params).filter((i) => (i.scheduledAt && new Date(i.scheduledAt).toDateString() === today) || i.status === 'IN_PROGRESS')
    const items = rows.map((i, n) => {
      const v = interviewView(i)
      const sched = i.scheduledAt ? new Date(i.scheduledAt).getTime() : now
      const due = sched < now
      // 예정 시각이 지난 '예정' 면접 일부는 진행 중인 것처럼 보여 준다(모의)
      if (v.status === 'SCHEDULED' && due && n % 3 !== 0) v.status = 'IN_PROGRESS'
      const live = v.status === 'IN_PROGRESS'
      const ended = v.status === 'EVALUATING' || v.status === 'DONE'
      const startedAt = live || ended ? new Date(sched + (n % 4 === 1 ? 7 : 1) * 60000).toISOString() : null
      // 하루 중 언제 열어도 그럴듯하게: 진행 시간은 예정 길이 안팎으로 둔다(모의)
      const elapsed = live ? (n % 4 === 0 ? v.durationMinutes + 8 : 6 + ((n * 7) % Math.max(1, v.durationMinutes - 8))) : ended ? v.durationMinutes - 2 : 0
      const trouble = live && n % 5 === 2 // 마이크가 끊긴 방
      const backlog = live && n % 7 === 3 // 전사가 밀린 방
      const r = {
        interview: v,
        startedAt,
        endedAt: ended ? new Date(sched + v.durationMinutes * 60000).toISOString() : null,
        elapsedMinutes: elapsed,
        lateMinutes: v.status === 'SCHEDULED' && due ? Math.min(12, Math.round((now - sched) / 60000)) : startedAt ? Math.round((new Date(startedAt).getTime() - sched) / 60000) : 0,
        overtimeMinutes: live ? Math.max(0, elapsed - v.durationMinutes) : 0,
        utteranceCount: live ? (trouble ? 0 : elapsed * 3) : ended ? 60 : 0,
        lastUtteranceAt: live ? new Date(now - (trouble ? 6 : 0) * 60000).toISOString() : null,
        silentMinutes: trouble ? Math.min(elapsed, 6) : 0,
        audioConnected: live ? !trouble : null,
        queueDepth: live ? (backlog ? 6 : 0) : null,
        droppedChunks: live ? (backlog ? 2 : 0) : null,
        alerts: [],
      }
      if (v.status === 'SCHEDULED' && r.lateMinutes >= 5) r.alerts.push('NOT_STARTED')
      if (r.overtimeMinutes >= 5) r.alerts.push('OVERTIME')
      if (live && r.audioConnected === false) r.alerts.push('NO_AUDIO')
      if (live && r.silentMinutes >= 3) r.alerts.push('SILENT')
      if (backlog) r.alerts.push('STT_BACKLOG')
      return r
    })
    items.sort((a, b) => (b.alerts.length ? 1 : 0) - (a.alerts.length ? 1 : 0) || new Date(a.interview.scheduledAt || 0) - new Date(b.interview.scheduledAt || 0))
    const count = (st) => items.filter((r) => r.interview.status === st).length
    return {
      date: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      agent: { status: 'UP', rooms: count('IN_PROGRESS'), providers: ['stt.live', 'llm.fast', 'llm.quality', 'stt.post'].map((role) => ({ role, health: 'OK', waiting: 0 })) },
      summary: { total: items.length, waiting: count('WAITING'), scheduled: count('SCHEDULED'), live: count('IN_PROGRESS'), evaluating: count('EVALUATING'), done: count('DONE'), attention: items.filter((r) => r.alerts.length).length },
      items,
    }
  }

  function quality(_, { params }) {
    const ended = ofRecruitment(params).filter((i) => i.roomStatus === 'ENDED').length
    const generatedAt = new Date().toISOString()
    if (!ended) {
      return {
        generatedAt, endedInterviewCount: 0,
        scoreGap: { comparedCount: 0, meanDiff: null, meanAbsDiff: null, withinOneRate: null, byCriterion: [] },
        aiCoverage: { expected: 0, scored: 0, rate: null },
        followUps: { suggested: 0, used: 0, adoptionRate: null, roomCount: 0 },
        speaker: { utteranceCount: 0, byMethod: {}, manualRate: null, unknownRate: null },
        questions: { prepared: 0, asked: 0, askedRate: null, autoMatched: 0, autoMatchedRate: null },
        reports: { liveCount: 0, refinedCount: 0, liveSecondsMedian: null, liveSecondsMax: null, refinedSecondsMedian: null, refinedSecondsMax: null },
        jobs: [],
      }
    }
    const gaps = [['JOB_KNOWLEDGE', '직무 지식', 3.9, 3.6], ['PROBLEM_SOLVING', '문제 해결', 3.7, 3.8], ['COMMUNICATION', '의사소통', 3.4, 3.9], ['GROWTH', '성장 가능성', 3.6, 3.5]]
    const utter = ended * 58
    return {
      generatedAt, endedInterviewCount: ended,
      scoreGap: {
        comparedCount: ended * 3, meanDiff: -0.05, meanAbsDiff: 0.58, withinOneRate: 0.92,
        byCriterion: gaps.map(([code, name, ai, iv], i) => ({ criterionCode: code, criterionName: name, comparedCount: Math.max(1, ended - i), aiMean: ai, interviewerMean: iv, meanDiff: round2(ai - iv), meanAbsDiff: round2(Math.abs(ai - iv) + 0.35) })),
      },
      aiCoverage: { expected: ended * 4, scored: Math.round(ended * 3.4), rate: 0.85 },
      followUps: { suggested: ended * 14, used: Math.round(ended * 2.6), adoptionRate: 0.19, roomCount: ended },
      speaker: {
        utteranceCount: utter,
        byMethod: { RULE: Math.round(utter * 0.74), QUESTION_MATCH: Math.round(utter * 0.11), LLM: Math.round(utter * 0.1), CHANNEL: 0, MANUAL: Math.round(utter * 0.03), NONE: Math.round(utter * 0.02) },
        manualRate: 0.03, unknownRate: 0.02,
      },
      questions: { prepared: ended * 7, asked: Math.round(ended * 4.6), askedRate: 0.66, autoMatched: Math.round(ended * 1.7), autoMatchedRate: 0.37 },
      reports: { liveCount: ended, refinedCount: Math.max(0, ended - 1), liveSecondsMedian: 41, liveSecondsMax: 133, refinedSecondsMedian: 252, refinedSecondsMax: 640 },
      jobs: [{ type: 'BRIEFING', succeeded: ended + 30, failed: 1 }, { type: 'AI_EVALUATION', succeeded: ended * 2 - 1, failed: 0 }, { type: 'REPORT', succeeded: ended * 2 - 1, failed: 2 }],
    }
  }

  function interviewerStats(_, { params }) {
    const all = ofRecruitment(params)
    const bias = { 1: 0.05, 2: 0.42, 3: -0.38, 4: -0.08 } // 면접관마다 조금 다른 성향(모의)
    const overallMean = 3.62
    const items = D.users
      .map((u) => {
        const assigned = all.filter((i) => i.interviewerIds.includes(u.id))
        if (!assigned.length) return null
        const ended = assigned.filter((i) => i.roomStatus === 'ENDED')
        const submitted = Math.max(0, ended.length - (u.id % 3))
        const b = bias[u.id] ?? 0
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        for (let k = 0; k < submitted * 4; k += 1) dist[Math.max(1, Math.min(5, Math.round(3.6 + b + (((k * 7) % 5) - 2) * 0.45)))] += 1
        return {
          interviewer: { id: u.id, name: u.name, department: u.department },
          assignedCount: assigned.length, submittedCount: submitted, pendingCount: ended.length - submitted,
          meanScore: submitted ? round2(overallMean + b) : null,
          stdDev: submitted ? round2(0.55 + (u.id % 3) * 0.12) : null,
          deviationFromOverall: submitted ? round2(b) : null,
          deviationFromPeers: submitted > 1 ? round2(b * 0.85) : null,
          peerComparedCount: Math.max(0, submitted - 1),
          scoreDistribution: dist,
          gradeDistribution: submitted ? { A: Math.round(submitted * (0.25 + b / 2)), B: Math.round(submitted * 0.5), C: Math.max(0, Math.round(submitted * (0.25 - b / 2))) } : {},
          byCriterion: D.criteria.map((c) => ({ criterionCode: c.code, criterionName: c.name, meanScore: submitted ? round2(overallMean + b) : null })),
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.submittedCount - a.submittedCount)
    return { generatedAt: new Date().toISOString(), overall: { evaluationCount: items.reduce((n, r) => n + r.submittedCount, 0), meanScore: overallMean, stdDev: 0.71 }, items }
  }

  return [
    ['GET', '/admin/operations', operations],
    ['GET', '/admin/quality', quality],
    ['GET', '/admin/interviewer-stats', interviewerStats],
  ]
}
