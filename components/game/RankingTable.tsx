import { Avatar } from '@/components/shared/Avatar'
import { StreakBadge } from '@/components/game/StreakBadge'
import type { CampaignRanking } from '@/types/database'

interface Props { rows: CampaignRanking[]; highlightUserId?: string }

const fnLabel: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
}

const medalColors = [
  { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#7a4f00', shadow: 'rgba(255,215,0,0.35)' },
  { bg: 'linear-gradient(135deg, #C0C0C0 0%, #9E9E9E 100%)', text: '#3a3a3a', shadow: 'rgba(192,192,192,0.35)' },
  { bg: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)', text: '#fff', shadow: 'rgba(205,127,50,0.35)' },
]

export function RankingTable({ rows, highlightUserId }: Props) {
  if (rows.length === 0) {
    return (
      <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum participante no ranking ainda.</p>
      </div>
    )
  }

  const topThree = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top 3 podium cards */}
      {topThree.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {topThree.map((row, i) => {
            const medal = medalColors[i]
            const isHighlight = row.user_id === highlightUserId
            return (
              <div key={row.user_id} style={{
                background: '#fff',
                border: isHighlight ? '2px solid #8DB23C' : '1px solid rgba(63,62,62,0.1)',
                borderRadius: '0 1rem 1rem 1rem',
                overflow: 'hidden',
                boxShadow: `0 4px 20px ${medal.shadow}`,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Full photo — no crop */}
                <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
                  {row.avatar_url ? (
                    <img
                      src={row.avatar_url}
                      alt={row.name ?? ''}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', fontWeight: 800, color: '#8DB23C', fontFamily: 'var(--font-outfit)' }}>
                      {row.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: '0.6rem', left: '50%', transform: 'translateX(-50%)',
                    background: medal.bg, color: medal.text,
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800, boxShadow: `0 2px 10px ${medal.shadow}`,
                    fontFamily: 'var(--font-outfit)',
                  }}>
                    {i + 1}
                  </div>
                </div>

                {/* Details below photo */}
                <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3F3E3E', fontFamily: 'var(--font-outfit)', lineHeight: 1.2, textAlign: 'center', margin: 0 }}>
                    {row.name || '—'}
                  </p>
                  {row.function && (
                    <p style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.45)', margin: 0 }}>
                      {fnLabel[row.function] ?? row.function}
                    </p>
                  )}
                  {row.team_name && (
                    <span style={{
                      fontSize: '0.65rem', padding: '0.1rem 0.45rem',
                      borderRadius: '0 0.25rem 0.25rem 0.25rem',
                      background: (row.team_color ?? '#8DB23C') + '20',
                      color: row.team_color ?? '#8DB23C', fontWeight: 600,
                    }}>
                      {row.team_name}
                    </span>
                  )}
                  <div style={{ background: 'rgba(141,178,60,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.3rem 0.75rem', textAlign: 'center', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#5C7435', fontFamily: 'var(--font-outfit)' }}>
                      {row.total_points.toLocaleString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(63,62,62,0.4)', marginLeft: '0.2rem' }}>pts</span>
                  </div>
                  {row.current_streak > 0 && <StreakBadge streak={row.current_streak} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remaining rows as a table */}
      {rest.length > 0 && (
        <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: 'rgba(63,62,62,0.025)' }}>
                {['#', 'Participante', 'Time', 'Pontos', 'Sequência'].map(h => (
                  <th key={h} style={{
                    padding: '0.55rem 1rem', textAlign: h === 'Pontos' || h === 'Sequência' ? 'right' : 'left',
                    fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)',
                    borderBottom: '1px solid rgba(63,62,62,0.07)', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-outfit)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row) => (
                <tr key={row.user_id} style={{
                  borderTop: '1px solid rgba(63,62,62,0.06)',
                  background: row.user_id === highlightUserId ? 'rgba(141,178,60,0.05)' : undefined,
                }}>
                  <td style={{ padding: '0.7rem 1rem', width: 44 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(63,62,62,0.07)',
                      fontSize: '0.72rem', fontWeight: 700, color: 'rgba(63,62,62,0.5)',
                    }}>
                      {row.position}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Avatar src={row.avatar_url} name={row.name} size={32} />
                      <div>
                        <p style={{ fontWeight: 600, color: '#3F3E3E', lineHeight: 1.2 }}>{row.name || '—'}</p>
                        {row.function && (
                          <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.1rem' }}>
                            {fnLabel[row.function] ?? row.function}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    {row.team_name && (
                      <span style={{
                        fontSize: '0.68rem', padding: '0.15rem 0.45rem',
                        borderRadius: '0 0.25rem 0.25rem 0.25rem',
                        background: (row.team_color ?? '#8DB23C') + '20',
                        color: row.team_color ?? '#8DB23C', fontWeight: 600,
                      }}>
                        {row.team_name}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#5C7435' }}>
                      {row.total_points.toLocaleString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(63,62,62,0.4)', marginLeft: '0.2rem' }}>pts</span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right' }}>
                    {row.current_streak > 0 ? <StreakBadge streak={row.current_streak} /> : <span style={{ color: 'rgba(63,62,62,0.25)', fontSize: '0.75rem' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
