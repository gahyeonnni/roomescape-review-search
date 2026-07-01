import { useMemo, useState } from 'react'
import { useAppData } from '../lib/appData'
import { searchComments } from '../lib/search'
import { CommentCard } from './CommentCard'
import { conceptPath, navigate } from '../lib/router'

const PAGE = 40

export function ConceptView({ query }: { query: string }) {
  const { data } = useAppData()
  const [missionFilter, setMissionFilter] = useState<string | null>(null)
  const [reviewerFilter, setReviewerFilter] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const terms = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query])
  const all = useMemo(() => searchComments(data.comments, query), [data, query])

  const filtered = useMemo(
    () =>
      all.filter(
        (c) =>
          (!missionFilter || c.mission === missionFilter) &&
          (!reviewerFilter || c.reviewer === reviewerFilter),
      ),
    [all, missionFilter, reviewerFilter],
  )

  const topReviewers = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of all) if (c.reviewer) m.set(c.reviewer, (m.get(c.reviewer) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [all])

  const missionCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of all) m.set(c.mission, (m.get(c.mission) ?? 0) + 1)
    return [...m.entries()]
  }, [all])

  if (!query.trim()) {
    return <div className="view"><p className="empty">검색어를 입력하세요.</p></div>
  }

  return (
    <div className="view concept-view">
      <div className="concept-head">
        <h1>
          <span className="kw">“{query}”</span> 리뷰 검색
        </h1>
        <p className="muted">
          전체 리뷰어가 이 개념에 대해 남긴 코멘트 <b>{all.length.toLocaleString()}</b>개
          {filtered.length !== all.length && ` (필터 후 ${filtered.length.toLocaleString()})`}
        </p>
      </div>

      <div className="facets">
        <div className="facet">
          <span className="facet-label">미션</span>
          <button className={!missionFilter ? 'fchip on' : 'fchip'} onClick={() => setMissionFilter(null)}>
            전체
          </button>
          {missionCounts.map(([m, n]) => (
            <button key={m} className={missionFilter === m ? 'fchip on' : 'fchip'} onClick={() => setMissionFilter(m)}>
              {m} <span className="fcount">{n}</span>
            </button>
          ))}
        </div>
        <div className="facet">
          <span className="facet-label">리뷰어</span>
          <button className={!reviewerFilter ? 'fchip on' : 'fchip'} onClick={() => setReviewerFilter(null)}>
            전체
          </button>
          {topReviewers.map(([r, n]) => (
            <button key={r} className={reviewerFilter === r ? 'fchip on' : 'fchip'} onClick={() => setReviewerFilter(r)}>
              {r} <span className="fcount">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="comment-list">
        {filtered.slice(0, limit).map((c) => (
          <CommentCard key={c.id} comment={c} terms={terms} />
        ))}
      </div>

      {limit < filtered.length && (
        <button className="more" onClick={() => setLimit((l) => l + PAGE)}>
          더 보기 ({filtered.length - limit}개 남음)
        </button>
      )}

      {all.length === 0 && (
        <div className="empty">
          결과가 없습니다. 다른 키워드를 시도해보세요.
          <div className="concepts">
            {['의존성', '책임', '테스트', '예외'].map((c) => (
              <button key={c} className="pill" onClick={() => navigate(conceptPath(c))}>
                #{c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}