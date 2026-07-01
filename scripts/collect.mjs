// 우아한테크코스 8기 방탈출 미션 PR 리뷰 코멘트 수집 스크립트
//
// GitHub API로 지정한 레포들의 8기(2026년) PR과 인라인 리뷰 코멘트/대화 코멘트를
// 모두 긁어와서 public/data/reviews.json 으로 저장한다.
//
// 실행: `node scripts/collect.mjs` (gh CLI 로그인 필요, 또는 GH_TOKEN 환경변수)
// 옵션: `--repo admin` 처럼 특정 레포만, `--year 2026` 으로 연도 지정

import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const ORG = 'woowacourse'
const YEAR = Number(argValue('--year') ?? 2026)
const ONLY = argValue('--repo') // admin | member | waiting

/** 미션(레포) 정의. key 는 앱/파일에서 쓰는 짧은 식별자, mission 은 레포 전체 이름. */
const REPOS = [
  { key: 'admin', repo: 'spring-roomescape-admin', mission: '방탈출 어드민' },
  { key: 'member', repo: 'spring-roomescape-member', mission: '방탈출 사용자/인증' },
  { key: 'waiting', repo: 'spring-roomescape-waiting', mission: '방탈출 예약 대기' },
].filter((r) => !ONLY || r.key === ONLY)

const TOKEN =
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN ||
  execSync('gh auth token', { encoding: 'utf8' }).trim()

if (!TOKEN) {
  console.error('GitHub 토큰이 없습니다. `gh auth login` 하거나 GH_TOKEN 을 설정하세요.')
  process.exit(1)
}

const BASE = 'https://api.github.com'
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

let requestCount = 0

/**
 * Link 헤더 기반 페이지네이션. `stopWhen(item)` 이 true 인 항목을 만나면
 * 그 항목까지만 담고 종료한다(정렬이 보장될 때 조기 종료용).
 */
async function paginate(path, stopWhen) {
  const items = []
  let url = `${BASE}${path}${path.includes('?') ? '&' : '?'}per_page=100`
  while (url) {
    requestCount++
    const res = await fetch(url, { headers })
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const waitMs = Math.max(0, reset - Date.now()) + 1000
      console.warn(`  rate limit 도달, ${Math.round(waitMs / 1000)}초 대기...`)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${url}\n${await res.text()}`)
    const page = await res.json()
    for (const it of page) {
      items.push(it)
      if (stopWhen && stopWhen(it)) return items
    }
    url = nextLink(res.headers.get('link'))
  }
  return items
}

/** 단건 GET (페이지네이션 없음). 404 등은 null 반환. */
async function getJson(path) {
  const url = `${BASE}${path}`
  while (true) {
    requestCount++
    const res = await fetch(url, { headers })
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const waitMs = Math.max(0, reset - Date.now()) + 1000
      console.warn(`  rate limit 도달, ${Math.round(waitMs / 1000)}초 대기...`)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${url}`)
    return res.json()
  }
}

/** 간단한 동시성 풀 */
async function pool(items, size, fn) {
  const queue = [...items]
  const workers = Array.from({ length: size }, async () => {
    while (queue.length) {
      const item = queue.shift()
      await fn(item)
    }
  })
  await Promise.all(workers)
}

function nextLink(link) {
  if (!link) return null
  const m = link.split(',').find((s) => s.includes('rel="next"'))
  if (!m) return null
  return m.slice(m.indexOf('<') + 1, m.indexOf('>'))
}

/** PR 제목에서 크루 닉네임 추출: "[...] 현미밥 미션 제출합니다." -> "현미밥" */
function parseNickname(title = '') {
  const m = title.match(/\]\s*(.+?)\s*미션\s*제출/) || title.match(/^(.+?)\s*미션\s*제출/)
  return (m ? m[1] : title).trim()
}

/** head 브랜치에서 단계(step) 추출: "step2" -> 2, 없으면 null */
function parseStepFromRef(ref = '') {
  const m = ref.match(/step[\s_-]*(\d+)/i)
  return m ? Number(m[1]) : null
}

/**
 * PR 제목에서 사이클·단계·세부 미션명을 파싱한다.
 * 제목 형식: "[🚀 <미션설명 + 사이클/단계>] <닉네임> 미션 제출합니다."
 * 예)
 *  "[🚀 사이클1 - 미션 (테마 + 사용자 예약)] 누누..." -> {cycle:1, step:null, submission:'테마 + 사용자 예약'}
 *  "[🚀 방탈출 예약 외부 API 연동 3단계] 글렌..."    -> {cycle:null, step:3, submission:'방탈출 예약 외부 API 연동'}
 *  "[🚀 미션 (방탈출 예약 관리)] 누누..."             -> {cycle:null, step:null, submission:'방탈출 예약 관리'}
 */
