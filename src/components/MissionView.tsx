import { useMemo, useState } from 'react'
import { useAppData } from '../lib/appData'
import { displayName } from '../lib/data'
import { submissionName } from '../lib/format'
import { navigate, personPath } from '../lib/router'

export function MissionView({ missionKey }: { missionKey: string }) {
  const { data } = useAppData()
  const mission = data.missions.find((m) => m.key === missionKey)
  const [sub, setSub] = useState<string | null>(null)

  const pulls = useMemo(
    () => data.pulls.filter((p) => p.repoKey === missionKey),
    [data, missionKey],
  )
  const comments = useMemo(
    () => data.comments.filter((c) => c.repoKey === missionKey),
    [data, missionKey],
  )

  // 세부 미션(제출) 목록: 이름 + 대표 사이클
  const submissions = useMemo(() => {
    const map = new Map<string, { name: string; cycle: number | null; count: number }>()
    for (const p of pulls) {
      const name = submissionName(p)
      const cur = map.get(name) ?? { name, cycle: p.cycle, count: 0 }
      cur.count++
      map.set(name, cur)
    }
    return [...map.values()].sort((a, b) => (a.cycle ?? 9) - (b.cycle ?? 9) || a.name.localeCompare(b.name))
  }, [pulls])

  const filteredPulls = useMemo(
    () => (sub ? pulls.filter((p) => submissionName(p) === sub) : pulls),
    [pulls, sub],
  )
  const filteredComments = useMemo(
    () => (sub ? comments.filter((c) => submissionName(c) === sub) : comments),
    [comments, sub],
  )

  const crews = useMemo(() => {
    const map = new Map<string, { login: string; nickname: string; reviews: number }>()
    for (const p of filteredPulls) {
      if (p.author) map.set(p.author, map.get(p.author) ?? { login: p.author, nickname: p.nickname, reviews: 0 })
    }
    for (const c of filteredComments) {
      if (c.prAuthor && c.reviewer !== c.prAuthor) {
        const cur = map.get(c.prAuthor)
        if (cur) cur.reviews++
      }
    }
    return [...map.values()].sort((a, b) => b.reviews - a.reviews)
  }, [filteredPulls, filteredComments])

  const reviewers = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of filteredComments) {
      if (c.reviewer && c.reviewer !== c.prAuthor) map.set(c.reviewer, (map.get(c.reviewer) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filteredComments])

  if (!mission) {
    return (
      <div className="view">
        <p className="empty">미션을 찾을 수 없습니다.</p>
        <button className="btn-ghost" onClick={() => navigate('#/')}>← 홈으로</button>
      </div>
    )
  }

  return (
    <div className="view">
      <div className="page-head">
        <div className="mission-cycles">
          {mission.cycles.map((c) => <span key={c} className="cycle-tag">사이클 {c}</span>)}
        </div>
        <h1>{mission.mission}</h1>
        <p className="muted mono">{data.org}/{mission.repo}</p>
        <div className="stat-row">
          <div className="stat"><b>{filteredPulls.length}</b><span>제출 PR</span></div>
          <div className="stat"><b>{crews.length}</b><span>크루</span></div>
          <div className="stat"><b>{reviewers.length}</b><span>리뷰어</span></div>
          <div className="stat"><b>{filteredComments.length.toLocaleString()}</b><span>리뷰 코멘트</span></div>
        </div>
      </div>

      {submissions.length > 1 && (
        <div className="sub-filter">
          <button className={!sub ? 'fchip on' : 'fchip'} onClick={() => setSub(null)}>전체</button>
          {submissions.map((s) => (
            <button key={s.name} className={sub === s.name ? 'fchip on' : 'fchip'} onClick={() => setSub(s.name)}>
              {s.cycle != null && `사이클${s.cycle} · `}{s.name} <span className="fcount">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      <section className="block">
        <h2 className="section-title">크루 <span className="badge">{crews.length}</span></h2>
        <div className="card-grid">
          {crews.map((c) => (
            <button key={c.login} className="entity-card" onClick={() => navigate(personPath(c.login))}>
              <span className="entity-name">{c.nickname || c.login}</span>
              <span className="entity-sub">받은 리뷰 {c.reviews}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <h2 className="section-title">리뷰어 <span className="badge">{reviewers.length}</span></h2>
        <div className="card-grid">
          {reviewers.map(([login, n]) => (
            <button key={login} className="entity-card" onClick={() => navigate(personPath(login))}>
              <span className="entity-name">{displayName(login, data.nicknameByLogin[login] ?? data.coachNicknameByLogin?.[login] ?? null)}</span>
              <span className="entity-sub">리뷰 {n}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}