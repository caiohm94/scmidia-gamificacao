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
const COLORS = ['#FFDF00', '#8DB23C', '#BACB3A', '#FFFFFF', '#FF6B35', '#FFD700', '#5C7435', '#f0f0f0']

function playGoalSound(ctx: AudioContext) {
  const t = ctx.currentTime

  // Air horn stab
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.45)
  oscGain.gain.setValueAtTime(0.55, t)
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.5)

  // Crowd roar — bandpass-filtered noise
  const bufLen = Math.floor(ctx.sampleRate * 4)
  const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900
  bp.Q.value = 0.7

  const ls = ctx.createBiquadFilter()
  ls.type = 'lowshelf'
  ls.frequency.value = 400
  ls.gain.value = 10

  const gn = ctx.createGain()
  gn.gain.setValueAtTime(0, t + 0.1)
  gn.gain.linearRampToValueAtTime(0.55, t + 0.6)
  gn.gain.setValueAtTime(0.55, t + 2.0)
  gn.gain.linearRampToValueAtTime(0, t + 4.0)

  noise.connect(bp)
  bp.connect(ls)
  ls.connect(gn)
  gn.connect(ctx.destination)
  noise.start(t + 0.1)
}

export function CelebrationOverlay({ event, onDone, audioCtxRef }: Props) {
  const playedRef = useRef(false)

  // Fixed confetti layout — generated once, deterministic
  const confetti = useMemo(() => Array.from({ length: 72 }, (_, i) => ({
    left: `${((i * 1.388) % 1) * 100}%`,
    delay: `${(i * 0.055) % 2.2}s`,
    duration: `${2.2 + ((i * 0.37) % 1.4)}s`,
    w: `${6 + ((i * 3) % 10)}px`,
    h: `${4 + ((i * 5) % 12)}px`,
    color: COLORS[i % COLORS.length],
    border: i % 5 === 0 ? '50%' : '2px',
    rotate: `${(i * 53) % 360}deg`,
  })), [])

  useEffect(() => {
    if (!event) { playedRef.current = false; return }
    if (!playedRef.current && audioCtxRef.current) {
      playedRef.current = true
      playGoalSound(audioCtxRef.current)
    }
    const t = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(t)
  }, [event, onDone, audioCtxRef])

  if (!event) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(3, 8, 4, 0.95)',
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
        @keyframes halo     { 0%,100%{box-shadow:0 0 30px 8px rgba(255,223,0,.45),0 0 70px 24px rgba(141,178,60,.25)} 50%{box-shadow:0 0 60px 20px rgba(255,223,0,.7),0 0 120px 50px rgba(141,178,60,.4)} }
        @keyframes fall     { 0%{transform:translateY(-80px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(780deg);opacity:.15} }
        @keyframes trophies { from{transform:scale(.5) translateY(16px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes stripe   { from{background-position:-200% 0} to{background-position:200% 0} }
      `}</style>

      {/* Falling confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {confetti.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', top: -20, left: c.left,
            width: c.w, height: c.h,
            borderRadius: c.border,
            background: c.color,
            transform: `rotate(${c.rotate})`,
            animation: `fall ${c.duration} ${c.delay} linear infinite`,
          }} />
        ))}
      </div>

      {/* Animated top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 5,
        background: 'linear-gradient(90deg, #5C7435, #8DB23C, #FFDF00, #BACB3A, #FFDF00, #8DB23C, #5C7435)',
        backgroundSize: '200% 100%',
        animation: 'stripe 2s linear infinite',
      }} />

      {/* GOL! */}
      <div style={{
        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
        fontSize: 'clamp(5rem, 11vw, 10rem)',
        color: '#FFDF00', letterSpacing: '-0.01em', lineHeight: 1,
        textShadow: '0 0 80px rgba(255,223,0,.55), 0 4px 24px rgba(0,0,0,.9)',
        animation: 'gol-pop .65s cubic-bezier(.175,.885,.32,1.275) .05s both',
        marginBottom: '1.2rem',
      }}>
        ⚽ GOL!
      </div>

      {/* Photo */}
      <div style={{ animation: 'photo-in .55s cubic-bezier(.175,.885,.32,1.275) .25s both', marginBottom: '1.2rem' }}>
        {event.avatar_url ? (
          <img
            src={event.avatar_url}
            alt={event.user_name ?? ''}
            style={{
              width: 'clamp(120px, 14vw, 180px)',
              height: 'clamp(120px, 14vw, 180px)',
              borderRadius: '0 2rem 2rem 2rem',
              objectFit: 'cover',
              border: '5px solid #FFDF00',
              display: 'block',
              animation: 'halo 1.6s ease-in-out .5s infinite',
            }}
          />
        ) : (
          <div style={{
            width: 'clamp(120px, 14vw, 180px)',
            height: 'clamp(120px, 14vw, 180px)',
            borderRadius: '0 2rem 2rem 2rem',
            background: 'linear-gradient(135deg, #8DB23C, #5C7435)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 900, color: '#fff',
            fontFamily: 'Outfit, sans-serif',
            border: '5px solid #FFDF00',
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
          color: '#8DB23C', textAlign: 'center',
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
        color: '#FFDF00', lineHeight: 1,
        textShadow: '0 0 60px rgba(255,223,0,.55)',
        animation: 'pts-pop .5s cubic-bezier(.175,.885,.32,1.275) .75s both',
      }}>
        +{event.points.toLocaleString('pt-BR')} pts
      </div>

      {/* Trophies */}
      <div style={{
        marginTop: '1.6rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
        letterSpacing: '0.6rem',
        animation: 'trophies .5s ease 1s both',
      }}>
        🏆 🎊 🏆
      </div>

      {/* Countdown bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,.08)' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #8DB23C, #FFDF00)',
          transformOrigin: 'left',
          animation: `progressBar ${DURATION_MS}ms linear both`,
        }} />
      </div>
    </div>
  )
}