function parseMissionMeta(title = '', headRef = '') {
  const bm = title.match(/\[([^\]]*)\]/)
  let inner = (bm ? bm[1] : title).replace(/[🚀🌱✨⭐️⭐🐛📝🎯🔥💡🙏]/g, ' ')

  const cycle = (inner.match(/사이클\s*(\d)/) || [])[1]
  let step = (inner.match(/(\d)\s*단계/) || [])[1]
  if (step == null) {
    const fromRef = parseStepFromRef(headRef)
    if (fromRef != null) step = String(fromRef)
  }

  // 괄호 안 미션명이 있으면 그것을 우선 사용 (크루 실명 괄호는 대괄호 밖이라 안전)
  let submission
  const paren = inner.match(/\(([^)]+)\)/)
  if (paren) {
    submission = paren[1].trim()
  } else {
    submission = inner
      .replace(/사이클\s*\d\s*[-–]?/g, ' ')
      .replace(/미션/g, ' ')
      .replace(/[\s,\-–]*\d\s*단계.*$/, '') // 'N단계' 이후는 잘라냄 (설명 꼬리 제거)
      .replace(/\s+/g, ' ')
      .trim()
  }
  return {
    cycle: cycle != null ? Number(cycle) : null,
    step: step != null ? Number(step) : null,
    submission: submission || null,
  }
}

// 자기소개에서 잘못 잡히는 흔한 명사들 (예: "리뷰입니다")
const NICK_STOP = new Set([
  '리뷰', '코멘트', '미션', '내용', '때문', '판단', '고민', '질문', '정도', '예시',
  '이유', '생각', '방탈출', '관리', '사용자', '인증', '예약', '대기', '단계', '학습',
  '담당', '함께', '이번', '다음', '오늘', '안녕', '수고', '감사', '확인', '부탁',
  // 응원/감탄 문구 오탐 방지
  '화이팅', '파이팅', '화이링', '인상적', '응원', '고생', '최고', '대박', '충분',
  '사실', '결국', '물론', '정말', '조금', '아주', '역시', '가능', '중요', '필요',
])

/**
 * 리뷰 요약 본문의 인사말에서 리뷰어 닉네임 후보를 추출한다.
 * 예: "안녕하세요 정콩이~ PK입니다." -> ["PK"]
 *     "함께하게된 찰리입니다" -> ["찰리"]
 */
function introNickCandidates(body) {
  const head = body.split('\n').slice(0, 5).join(' ')
  const re = /([가-힣A-Za-z][가-힣A-Za-z0-9]{1,9})\s*(?:입니다|이에요|예요|입니당|이라고|라고 합니다)/g
  const out = []
  let m
  while ((m = re.exec(head))) {
    const t = m[1]
    if (!NICK_STOP.has(t)) out.push(t)
  }
  return out
}

async function collectRepo({ key, repo, mission }) {
  console.log(`\n▶ ${repo} 수집 중...`)

  // 1) PR 목록을 최신순으로 받아 2026년(8기) 이전을 만나면 조기 종료
  const allPulls = await paginate(
    `/repos/${ORG}/${repo}/pulls?state=all&sort=created&direction=desc`,
    (p) => new Date(p.created_at).getFullYear() < YEAR,
  )
  const prMap = new Map()
  let skippedUnmerged = 0
  for (const p of allPulls) {
    if (new Date(p.created_at).getFullYear() !== YEAR) continue
    if (!p.merged_at) { skippedUnmerged++; continue } // merged 된 PR만
    const meta = parseMissionMeta(p.title, p.head?.ref)
    prMap.set(p.number, {
      number: p.number,
      author: p.user?.login ?? null,
      nickname: parseNickname(p.title),
      title: p.title,
      cycle: meta.cycle,
      step: meta.step,
      submission: meta.submission,
      headRef: p.head?.ref ?? null,
      baseRef: p.base?.ref ?? null,
      url: p.html_url,
      createdAt: p.created_at,
      mergedAt: p.merged_at,
    })
  }
  console.log(`  8기 merged PR: ${prMap.size}개 (미머지 ${skippedUnmerged}개 제외)`)

  // 2) 인라인 리뷰 코멘트 — since 로 2026년 이후만 (updated 기준)
  const since = `${YEAR}-01-01T00:00:00Z`
  const reviewComments = await paginate(
    `/repos/${ORG}/${repo}/pulls/comments?sort=created&direction=asc&since=${since}`,
  )
  // 3) PR 대화창(이슈) 코멘트 — since 로 2026년 이후만
  const issueComments = await paginate(
    `/repos/${ORG}/${repo}/issues/comments?sort=created&direction=asc&since=${since}`,
  )

  const comments = []
  const push = (c, kind) => {
    const prNumber = kind === 'review'
      ? Number(c.pull_request_url.split('/').pop())
      : Number(c.issue_url.split('/').pop())
    const pr = prMap.get(prNumber)
    if (!pr) return // 8기 PR 이 아니면 건너뜀
    comments.push({
      id: `${key}-${kind}-${c.id}`,
      repoKey: key,
      mission,
      cycle: pr.cycle,
      submission: pr.submission,
      prNumber,
      prAuthor: pr.author,
      prNickname: pr.nickname,
      step: pr.step,
      kind, // 'review'(코드 인라인) | 'conversation'(PR 대화)
      reviewer: c.user?.login ?? null,
      path: kind === 'review' ? c.path : null,
      line: kind === 'review' ? (c.line ?? c.original_line ?? null) : null,
      body: c.body ?? '',
      url: c.html_url,
      createdAt: c.created_at,
    })
  }
  for (const c of reviewComments) push(c, 'review')
  for (const c of issueComments) push(c, 'conversation')

  // 4) PR별 리뷰 요약 본문 (APPROVED/CHANGES_REQUESTED 등의 총평 + 자기소개)
  process.stdout.write(`  리뷰 요약 수집 중 (${prMap.size} PR)...`)
  const prNumbers = [...prMap.keys()]
  const nickTally = new Map() // login -> Map(nickname -> count)
  await pool(prNumbers, 8, async (num) => {
    const pr = prMap.get(num)
    const reviews = await getJson(`/repos/${ORG}/${repo}/pulls/${num}/reviews`)
    if (!reviews) return
    for (const r of reviews) {
      const login = r.user?.login
      if (!login) continue
      // 자기소개 닉네임 후보 집계 (본인이 크루로 쓴 닉네임은 제외)
      for (const cand of introNickCandidates(r.body ?? '')) {
        if (cand === pr.nickname) continue
        const m = nickTally.get(login) ?? new Map()
        m.set(cand, (m.get(cand) ?? 0) + 1)
        nickTally.set(login, m)
      }
      if (!r.body || !r.body.trim()) continue
      comments.push({
        id: `${key}-summary-${r.id}`,
        repoKey: key,
        mission,
        cycle: pr.cycle,
        submission: pr.submission,
        prNumber: num,
        prAuthor: pr.author,
        prNickname: pr.nickname,
        step: pr.step,
        kind: 'summary', // PR 총평 리뷰
        reviewer: login,
        path: null,
        line: null,
        body: r.body,
        url: r.html_url,
        createdAt: r.submitted_at ?? pr.createdAt,
      })
    }
  })
  process.stdout.write(' 완료\n')

  const summaryCount = comments.filter((c) => c.kind === 'summary').length
  console.log(`  코멘트: ${comments.length}개 (인라인 ${reviewComments.length}, 대화 ${issueComments.length}, 요약 ${summaryCount})`)

  return { pulls: [...prMap.values()], comments, nickTally }
}

