// 이미 수집된 reviews.json 의 요약(summary) 코멘트에서 코치 닉네임을
// 다시 파싱해 coachNicknameByLogin 을 갱신한다 (재수집 없이 빠르게).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(ROOT, 'public/data/reviews.json')

const NICK_STOP = new Set([
  '리뷰', '코멘트', '미션', '내용', '때문', '판단', '고민', '질문', '정도', '예시',
  '이유', '생각', '방탈출', '관리', '사용자', '인증', '예약', '대기', '단계', '학습',
  '담당', '함께', '이번', '다음', '오늘', '안녕', '수고', '감사', '확인', '부탁',
  '화이팅', '파이팅', '화이링', '인상적', '응원', '고생', '최고', '대박', '충분',
  '사실', '결국', '물론', '정말', '조금', '아주', '역시', '가능', '중요', '필요',
])

function introNickCandidates(body) {
  const head = body.split('\n').slice(0, 5).join(' ')
  const re = /([가-힣A-Za-z][가-힣A-Za-z0-9]{1,9})\s*(?:입니다|이에요|예요|입니당|이라고|라고 합니다)/g
  const out = []
  let m
  while ((m = re.exec(head))) if (!NICK_STOP.has(m[1])) out.push(m[1])
  return out
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const tally = new Map()
for (const c of data.comments) {
  if (c.kind !== 'summary' || !c.reviewer) continue
  for (const cand of introNickCandidates(c.body ?? '')) {
    if (cand === c.prNickname) continue
    const m = tally.get(c.reviewer) ?? new Map()
    m.set(cand, (m.get(cand) ?? 0) + 1)
    tally.set(c.reviewer, m)
  }
}

const coach = {}
for (const [login, m] of tally) {
  if (data.nicknameByLogin[login]) continue
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
  if (best && best[1] >= 2) coach[login] = best[0]
}
const nickCount = {}
for (const n of Object.values(coach)) nickCount[n] = (nickCount[n] ?? 0) + 1
for (const [login, n] of Object.entries(coach)) if (nickCount[n] >= 3) delete coach[login]

data.coachNicknameByLogin = coach
writeFileSync(FILE, JSON.stringify(data))
console.log(`코치 닉네임 ${Object.keys(coach).length}명:`)
console.log('  ' + Object.entries(coach).map(([l, n]) => `${n}(${l})`).join(', '))