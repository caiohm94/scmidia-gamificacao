'use client'
import { useEffect, useRef, useMemo } from 'react'

interface CelebrationEvent {
  user_id: string
  points: number
  rule_name: string
  message: string
  avatar_url?: string
  user_name?: string
}

interface Props {
  event: CelebrationEvent | null
  onDone: () => void
  audioCtxRef: React.RefObject<AudioContext | null>
}

const DURATION_MS = 7000
const COLORS_GOAL = ['#FFDF00', '#8DB23C', '#BACB3A', '#FFFFFF', '#FF6B35', '#FFD700', '#5C7435', '#f0f0f0']
const COLORS_FOUL = ['#ef4444', '#dc2626', '#b91c1c', '#FFFFFF', '#f97316', '#fca5a5', '#7f1d1d', '#fff']

function playVuvuzela(ctx: AudioContext) {
  const t = ctx.currentTime
  const BASE = 233
  const SUSTAIN = 3.0
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t)
  master.gain.linearRampToValueAtTime(0.85, t + 0.04)
  master.gain.setValueAtTime(0.85, t + SUSTAIN)
  master.gain.linearRampToValueAtTime(0, t + SUSTAIN + 0.15)
  master.connect(ctx.destination)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 650
  bp.Q.value = 0.6
  bp.connect(master)
  const voices: Array<{ freq: number; vol: number; type: OscillatorType; delay: number }> = [
    { freq: BASE,       vol: 0.38, type: 'sawtooth', delay: 0 },
    { freq: BASE - 5,   vol: 0.28, type: 'sawtooth', delay: 0.06 },
    { freq: BASE + 7,   vol: 0.22, type: 'sawtooth', delay: 0.12 },
    { freq: BASE - 9,   vol: 0.18, type: 'sawtooth', delay: 0.18 },
    { freq: BASE * 2,   vol: 0.10, type: 'square',   delay: 0 },
    { freq: BASE * 3,   vol: 0.06, type: 'sawtooth', delay: 0 },
  ]
  voices.forEach(v => {
    const osc = ctx.createOscillator()
    osc.type = v.type
    osc.frequency.value = v.freq
    const g = ctx.createGain()
    g.gain.value = v.vol
    osc.connect(g)
    g.connect(bp)
    osc.start(t + v.delay)
    osc.stop(t + SUSTAIN + 0.2)
  })
}

// Apito de árbitro: dois apitos longos como "twiiit — twiiiiit"
function playWhistle(ctx: AudioContext) {
  const t = ctx.currentTime
  const blasts = [
    { start: 0,    dur: 0.50 },
    { start: 0.70, dur: 0.70 },
  ]
  blasts.forEach(({ start, dur }) => {
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, t + start)
    master.gain.linearRampToValueAtTime(0.9, t + start + 0.012)
    master.gain.setValueAtTime(0.9, t + start + dur - 0.06)
    master.gain.linearRampToValueAtTime(0, t + start + dur)
    master.connect(ctx.destination)

    // Fundamental + 2nd harmonic for a bright metallic tone
    const voices = [
      { freq: 2637, vol: 0.6 },
      { freq: 2637 * 2, vol: 0.25 },
      { freq: 2637 * 3, vol: 0.10 },
    ]
    voices.forEach(({ freq, vol }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      // Slight pitch sweep up at attack, down at release (like blowing)
      osc.frequency.setValueAtTime(freq * 0.98, t + start)
      osc.frequency.linearRampToValueAtTime(freq * 1.01, t + start + 0.04)
      osc.frequency.setValueAtTime(freq * 1.01, t + start + dur - 0.07)
      osc.frequency.linearRampToValueAtTime(freq * 0.97, t + start + dur)
      const g = ctx.createGain()
      g.gain.value = vol
      osc.connect(g)
      g.connect(master)
      osc.start(t + start)
      osc.stop(t + start + dur + 0.01)
    })
  })
}

