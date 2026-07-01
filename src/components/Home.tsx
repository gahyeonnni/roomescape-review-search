import { useMemo } from 'react'
import { useAppData } from '../lib/appData'
import { displayName } from '../lib/data'
import { navigate, personPath, conceptPath, missionPath } from '../lib/router'

const SUGGESTED_CONCEPTS = ['의존성', '책임', '캡슐화', '테스트', '예외', '트랜잭션', '네이밍', '단일 책임']

export function Home() {
  const { data, people } = useAppData()

  const topReviewers = useMemo(
    () =>
      [...people.values()]
        .filter((p) => p.reviewsGiven > 0)
        .sort((a, b) => b.reviewsGiven - a.reviewsGiven)
        .slice(0, 12),
    [people],
  )

  return (
    <div className="home">
      <section className="hero">
        <h1>방탈출 미션 리뷰, 한 곳에서 탐색하세요</h1>
        <p className="sub">
          우아한테크코스 {data.year}기 방탈출 미션 PR의 리뷰 코멘트를 <b>사람</b>·<b>개념</b>으로
          검색하고, 내 리뷰와 <b>유사한 리뷰</b>까지 찾아봅니다.
        </p>
        <div className="concept-tags">
          <span className="tags-label">이런 개념으로 검색해보세요</span>
          <div className="tags">
            {SUGGESTED_CONCEPTS.map((c) => (
              <button key={c} className="tag" onClick={() => navigate(conceptPath(c))}>
                # {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <h2 className="section-title">미션 둘러보기</h2>
        <div className="mission-grid">
          {data.missions.map((m) => (
            <button key={m.key} className="mission-card" onClick={() => navigate(missionPath(m.key))}>
              <div className="mission-cycles">
                {m.cycles.length > 0
                  ? m.cycles.map((c) => <span key={c} className="cycle-tag">사이클 {c}</span>)
                  : <span className="cycle-tag">단일</span>}
              </div>
              <h3>{m.mission}</h3>
              <p className="mono muted">{m.repo}</p>
              <div className="mission-foot">
                <span>PR {m.prCount}개</span>
                <span className="go">둘러보기 →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="block">
        <h2 className="section-title">리뷰를 많이 남긴 리뷰어</h2>
        <div className="card-grid">
          {topReviewers.map((p) => (
            <button key={p.login} className="entity-card" onClick={() => navigate(personPath(p.login))}>
              <span className="entity-name">{displayName(p.login, p.nickname)}</span>
              <span className="entity-sub">
                리뷰 {p.reviewsGiven}
                {p.authoredPrs > 0 && ` · PR ${p.authoredPrs}`}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}