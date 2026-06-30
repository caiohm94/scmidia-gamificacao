export default function Loading() {
  const pulse = { background: 'rgba(255,255,255,0.07)', borderRadius: 8, animation: 'ldpulse 1.4s ease-in-out infinite' } as const
  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`@keyframes ldpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      {/* Hero card skeleton */}
      <div style={{ ...pulse, height: 200, borderRadius: '0 1.25rem 1.25rem 1.25rem', marginBottom: '1rem' }} />
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[1,2,3].map(i => <div key={i} style={{ ...pulse, height: 72 }} />)}
      </div>
      {/* Goals */}
      <div style={{ ...pulse, height: 180, borderRadius: '0 1rem 1rem 1rem', marginBottom: '1rem' }} />
      {/* Points */}
      <div style={{ ...pulse, height: 220, borderRadius: '0 1rem 1rem 1rem' }} />
    </div>
  )
}