function getOrCreateCtx(ref: React.RefObject<AudioContext | null>): AudioContext | null {
  if (ref.current && ref.current.state !== 'closed') return ref.current
  try {
    const ACtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ref.current = new ACtx()
    return ref.current
  } catch { return null }
}

export function CelebrationOverlay({ event, onDone, audioCtxRef }: Props) {
  const playedRef = useRef(false)
  const isFoul = (event?.points ?? 1) < 0

  const COLORS = isFoul ? COLORS_FOUL : COLORS_GOAL

  const confetti = useMemo(() => Array.from({ length: 72 }, (_, i) => ({
    left: `${((i * 1.388) % 1) * 100}%`,
    delay: `${(i * 0.055) % 2.2}s`,
    duration: `${2.2 + ((i * 0.37) % 1.4)}s`,
    w: `${6 + ((i * 3) % 10)}px`,
    h: `${4 + ((i * 5) % 12)}px`,
    color: COLORS[i % COLORS.length],
    border: i % 5 === 0 ? '50%' : '2px',
    rotate: `${(i * 53) % 360}deg`,
  })), [COLORS])

  useEffect(() => {
    if (!event) { playedRef.current = false; return }

    if (!playedRef.current) {
      playedRef.current = true
      const ctx = getOrCreateCtx(audioCtxRef)
      if (ctx) {
        const play = () => {
          if (event.points < 0) playWhistle(ctx)
          else playVuvuzela(ctx)
        }
        if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {})
        else play()
      }
    }

    const t = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(t)
  }, [event, onDone, audioCtxRef])

  if (!event) return null

  const haloBorder = isFoul ? '#ef4444' : '#FFDF00'
  const haloGlow = isFoul
    ? '0%,100%{box-shadow:0 0 30px 8px rgba(239,68,68,.6),0 0 70px 24px rgba(185,28,28,.3)} 50%{box-shadow:0 0 60px 20px rgba(239,68,68,.9),0 0 120px 50px rgba(185,28,28,.5)}'
    : '0%,100%{box-shadow:0 0 30px 8px rgba(255,223,0,.45),0 0 70px 24px rgba(141,178,60,.25)} 50%{box-shadow:0 0 60px 20px rgba(255,223,0,.7),0 0 120px 50px rgba(141,178,60,.4)}'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isFoul ? 'rgba(20, 3, 3, 0.97)' : 'rgba(3, 8, 4, 0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)',
      animation: 'cel-in 0.2s ease both',
    }}>
      <style>{`
        @keyframes cel-in   { from { opacity:0 } to { opacity:1 } }
        @keyframes gol-pop  { 0%{transform:scale(.25) rotate(-6deg);opacity:0} 65%{transform:scale(1.08) rotate(1deg);opacity:1} 80%{transform:scale(.97)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes photo-in { 0%{transform:scale(.4) translateY(60px);opacity:0} 65%{transform:scale(1.06) translateY(-4px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes name-up  { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pts-pop  { 0%{transform:scale(.6);opacity:0} 70%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes halo     { ${haloGlow} }
        @keyframes fall     { 0%{transform:translateY(-80px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(780deg);opacity:.15} }
        @keyframes trophies { from{transform:scale(.5) translateY(16px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes stripe   { from{background-position:-200% 0} to{background-position:200% 0} }
      `}</style>

      {/* Falling confetti / paper */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {confetti.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', top: -20, left: c.left,
            width: c.w, height: c.h, borderRadius: c.border,
            background: c.color, transform: `rotate(${c.rotate})`,
            animation: `fall ${c.duration} ${c.delay} linear infinite`,
          }} />
        ))}
      </div>

      {/* Top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 5,
        background: isFoul
          ? 'linear-gradient(90deg,#7f1d1d,#ef4444,#f97316,#ef4444,#7f1d1d)'
          : 'linear-gradient(90deg, #5C7435, #8DB23C, #FFDF00, #BACB3A, #FFDF00, #8DB23C, #5C7435)',
        backgroundSize: '200% 100%',
        animation: 'stripe 2s linear infinite',
      }} />

      {/* Header: GOL! or FALTA! */}
      <div style={{
        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
        fontSize: 'clamp(5rem, 11vw, 10rem)',
        color: isFoul ? '#ef4444' : '#FFDF00',
        letterSpacing: '-0.01em', lineHeight: 1,
        textShadow: isFoul
          ? '0 0 80px rgba(239,68,68,.6), 0 4px 24px rgba(0,0,0,.9)'
          : '0 0 80px rgba(255,223,0,.55), 0 4px 24px rgba(0,0,0,.9)',
        animation: 'gol-pop .65s cubic-bezier(.175,.885,.32,1.275) .05s both',
        marginBottom: '1.2rem',
      }}>
        {isFoul ? '🟥 FALTA!' : '⚽ GOL!'}
      </div>

      {/* Photo */}
      <div style={{ animation: 'photo-in .55s cubic-bezier(.175,.885,.32,1.275) .25s both', marginBottom: '1.2rem' }}>
        {event.avatar_url ? (
          <img src={event.avatar_url} alt={event.user_name ?? ''} style={{
            width: 'clamp(160px, 18vw, 280px)',
            height: 'auto',
            display: 'block',
            borderRadius: '0 2rem 2rem 2rem',
            border: `5px solid ${haloBorder}`,
            animation: 'halo 1.6s ease-in-out .5s infinite',
          }} />
        ) : (
          <div style={{
            width: 'clamp(120px, 14vw, 180px)', height: 'clamp(120px, 14vw, 180px)',
            borderRadius: '0 2rem 2rem 2rem',
            background: isFoul ? 'linear-gradient(135deg,#ef4444,#7f1d1d)' : 'linear-gradient(135deg, #8DB23C, #5C7435)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 900, color: '#fff', fontFamily: 'Outfit, sans-serif',
            border: `5px solid ${haloBorder}`,
            animation: 'halo 1.6s ease-in-out .5s infinite',
          }}>
            {event.user_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
        fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
        color: '#fff', textAlign: 'center',
        textShadow: '0 2px 16px rgba(0,0,0,.9)',
        lineHeight: 1.1, marginBottom: '0.5rem',
        animation: 'name-up .4s ease .55s both',
        maxWidth: '80vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {event.user_name ?? event.message}
      </div>

      {/* Rule */}
      {event.rule_name && (
        <div style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 600,
          fontSize: 'clamp(.9rem, 1.8vw, 1.3rem)',
          color: isFoul ? '#f87171' : '#8DB23C', textAlign: 'center',
          letterSpacing: '0.07em', textTransform: 'uppercase',
          animation: 'name-up .4s ease .65s both',
          marginBottom: '1.4rem',
        }}>
          {event.rule_name}
        </div>
      )}

      {/* Points */}
      <div style={{
        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
        fontSize: 'clamp(3rem, 7vw, 5.5rem)',
        color: isFoul ? '#ef4444' : '#FFDF00', lineHeight: 1,
        textShadow: isFoul ? '0 0 60px rgba(239,68,68,.6)' : '0 0 60px rgba(255,223,0,.55)',
        animation: 'pts-pop .5s cubic-bezier(.175,.885,.32,1.275) .75s both',
      }}>
        {event.points > 0 ? '+' : ''}{event.points.toLocaleString('pt-BR')} pts
      </div>

      {/* Footer icons */}
      <div style={{
        marginTop: '1.6rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
        letterSpacing: '0.6rem',
        animation: 'trophies .5s ease 1s both',
      }}>
        {isFoul ? '🟥 📋 🟥' : '🏆 🎊 🏆'}
      </div>

      {/* Countdown bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,.08)' }}>
        <div style={{
          height: '100%',
          background: isFoul ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg, #8DB23C, #FFDF00)',
          transformOrigin: 'left',
          animation: `progressBar ${DURATION_MS}ms linear both`,
        }} />
      </div>
    </div>
  )
}