async function main() {
  const started = Date.now()
  const missions = []
  const allComments = []
  const allPulls = []
  const globalTally = new Map() // login -> Map(nick -> count)

  for (const def of REPOS) {
    const { pulls, comments, nickTally } = await collectRepo(def)
    // 이 레포에 등장한 사이클 목록 (제목 기반)
    const cyclesInRepo = [...new Set(pulls.map((p) => p.cycle).filter((c) => c != null))].sort()
    missions.push({ key: def.key, repo: def.repo, mission: def.mission, cycles: cyclesInRepo, prCount: pulls.length })
    allPulls.push(...pulls.map((p) => ({ ...p, repoKey: def.key, mission: def.mission })))
    allComments.push(...comments)
    for (const [login, m] of nickTally) {
      const g = globalTally.get(login) ?? new Map()
      for (const [nick, cnt] of m) g.set(nick, (g.get(nick) ?? 0) + cnt)
      globalTally.set(login, g)
    }
  }

  // 크루 닉네임: PR 작성자 제목에서 확정
  const nicknameByLogin = {}
  for (const p of allPulls) {
    if (p.author && p.nickname) nicknameByLogin[p.author] = p.nickname
  }

  // 코치(순수 리뷰어) 닉네임: 자기소개에서 최빈값 채택 (크루 닉네임 없는 경우만)
  const coachNicknameByLogin = {}
  for (const [login, m] of globalTally) {
    if (nicknameByLogin[login]) continue
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
    if (best && best[1] >= 2) coachNicknameByLogin[login] = best[0] // 2회 이상 등장한 것만
  }
  // 같은 닉네임이 3명 이상에게 붙으면 흔한 단어(오탐)로 보고 제거
  const nickCount = {}
  for (const n of Object.values(coachNicknameByLogin)) nickCount[n] = (nickCount[n] ?? 0) + 1
  for (const [login, n] of Object.entries(coachNicknameByLogin)) {
    if (nickCount[n] >= 3) delete coachNicknameByLogin[login]
  }
  console.log(`\n코치 닉네임 추출: ${Object.keys(coachNicknameByLogin).length}명`)
  console.log('  ' + Object.entries(coachNicknameByLogin).map(([l, n]) => `${n}(${l})`).join(', '))

  const dataset = {
    generatedAt: new Date().toISOString(),
    year: YEAR,
    org: ORG,
    missions,
    nicknameByLogin,
    coachNicknameByLogin,
    pulls: allPulls,
    comments: allComments,
  }

  mkdirSync(join(ROOT, 'public/data'), { recursive: true })
  const out = join(ROOT, 'public/data/reviews.json')
  writeFileSync(out, JSON.stringify(dataset))

  const sec = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\n✅ 완료: PR ${allPulls.length}개 · 코멘트 ${allComments.length}개`)
  console.log(`   API 요청 ${requestCount}회 · ${sec}초`)
  console.log(`   저장: ${out} (${(JSON.stringify(dataset).length / 1024 / 1024).toFixed(2)} MB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})