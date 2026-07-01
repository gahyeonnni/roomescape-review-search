import { useMemo } from 'react'
import { useAppData } from '../lib/appData'
import { findSimilar } from '../lib/search'
import { CommentCard } from './CommentCard'
import { navigate } from '../lib/router'

export function SimilarView({ commentId }: { commentId: string }) {
  const { data, index, commentsById } = useAppData()
  const source = commentsById.get(commentId)

  const terms = useMemo(() => {
    if (!source) return []
    // 원문의 의미 있는 키워드 중 긴 것 위주로 강조 (중복 제거)
    const kws = index.keywordsById.get(source.id) ?? []
    return [...new Set(kws)]
      .filter((t) => t.length >= 2)
      .sort((a, b) => b.length - a.length)
      .slice(0, 8)
  }, [source, index])

  const results = useMemo(
    () => (source ? findSimilar(source, data.comments, index, 30) : []),
    [source, data, index],
  )

  if (!source) {
    return (
      <div className="view">
        <p className="empty">해당 코멘트를 찾을 수 없습니다.</p>
        <button className="link" onClick={() => navigate('#/')}>← 홈으로</button>
      </div>
    )
  }

  return (
    <div className="view">
      <h1 className="similar-title">🔎 유사한 리뷰</h1>
      <p className="muted">아래 원본 리뷰와 표현·주제가 비슷한 다른 리뷰들을 찾았어요.</p>

      <div className="source-wrap">
        <div className="source-label">원본</div>
        <CommentCard comment={source} />
      </div>

      <h2 className="group-title">비슷한 리뷰 {results.length}개</h2>
      {results.length === 0 ? (
        <p className="empty">비슷한 리뷰를 찾지 못했어요.</p>
      ) : (
        <div className="comment-list">
          {results.map(({ comment, score }) => (
            <CommentCard key={comment.id} comment={comment} score={score} terms={terms} />
          ))}
        </div>
      )}
    </div>
  )
}