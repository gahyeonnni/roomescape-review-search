// 저장된 reviews.json 의 PR 제목을 다시 파싱해 cycle/step/submission 을 갱신한다.
// (수집한 원본 데이터는 그대로, 파싱 규칙만 바뀐 경우 재수집 없이 반영)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/data/reviews.json')

function parseStepFromRef(ref = '') {
  const m = ref.match(/step[\s_-]*(\d+)/i)
  return m ? Number(m[1]) : null
}

function parseMissionMeta(title = '', headRef = '') {
  const bm = title.match(/\[([^\]]*)\]/)
  let inner = (bm ? bm[1] : title).replace(/[🚀🌱✨⭐️⭐🐛📝🎯🔥💡🙏]/g, ' ')
  const cycle = (inner.match(/사이클\s*(\d)/) || [])[1]
  let step = (inner.match(/(\d)\s*단계/) || [])[1]
  if (step == null) {
    const fromRef = parseStepFromRef(headRef)
    if (fromRef != null) step = String(fromRef)
  }
  let submission
  const paren = inner.match(/\(([^)]+)\)/)
  if (paren) {
    submission = paren[1].trim()
  } else {
    submission = inner
      .replace(/사이클\s*\d\s*[-–]?/g, ' ')
      .replace(/미션/g, ' ')
      .replace(/[\s,\-–]*\d\s*단계.*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return {
    cycle: cycle != null ? Number(cycle) : null,
    step: step != null ? Number(step) : null,
    submission: submission || null,
  }
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const metaByPr = new Map()
for (const p of data.pulls) {
  const meta = parseMissionMeta(p.title, p.headRef ?? '')
  p.cycle = meta.cycle
  p.step = meta.step
  p.submission = meta.submission
  metaByPr.set(`${p.repoKey}#${p.number}`, meta)
}
for (const c of data.comments) {
  const meta = metaByPr.get(`${c.repoKey}#${c.prNumber}`)
  if (meta) {
    c.cycle = meta.cycle
    c.step = meta.step
    c.submission = meta.submission
  }
}

writeFileSync(FILE, JSON.stringify(data))

// 결과 요약
const subs = {}
for (const p of data.pulls) {
  const k = `${p.repoKey}: ${p.cycle ? 'C' + p.cycle + ' ' : ''}${p.submission}${p.step ? ' ' + p.step + '단계' : ''}`
  subs[k] = (subs[k] ?? 0) + 1
}
console.log('제출 단위 분포:')
for (const [k, v] of Object.entries(subs).sort()) console.log(`  ${k}  (${v})`)