import { useEffect, useState } from 'react'

// 해시 기반 라우터 (GitHub Pages 정적 호스팅에서 새로고침/딥링크 안전)
// 경로 예: #/  #/person/gahyeonnni  #/concept?q=의존성  #/similar/<commentId>

export interface Route {
  path: string
  params: URLSearchParams
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = hash.split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(to: string) {
  window.location.hash = to
}

export function personPath(login: string) {
  return `#/person/${encodeURIComponent(login)}`
}

export function conceptPath(q: string) {
  return `#/concept?q=${encodeURIComponent(q)}`
}

export function similarPath(commentId: string) {
  return `#/similar/${encodeURIComponent(commentId)}`
}

export function missionPath(key: string) {
  return `#/mission/${encodeURIComponent(key)}`
}