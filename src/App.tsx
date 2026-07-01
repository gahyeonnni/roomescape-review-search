import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadDataset, buildPeople } from './lib/data'
import { buildIndex } from './lib/search'
import { AppDataContext, type AppData } from './lib/appData'
import { useRoute, navigate } from './lib/router'
import { SearchBar } from './components/SearchBar'
import { Home } from './components/Home'
import { PersonView } from './components/PersonView'
import { ConceptView } from './components/ConceptView'
import { SimilarView } from './components/SimilarView'
import { MissionView } from './components/MissionView'

export function App() {
  const [app, setApp] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const route = useRoute()

  useEffect(() => {
    loadDataset()
      .then((data) => {
        const people = buildPeople(data)
        const index = buildIndex(data.comments)
        const commentsById = new Map(data.comments.map((c) => [c.id, c]))
        setApp({ data, people, index, commentsById })
      })
      .catch((e) => setError(String(e.message ?? e)))
  }, [])

  const generatedAt = useMemo(
    () => (app ? new Date(app.data.generatedAt).toLocaleString('ko-KR') : ''),
    [app],
  )

  if (error) {
    return (
      <div className="loading">
        <h1>😕 데이터를 불러오지 못했어요</h1>
        <p className="mono">{error}</p>
        <p>
          <code>npm run collect</code> 로 <code>public/data/reviews.json</code> 을 먼저 생성하세요.
        </p>
      </div>
    )
  }
  if (!app) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>리뷰 데이터를 불러오는 중…</p>
      </div>
    )
  }

  return (
    <AppDataContext.Provider value={app}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('#/')}>
          🔑 방탈출 리뷰 검색
        </button>
        <SearchBar />
      </header>

      <main className="content">{renderRoute(route.path, route.params)}</main>

      <footer className="sitefoot">
        우아한테크코스 {app.data.year}기 · PR {app.data.pulls.length.toLocaleString()}개 · 코멘트{' '}
        {app.data.comments.length.toLocaleString()}개 · 데이터 {generatedAt} 기준
      </footer>
    </AppDataContext.Provider>
  )
}

function renderRoute(path: string, params: URLSearchParams) {
  if (path.startsWith('/person/')) {
    return <PersonView login={decodeURIComponent(path.slice('/person/'.length))} />
  }
  if (path.startsWith('/similar/')) {
    return <SimilarView commentId={decodeURIComponent(path.slice('/similar/'.length))} />
  }
  if (path.startsWith('/mission/')) {
    return <MissionView missionKey={decodeURIComponent(path.slice('/mission/'.length))} />
  }
  if (path === '/concept') {
    return <ConceptView query={params.get('q') ?? ''} />
  }
  return <Home />
}