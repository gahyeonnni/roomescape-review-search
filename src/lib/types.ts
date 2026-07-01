export type CommentKind = 'review' | 'conversation' | 'summary'

export interface Comment {
  id: string
  repoKey: string
  mission: string
  cycle: number | null
  submission: string | null
  prNumber: number
  prAuthor: string | null
  prNickname: string
  step: number | null
  kind: CommentKind
  reviewer: string | null
  path: string | null
  line: number | null
  body: string
  url: string
  createdAt: string
}

export interface Pull {
  number: number
  author: string | null
  nickname: string
  title: string
  cycle: number | null
  submission: string | null
  step: number | null
  headRef: string | null
  baseRef: string | null
  url: string
  createdAt: string
  mergedAt: string | null
  repoKey: string
  mission: string
}

export interface Mission {
  key: string
  repo: string
  mission: string
  cycles: number[]
  prCount: number
}

export interface Dataset {
  generatedAt: string
  year: number
  org: string
  missions: Mission[]
  nicknameByLogin: Record<string, string>
  coachNicknameByLogin: Record<string, string>
  pulls: Pull[]
  comments: Comment[]
}

/** 사람(크루/리뷰어) 집계 정보 */
export interface Person {
  login: string
  nickname: string | null
  /** 이 사람이 작성자인 PR 수 (크루로서) */
  authoredPrs: number
  /** 이 사람이 남긴 리뷰 코멘트 수 (리뷰어로서) */
  reviewsGiven: number
}