import type { Dataset, Person } from './types'

let cache: Dataset | null = null

/** public/data/reviews.json 로드 (한 번만) */
export async function loadDataset(): Promise<Dataset> {
  if (cache) return cache
  const res = await fetch(`${import.meta.env.BASE_URL}data/reviews.json`)
  if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다 (${res.status})`)
  cache = (await res.json()) as Dataset
  return cache
}

/** 로그인 -> Person 집계. 크루/리뷰어 양쪽 모두 포함. */
export function buildPeople(data: Dataset): Map<string, Person> {
  const people = new Map<string, Person>()
  const ensure = (login: string): Person => {
    let p = people.get(login)
    if (!p) {
      p = {
        login,
        nickname: data.nicknameByLogin[login] ?? data.coachNicknameByLogin?.[login] ?? null,
        authoredPrs: 0,
        reviewsGiven: 0,
      }
      people.set(login, p)
    }
    return p
  }
  for (const pr of data.pulls) {
    if (pr.author) ensure(pr.author).authoredPrs++
  }
  for (const c of data.comments) {
    if (c.reviewer) ensure(c.reviewer).reviewsGiven++
  }
  return people
}

export function displayName(login: string, nickname: string | null): string {
  return nickname ? `${nickname} (${login})` : login
}