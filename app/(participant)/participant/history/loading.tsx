export default function Loading() {
  const pulse = { background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'ldpulse 1.4s ease-in-out infinite' } as const
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <style>{`@keyframes ldpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{ ...pulse, height: 36, width: '40%', marginBottom: '0.5rem' }} />
      {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ ...pulse, height: 44, borderRadius: '0 0.4rem 0.4rem 0.4rem' }} />)}
    </div>
  )
}
