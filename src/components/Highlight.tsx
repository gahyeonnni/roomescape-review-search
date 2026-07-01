interface Props {
  text: string
  terms?: string[]
}

/** terms 에 해당하는 부분을 <mark> 로 강조 (대소문자 무시) */
export function Highlight({ text, terms }: Props) {
  const cleaned = (terms ?? []).filter(Boolean)
  if (cleaned.length === 0) return <>{text}</>
  const escaped = cleaned.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const lowered = new Set(cleaned.map((t) => t.toLowerCase()))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        lowered.has(part.toLowerCase()) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  )
}