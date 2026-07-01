import { useMemo, useState } from 'react'
import { useAppData } from '../lib/appData'
import { displayName } from '../lib/data'
import type { Comment, Pull } from '../lib/types'
import { missionLabel, submissionName } from '../lib/format'
import { navigate } from '../lib/router'
import { CommentCard } from './CommentCard'

type Tab = 'reviewer' | 'crew'

export function PersonView({ login }: { login: string }) {
  const { data, people } = useAppData()
  const person = people.get(login)
  const repoOrder = useMemo(
    () => new Map(data.missions.map((m, i) => [m.key, i])),
    [data.missions],
  )

  const given = useMemo(
    () => data.comments.filter((c) => c.reviewer === login && c.prAuthor !== login),
    [data, login],
  )
  const received = useMemo(
    () => data.comments.filter((c) => c.prAuthor === login && c.reviewer !== login),
    [data, login],
  )
  const myPulls = useMemo(
    () => data.pulls.filter((p) => p.author === login).sort(sorter(repoOrder)),
    [data, login, repoOrder],
  )

  const [tab, setTab] = useState<Tab>(given.length >= received.length ? 'reviewer' : 'crew')

  if (!person) {
    return (
      <div className="view">
        <p className="empty">‘{login}’ 에 대한 데이터가 없습니다.</p>
        <button className="btn-ghost" onClick={() => navigate('#/')}>← 홈으로</button>
      </div>
    )
  }

  const active = tab === 'reviewer' ? given : received

  return (
    <div className="view">
      <div className="person-header">
        <h1>{displayName(person.login, person.nickname)}</h1>
        <div className="stats">
          <span><b>{given.length}</b>리뷰 작성</span>
          <span><b>{received.length}</b>받은 리뷰</span>
          <span><b>{myPulls.length}</b>제출 PR</span>
        </div>
        <a className="link" href={`https://github.com/${login}`} target="_blank" rel="noreferrer">
          @{login} GitHub ↗
        </a>
      </div>

      {myPulls.length > 0 && (
        <section className="submitted">
          <h2 className="section-title">제출한 미션 <span className="badge">{myPulls.length}</span></h2>
          <div className="pr-rows">
            {myPulls.map((p) => (
              <a key={`${p.repoKey}-${p.number}`} className="pr-row" href={p.url} target="_blank" rel="noreferrer">
                {p.cycle != null && <span className="cycle-tag">사이클 {p.cycle}</span>}
                <span className="pr-mission">{missionLabel(p)}</span>
                <span className="pr-repo">{p.mission}</span>
                <span className="pr-num">#{p.number} ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="tabs">
        <button className={tab === 'reviewer' ? 'tab on' : 'tab'} onClick={() => setTab('reviewer')}>
          리뷰어로서 남긴 리뷰 ({given.length})
        </button>
        <button className={tab === 'crew' ? 'tab on' : 'tab'} onClick={() => setTab('crew')}>
          크루로서 받은 리뷰 ({received.length})
        </button>
      </div>

      <GroupedComments comments={active} reviewerMode={tab === 'reviewer'} repoOrder={repoOrder} />
    </div>
  )
}

function sorter(repoOrder: Map<string, number>) {
  return (a: Pull, b: Pull) => {
    const ro = (repoOrder.get(a.repoKey) ?? 9) - (repoOrder.get(b.repoKey) ?? 9)
    if (ro !== 0) return ro
    if ((a.cycle ?? 9) !== (b.cycle ?? 9)) return (a.cycle ?? 9) - (b.cycle ?? 9)
    return (a.step ?? 0) - (b.step ?? 0)
  }
}

interface Group {
  key: string
  repoKey: string
  mission: string
  cycle: number | null
  label: string
  list: Comment[]
}

function GroupedComments({
  comments,
  reviewerMode,
  repoOrder,
}: {
  comments: Comment[]
  reviewerMode: boolean
  repoOrder: Map<string, number>
}) {
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const c of comments) {
      const key = `${c.repoKey}|${submissionName(c)}|${c.step ?? ''}`
      let g = map.get(key)
      if (!g) {
        g = {
          key,
          repoKey: c.repoKey,
          mission: c.mission,
          cycle: c.cycle,
          label: missionLabel(c),
          list: [],
        }
        map.set(key, g)
      }
      g.list.push(c)
    }
    return [...map.values()].sort((a, b) => {
      const ro = (repoOrder.get(a.repoKey) ?? 9) - (repoOrder.get(b.repoKey) ?? 9)
      if (ro !== 0) return ro
      return (a.cycle ?? 9) - (b.cycle ?? 9) || a.label.localeCompare(b.label)
    })
  }, [comments, repoOrder])

  if (comments.length === 0) return <p className="empty">해당하는 리뷰가 없습니다.</p>

  return (
    <div className="groups">
      {groups.map((g) => (
        <section key={g.key} className="group">
          <div className="group-title">
            {g.cycle != null && <span className="cycle-tag">사이클 {g.cycle}</span>}
            <span className="group-mission">{g.label}</span>
            <span className="group-repo">{g.mission}</span>
            <span className="count">{g.list.length}</span>
          </div>
          <div className="comment-list">
            {g.list.map((c) => (
              <CommentCard key={c.id} comment={c} showReviewer={!reviewerMode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}