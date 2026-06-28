'use client'

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="sc-signout-btn"
        style={{
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', background: 'none',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
          padding: '0.25rem 0.65rem', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
        }}
      >
        Sair
      </button>
    </form>
  )
}
