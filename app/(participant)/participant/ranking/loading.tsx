export default function Loading() {
  const pulse = { background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'ldpulse 1.4s ease-in-out infinite' } as const
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <style>{`@keyframes ldpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{ ...pulse, height: 36, width: '50%' }} />
      {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ ...pulse, height: 56, borderRadius: '0 0.5rem 0.5rem 0.5rem' }} />)}
    </div>
  )
}
