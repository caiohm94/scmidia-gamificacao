export default function Loading() {
  const pulse = { background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'ldpulse 1.4s ease-in-out infinite' } as const
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`@keyframes ldpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{ ...pulse, height: 32, width: '40%' }} />
      {[1,2,3].map(i => <div key={i} style={{ ...pulse, height: 220, borderRadius: '0 1rem 1rem 1rem' }} />)}
    </div>
  )
}
