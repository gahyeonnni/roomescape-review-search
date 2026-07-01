import { useMemo, useRef, useState } from 'react'
import { useAppData } from '../lib/appData'
import { displayName } from '../lib/data'
import { navigate, personPath, conceptPath } from '../lib/router'

export function SearchBar() {
  const { people } = useAppData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const peopleList = useMemo(() => [...people.values()], [people])

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return peopleList
      .filter(
        (p) =>
          p.login.toLowerCase().includes(term) ||
          (p.nickname ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => b.reviewsGiven + b.authoredPrs - (a.reviewsGiven + a.authoredPrs))
      .slice(0, 8)
  }, [q, peopleList])

  const goConcept = () => {
    if (!q.trim()) return
    setOpen(false)
    navigate(conceptPath(q.trim()))
  }

  return (
    <div className="searchbox" ref={boxRef}>
      <input
        value={q}
        placeholder="크루·리뷰어 이름 또는 개념(예: 의존성) 검색…"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Enter' && goConcept()}
      />
      {open && q.trim() && (
        <div className="suggest">
          <button className="suggest-item concept" onMouseDown={goConcept}>
            🔎 <b>“{q.trim()}”</b> 개념으로 전체 리뷰 검색
          </button>
          {matches.length > 0 && <div className="suggest-label">사람</div>}
          {matches.map((p) => (
            <button
              key={p.login}
              className="suggest-item"
              onMouseDown={() => {
                setOpen(false)
                navigate(personPath(p.login))
              }}
            >
              <span className="s-name">{displayName(p.login, p.nickname)}</span>
              <span className="s-meta">
                {p.reviewsGiven > 0 && <span>리뷰 {p.reviewsGiven}</span>}
                {p.authoredPrs > 0 && <span>PR {p.authoredPrs}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}