import type { Comment } from './types'

// 외부 의존성 없이 클라이언트에서 도는 한국어/영어 혼합 텍스트 유사도.
//
// 유사도 특징(feature)은 아래를 섞어서 만든다.
//  - 한국어 단어: "글자 바이그램" (활용형 변형에 강하고, 흔한 어미는 IDF로 저평가됨)
//  - 영어/식별자: 소문자 토큰 그대로
//  - 숫자: 2자리 이상(201, 404 등 상태코드류)만 보존
// TF-IDF 코사인 유사도로 랭킹한다.

const STOPWORDS = new Set([
  // 지시/접속/일반
  '그리고', '그래서', '하지만', '그런데', '저는', '제가', '이거', '그거', '저거',
  '부분', '이런', '그런', '저런', '정도', '조금', '어떤', '무엇', '경우', '때문',
  '대해', '대한', '통해', '통한', '위해', '위한', '보다', '또는', '그냥', '많이',
  '역시', '물론', '결국', '사실', '아주', '정말', '너무', '여기', '거기', '저기',
  // 흔한 리뷰 필러/어미형
  '같아요', '같은', '같습니다', '같네요', '같은데요', '있는', '있습니다', '있어요',
  '없어요', '없는', '합니다', '하는', '해서', '해요', '하네요', '하시나요', '하셨나요',
  '봅니다', '봐요', '보여요', '보이네요', '보면', '네요', '어때요', '어떨까요',
  '인가요', '일까요', '될까요', '되나요', '되네요', '있을까요', '없을까요', '습니다',
  '했어요', '알아보아요', '알아봐요', '알아봅시다', '좋아요', '좋을까요', '좋겠어요',
  '좋을', '좋은', '좋네요', '궁금해요', '궁금합니다', '궁금하네요', '궁금',
  '생각해요', '생각합니다', '생각이', '생각', '화이팅', '파이팅', '수고', '감사',
  // 영어 일반어
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'is', 'it', 'for',
  'this', 'that', 'with', 'as', 'be', 'on', 'at', 'by', 'so', 'if', 'not', 'are',
])

function clean(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // 코드블록
    .replace(/`[^`]*`/g, ' ') // 인라인 코드
    .replace(/^>.*$/gm, ' ') // 인용문(보통 원문 재인용)
    .toLowerCase()
}

/** 표시/강조/개념 제안용 "의미 있는 단어" 토큰 (활용형 그대로) */
export function keywords(text: string): string[] {
  const raw = clean(text).split(/[^0-9a-z가-힣]+/i)
  const out: string[] = []
  for (const t of raw) {
    if (t.length < 2) continue
    if (STOPWORDS.has(t)) continue
    if (/^\d+$/.test(t) && t.length < 2) continue
    out.push(t)
  }
  return out
}

/** 유사도 계산용 특징 벡터 재료 */
function features(text: string): string[] {
  const raw = clean(text).split(/[^0-9a-z가-힣]+/i)
  const out: string[] = []
  for (const t of raw) {
    if (t.length < 2 || STOPWORDS.has(t)) continue
    if (/^\d+$/.test(t)) {
      if (t.length >= 2) out.push('n:' + t) // 201, 404 등 보존
      continue
    }
    if (/[가-힣]/.test(t)) {
      for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2)) // 글자 바이그램
    } else {
      out.push(t) // 영어/식별자
    }
  }
  return out
}

export interface SimilarityIndex {
  featById: Map<string, Map<string, number>> // id -> (feature -> tf)
  idf: Map<string, number>
  keywordsById: Map<string, string[]>
}

export function buildIndex(comments: Comment[]): SimilarityIndex {
  const featById = new Map<string, Map<string, number>>()
  const keywordsById = new Map<string, string[]>()
  const df = new Map<string, number>()

  for (const c of comments) {
    const feats = features(c.body)
    const tf = new Map<string, number>()
    for (const f of feats) tf.set(f, (tf.get(f) ?? 0) + 1)
    featById.set(c.id, tf)
    keywordsById.set(c.id, keywords(c.body))
    for (const f of tf.keys()) df.set(f, (df.get(f) ?? 0) + 1)
  }

  const n = comments.length
  const idf = new Map<string, number>()
  for (const [f, d] of df) idf.set(f, Math.log((n + 1) / (d + 1)) + 1)

  return { featById, idf, keywordsById }
}

function norm(tf: Map<string, number>, idf: Map<string, number>): number {
  let s = 0
  for (const [f, c] of tf) {
    const w = c * (idf.get(f) ?? 0)
    s += w * w
  }
  return Math.sqrt(s)
}

export interface Scored {
  comment: Comment
  score: number
}

/** 특정 코멘트와 유사한 다른 코멘트 top-N (같은 PR 제외, 최소 유사도 이상만) */
export function findSimilar(
  source: Comment,
  comments: Comment[],
  index: SimilarityIndex,
  topN = 25,
  minScore = 0.04,
): Scored[] {
  const srcTf = index.featById.get(source.id)
  if (!srcTf || srcTf.size === 0) return []
  const srcNorm = norm(srcTf, index.idf)
  if (srcNorm === 0) return []

  const results: Scored[] = []
  for (const c of comments) {
    if (c.id === source.id) continue
    if (c.prNumber === source.prNumber && c.repoKey === source.repoKey) continue
    const tf = index.featById.get(c.id)
    if (!tf || tf.size === 0) continue
    // 더 작은 쪽을 순회
    const [small, big] = srcTf.size <= tf.size ? [srcTf, tf] : [tf, srcTf]
    let dot = 0
    for (const [f, cf] of small) {
      const of = big.get(f)
      if (of) {
        const w = index.idf.get(f) ?? 0
        dot += cf * w * (of * w)
      }
    }
    if (dot === 0) continue
    const score = dot / (srcNorm * norm(tf, index.idf))
    if (score >= minScore) results.push({ comment: c, score })
  }
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, topN)
}

/** 개념(키워드) 검색: body 에 모든 검색어(공백 구분)가 포함된 코멘트 */
export function searchComments(comments: Comment[], query: string): Comment[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  return comments.filter((c) => {
    const body = c.body.toLowerCase()
    return terms.every((t) => body.includes(t))
  })
}