import { useState } from 'react'
import type { Comment } from '../lib/types'
import { baseName, missionLabel, shortDate } from '../lib/format'
import { navigate, personPath, similarPath } from '../lib/router'
import { Highlight } from './Highlight'

interface Props {
  comment: Comment
  terms?: string[]
  /** 리뷰어를 강조하고 대상(크루)을 부제목으로 (리뷰어 관점) */
  showReviewer?: boolean
  /** 유사 리뷰 점수 (있으면 배지 표시) */
  score?: number
}

const MAX = 600

export function CommentCard({ comment: c, terms, showReviewer = true, score }: Props) {
  const [open, setOpen] = useState(false)
  const long = c.body.length > MAX
  const body = open || !long ? c.body : c.body.slice(0, MAX) + '…'

  return (
    <article className="card comment">
      <header className="comment-head">
        <div className="who">
          {showReviewer && c.reviewer && (
            <>
              <button className="chip chip-reviewer" onClick={() => navigate(personPath(c.reviewer!))}>
                ✍️ {c.reviewer}
              </button>
              <span className="arrow">→</span>
            </>
          )}
          <button
            className="chip chip-crew"
            onClick={() => c.prAuthor && navigate(personPath(c.prAuthor))}
            title={c.prAuthor ?? ''}
          >
            {c.prNickname || c.prAuthor}
          </button>
          <span className="meta">{missionLabel(c)}</span>
        </div>
        {score != null && <span className="score">유사도 {(score * 100).toFixed(0)}%</span>}
      </header>

      {c.kind === 'review' && c.path && (
        <div className="filemeta" title={c.path}>
          📄 {baseName(c.path)}
          {c.line != null && <span className="line">:{c.line}</span>}
        </div>
      )}
      {c.kind === 'conversation' && <div className="filemeta convo">💬 PR 대화</div>}
      {c.kind === 'summary' && <div className="filemeta convo summary">📝 리뷰 총평</div>}

      <div className="body">
        <Highlight text={body} terms={terms} />
      </div>

      <footer className="comment-foot">
        {long && (
          <button className="link" onClick={() => setOpen((v) => !v)}>
            {open ? '접기' : '더보기'}
          </button>
        )}
        <button className="link" onClick={() => navigate(similarPath(c.id))}>
          🔎 유사한 리뷰
        </button>
        <a className="link" href={c.url} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
        <span className="date">{shortDate(c.createdAt)}</span>
      </footer>
    </article>
  )
}