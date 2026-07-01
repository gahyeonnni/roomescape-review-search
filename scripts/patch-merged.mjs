// 이미 수집된 reviews.json 에서 merged 되지 않은 PR(및 그 코멘트)을 제거한다.
// PR 목록만 다시 받아(저렴) merged 여부를 확인하므로 전체 재수집이 필요 없다.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(ROOT, 'public/data/reviews.json')
const ORG = 'woowacourse'
const REPOS = {
  admin: 'spring-roomescape-admin',
  member: 'spring-roomescape-member',
  waiting: 'spring-roomescape-waiting',
}
const TOKEN = process.env.GH_TOKEN || execSync('gh auth token', { encoding: 'utf8' }).trim()
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' }

async function mergedNumbers(repo) {
  const set = new Set()
  let url = `https://api.github.com/repos/${ORG}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100`
  while (url) {
    const res = await fetch(url, { headers })
    const page = await res.json()
    let stop = false
    for (const p of page) {
      if (new Date(p.created_at).getFullYear() < 2026) { stop = true; break }
      if (p.merged_at) set.add(p.number)
    }
    if (stop) break
    const link = res.headers.get('link') ?? ''
    const m = link.split(',').find((s) => s.includes('rel="next"'))
    url = m ? m.slice(m.indexOf('<') + 1, m.indexOf('>')) : null
  }
  return set
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const mergedByRepo = {}
for (const [key, repo] of Object.entries(REPOS)) mergedByRepo[key] = await mergedNumbers(repo)

const isMerged = (repoKey, num) => mergedByRepo[repoKey]?.has(num)

const beforeP = data.pulls.length
const beforeC = data.comments.length
data.pulls = data.pulls.filter((p) => isMerged(p.repoKey, p.number))
data.comments = data.comments.filter((c) => isMerged(c.repoKey, c.prNumber))
for (const m of data.missions) {
  m.prCount = data.pulls.filter((p) => p.repoKey === m.key).length
}

writeFileSync(FILE, JSON.stringify(data))
console.log(`PR: ${beforeP} -> ${data.pulls.length} (merged만)`)
console.log(`코멘트: ${beforeC} -> ${data.comments.length}`)