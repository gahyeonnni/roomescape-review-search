import type { Comment, Pull } from './types'

export function stepLabel(step: number | null): string {
  return step == null ? '' : `${step}단계`
}

export function cycleLabel(cycle: number | null): string {
  return cycle == null ? '' : `사이클 ${cycle}`
}

/** 세부 미션명(제목의 미션 설명). 없으면 레포 이름으로 대체. */
export function submissionName(c: Comment | Pull): string {
  return c.submission || c.mission
}

/** "테마 + 사용자 예약 · 2단계" 처럼 읽기 좋은 라벨. '단계 미상' 같은 표기를 쓰지 않는다. */
export function missionLabel(c: Comment | Pull): string {
  const parts = [submissionName(c)]
  if (c.step != null) parts.push(`${c.step}단계`)
  return parts.join(' · ')
}

export function shortDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 코드 경로에서 파일명만 */
export function baseName(path: string | null): string {
  if (!path) return ''
  const parts = path.split('/')
  return parts[parts.length - 1]
}