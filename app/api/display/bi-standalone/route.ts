import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

// Returns a self-contained HTML file the TV can open locally (file://).
// This bypasses mixed-content restrictions so HTTP BI iframes work fine.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const slug  = searchParams.get('slug')  ?? ''
  const token = searchParams.get('token') ?? ''
  const biUrl = searchParams.get('bi')    ?? ''

  if (!slug || !token) {
    return new NextResponse('slug and token required', { status: 400 })
  }

  // Validate token
  const admin = createAdminClient()
  const { data: camp } = await admin
    .from('campaigns')
    .select('id, display_token')
    .eq('slug', slug)
    .single()

  if (!camp || camp.display_token !== token) {
    return new NextResponse('Invalid token', { status: 401 })
  }

  const campaignId = camp.id
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gamificação — ${slug}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#000;overflow:hidden;width:100vw;height:100vh}
  #bi-frame{position:fixed;inset:0;width:100%;height:100%;border:none}
  #overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(3,8,4,0.95);backdrop-filter:blur(12px);flex-direction:column;align-items:center;justify-content:center}
  #overlay.foul{background:rgba(20,3,3,0.97)}
  #overlay.show{display:flex;animation:cel-in .2s ease both}
  @keyframes cel-in{from{opacity:0}to{opacity:1}}
  @keyframes gol-pop{0%{transform:scale(.25) rotate(-6deg);opacity:0}65%{transform:scale(1.08) rotate(1deg);opacity:1}80%{transform:scale(.97)}100%{transform:scale(1);opacity:1}}
  @keyframes photo-in{0%{transform:scale(.4) translateY(60px);opacity:0}65%{transform:scale(1.06) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes name-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pts-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:1}}
  @keyframes fall{0%{transform:translateY(-80px) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(780deg);opacity:.15}}
  @keyframes stripe{from{background-position:-200% 0}to{background-position:200% 0}}
  @keyframes halo-goal{0%,100%{box-shadow:0 0 30px 8px rgba(255,223,0,.45),0 0 70px 24px rgba(141,178,60,.25)}50%{box-shadow:0 0 60px 20px rgba(255,223,0,.7),0 0 120px 50px rgba(141,178,60,.4)}}
  @keyframes halo-foul{0%,100%{box-shadow:0 0 30px 8px rgba(239,68,68,.6),0 0 70px 24px rgba(185,28,28,.3)}50%{box-shadow:0 0 60px 20px rgba(239,68,68,.9),0 0 120px 50px rgba(185,28,28,.5)}}
  @keyframes trophies{from{transform:scale(.5) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
  @keyframes progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
  #confetti-box{position:absolute;inset:0;overflow:hidden;pointer-events:none}
  #top-stripe{position:absolute;top:0;left:0;right:0;height:5px;background-size:200% 100%;animation:stripe 2s linear infinite}
  #headline{font-family:'Outfit',sans-serif;font-weight:900;font-size:clamp(5rem,11vw,10rem);line-height:1;letter-spacing:-.01em;animation:gol-pop .65s cubic-bezier(.175,.885,.32,1.275) .05s both;margin-bottom:1.2rem}
  #photo-wrap{animation:photo-in .55s cubic-bezier(.175,.885,.32,1.275) .25s both;margin-bottom:1.2rem}
  #photo-wrap img{width:clamp(160px,18vw,280px);height:auto;display:block;border-radius:0 2rem 2rem 2rem;border:5px solid #FFDF00}
  #photo-wrap .initial{width:clamp(120px,14vw,180px);height:clamp(120px,14vw,180px);border-radius:0 2rem 2rem 2rem;background:linear-gradient(135deg,#8DB23C,#5C7435);display:flex;align-items:center;justify-content:center;font-size:clamp(3rem,7vw,6rem);font-weight:900;color:#fff;font-family:'Outfit',sans-serif;border:5px solid #FFDF00}
  #overlay.foul #photo-wrap img,#overlay.foul #photo-wrap .initial{border-color:#ef4444}
  #user-name{font-family:'Outfit',sans-serif;font-weight:900;font-size:clamp(2rem,4.5vw,3.5rem);color:#fff;text-align:center;text-shadow:0 2px 16px rgba(0,0,0,.9);line-height:1.1;margin-bottom:.5rem;animation:name-up .4s ease .55s both;max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #rule-name{font-family:'Outfit',sans-serif;font-weight:600;font-size:clamp(.9rem,1.8vw,1.3rem);text-align:center;letter-spacing:.07em;text-transform:uppercase;animation:name-up .4s ease .65s both;margin-bottom:1.4rem;color:#8DB23C}
  #overlay.foul #rule-name{color:#f87171}
  #points{font-family:'Outfit',sans-serif;font-weight:900;font-size:clamp(3rem,7vw,5.5rem);color:#FFDF00;line-height:1;text-shadow:0 0 60px rgba(255,223,0,.55);animation:pts-pop .5s cubic-bezier(.175,.885,.32,1.275) .75s both}
  #overlay.foul #points{color:#ef4444;text-shadow:0 0 60px rgba(239,68,68,.6)}
  #footer-icons{margin-top:1.6rem;font-size:clamp(1.8rem,3.5vw,2.8rem);letter-spacing:.6rem;animation:trophies .5s ease 1s both}
  #progress-bar-wrap{position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,.08)}
  #progress-bar{height:100%;background:linear-gradient(90deg,#8DB23C,#FFDF00);transform-origin:left;animation:progress 7s linear both}
  #overlay.foul #progress-bar{background:linear-gradient(90deg,#ef4444,#f97316)}
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
</style>
</head>
<body>
<iframe id="bi-frame" src="${biUrl || 'about:blank'}" allow="fullscreen"></iframe>

<!-- Sound unlock overlay: shown until user clicks -->
<div id="sound-unlock" onclick="unlockSound()" style="position:fixed;inset:0;z-index:20000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.82);cursor:pointer;font-family:sans-serif">
  <div style="font-size:4rem;margin-bottom:1rem">🔊</div>
  <div style="color:#fff;font-size:1.4rem;font-weight:700;margin-bottom:.5rem">Clique para ativar o som</div>
  <div style="color:rgba(255,255,255,.5);font-size:.9rem">Toque em qualquer lugar para começar</div>
</div>

<!-- Status bar: connection + queue + test buttons (bottom-right corner) -->
<div id="statusbar" style="position:fixed;bottom:12px;right:12px;z-index:8888;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.55);padding:6px 10px;border-radius:6px;font-family:sans-serif;font-size:11px;color:#fff;backdrop-filter:blur(4px)">
  <span id="conn-dot" style="width:8px;height:8px;border-radius:50%;background:#555;display:inline-block"></span>
  <span id="conn-label">conectando…</span>
  <span id="queue-label" style="display:none;background:#8DB23C;border-radius:4px;padding:1px 6px;font-size:10px">fila: 0</span>
  <button onclick="testCelebration(false)" style="margin-left:6px;padding:2px 8px;font-size:10px;background:#8DB23C;border:none;border-radius:4px;color:#fff;cursor:pointer">⚽ Testar</button>
  <button onclick="testCelebration(true)"  style="padding:2px 8px;font-size:10px;background:#ef4444;border:none;border-radius:4px;color:#fff;cursor:pointer">🟥 Testar</button>
</div>

<div id="overlay">
  <div id="confetti-box"></div>
  <div id="top-stripe"></div>
  <div id="headline"></div>
  <div id="photo-wrap"></div>
  <div id="user-name"></div>
  <div id="rule-name"></div>
  <div id="points"></div>
  <div id="footer-icons"></div>
  <div id="progress-bar-wrap"><div id="progress-bar"></div></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
const SUPABASE_URL  = '${supabaseUrl}'
const SUPABASE_ANON = '${supabaseAnon}'
const CAMPAIGN_ID   = '${campaignId}'
const DURATION_MS   = 7000
const QUEUE_GAP_MS  = 30000

const COLORS_GOAL = ['#FFDF00','#8DB23C','#BACB3A','#FFFFFF','#FF6B35','#FFD700','#5C7435','#f0f0f0']
const COLORS_FOUL = ['#ef4444','#dc2626','#b91c1c','#FFFFFF','#f97316','#fca5a5','#7f1d1d','#fff']

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON)

let audioCtx = null
let dismissTimer = null
let celebQueue = []
let celebBusy = false

function getAudio() {
  if (audioCtx && audioCtx.state !== 'closed') return audioCtx
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch(e) {}
  return audioCtx
}

function unlockSound() {
  const ctx = getAudio()
  if (ctx) ctx.resume().catch(()=>{})
  document.getElementById('sound-unlock').style.display = 'none'
}

function updateQueueLabel() {
  const el = document.getElementById('queue-label')
  if (!el) return
  if (celebQueue.length > 0) { el.style.display = 'inline'; el.textContent = 'fila: ' + celebQueue.length }
  else { el.style.display = 'none' }
}

function playVuvuzela(ctx) {
  const t = ctx.currentTime, BASE = 233, SUSTAIN = 3.0
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t)
  master.gain.linearRampToValueAtTime(0.85, t + 0.04)
  master.gain.setValueAtTime(0.85, t + SUSTAIN)
  master.gain.linearRampToValueAtTime(0, t + SUSTAIN + 0.15)
  master.connect(ctx.destination)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6; bp.connect(master)
  [[BASE,.38,'sawtooth',0],[BASE-5,.28,'sawtooth',.06],[BASE+7,.22,'sawtooth',.12],[BASE-9,.18,'sawtooth',.18],[BASE*2,.10,'square',0],[BASE*3,.06,'sawtooth',0]].forEach(([f,v,type,d]) => {
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = f
    const g = ctx.createGain(); g.gain.value = v; osc.connect(g); g.connect(bp)
    osc.start(t + d); osc.stop(t + SUSTAIN + 0.2)
  })
}

function playWhistle(ctx) {
  const t = ctx.currentTime
  [[0,.50],[0.70,.70]].forEach(([start, dur]) => {
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, t+start)
    master.gain.linearRampToValueAtTime(0.9, t+start+0.012)
    master.gain.setValueAtTime(0.9, t+start+dur-0.06)
    master.gain.linearRampToValueAtTime(0, t+start+dur)
    master.connect(ctx.destination)
    [[2637,.6],[2637*2,.25],[2637*3,.10]].forEach(([freq,vol]) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'
      osc.frequency.setValueAtTime(freq*.98, t+start)
      osc.frequency.linearRampToValueAtTime(freq*1.01, t+start+0.04)
      osc.frequency.setValueAtTime(freq*1.01, t+start+dur-0.07)
      osc.frequency.linearRampToValueAtTime(freq*.97, t+start+dur)
      const g = ctx.createGain(); g.gain.value = vol; osc.connect(g); g.connect(master)
      osc.start(t+start); osc.stop(t+start+dur+0.01)
    })
  })
}

function spawnConfetti(isFoul) {
  const box = document.getElementById('confetti-box')
  box.innerHTML = ''
  const colors = isFoul ? COLORS_FOUL : COLORS_GOAL
  for (let i = 0; i < 72; i++) {
    const d = document.createElement('div')
    const w = 6 + ((i * 3) % 10), h = 4 + ((i * 5) % 12)
    d.style.cssText = \`position:absolute;top:-20px;left:\${((i*1.388)%1)*100}%;width:\${w}px;height:\${h}px;border-radius:\${i%5===0?'50%':'2px'};background:\${colors[i%colors.length]};transform:rotate(\${(i*53)%360}deg);animation:fall \${2.2+((i*.37)%1.4)}s \${(i*.055)%2.2}s linear infinite\`
    box.appendChild(d)
  }
}

function showCelebration(ev) {
  if (dismissTimer) clearTimeout(dismissTimer)

  const isFoul = ev.points < 0
  const overlay = document.getElementById('overlay')
  overlay.className = isFoul ? 'foul' : ''

  // Stripe color
  document.getElementById('top-stripe').style.background = isFoul
    ? 'linear-gradient(90deg,#7f1d1d,#ef4444,#f97316,#ef4444,#7f1d1d)'
    : 'linear-gradient(90deg,#5C7435,#8DB23C,#FFDF00,#BACB3A,#FFDF00,#8DB23C,#5C7435)'

  document.getElementById('headline').textContent = isFoul ? '🟥 FALTA!' : '⚽ GOL!'
  document.getElementById('headline').style.color = isFoul ? '#ef4444' : '#FFDF00'
  document.getElementById('headline').style.textShadow = isFoul
    ? '0 0 80px rgba(239,68,68,.6),0 4px 24px rgba(0,0,0,.9)'
    : '0 0 80px rgba(255,223,0,.55),0 4px 24px rgba(0,0,0,.9)'

  const photoWrap = document.getElementById('photo-wrap')
  if (ev.avatar_url) {
    photoWrap.innerHTML = \`<img src="\${ev.avatar_url}" alt="\${ev.user_name||''}">\`
  } else {
    photoWrap.innerHTML = \`<div class="initial">\${(ev.user_name||'?')[0].toUpperCase()}</div>\`
  }

  document.getElementById('user-name').textContent = ev.user_name || ev.message || ''
  document.getElementById('rule-name').textContent = ev.rule_name || ''
  document.getElementById('points').textContent = (ev.points > 0 ? '+' : '') + ev.points.toLocaleString('pt-BR') + ' pts'
  document.getElementById('footer-icons').textContent = isFoul ? '🟥 📋 🟥' : '🏆 🎊 🏆'

  // Reset progress bar
  const bar = document.getElementById('progress-bar')
  bar.style.animation = 'none'
  bar.offsetHeight // reflow
  bar.style.animation = \`progress \${DURATION_MS}ms linear both\`

  spawnConfetti(isFoul)
  overlay.classList.add('show')

  // Sound
  const ctx = getAudio()
  if (ctx) {
    const play = () => isFoul ? playWhistle(ctx) : playVuvuzela(ctx)
    ctx.state === 'suspended' ? ctx.resume().then(play).catch(()=>{}) : play()
  }

  dismissTimer = setTimeout(() => {
    overlay.classList.remove('show')
    overlay.className = overlay.className.replace('show','').trim()
    celebBusy = true
    setTimeout(() => {
      celebBusy = false
      if (celebQueue.length > 0) {
        const next = celebQueue.shift()
        updateQueueLabel()
        showCelebration(next)
      }
    }, QUEUE_GAP_MS)
  }, DURATION_MS)
}

function enqueueCelebration(ev) {
  if (!celebBusy && celebQueue.length === 0) {
    showCelebration(ev)
  } else {
    celebQueue.push(ev)
    updateQueueLabel()
  }
}

// Test function (buttons in status bar)
function testCelebration(isFoul) {
  enqueueCelebration({
    user_id: 'test',
    points: isFoul ? -10 : 50,
    rule_name: isFoul ? 'Falta' : 'Ligação Realizada',
    message: isFoul ? 'Teste falta' : 'Teste gol',
    user_name: 'Participante Teste',
    avatar_url: null
  })
}

// Subscribe to celebration events
function setConnStatus(state) {
  const dot = document.getElementById('conn-dot')
  const label = document.getElementById('conn-label')
  if (!dot || !label) return
  const map = {
    SUBSCRIBED:   ['#8DB23C', 'conectado'],
    CHANNEL_ERROR:['#ef4444', 'erro'],
    TIMED_OUT:    ['#f97316', 'timeout'],
    CLOSED:       ['#555',    'desconectado'],
  }
  const [color, text] = map[state] || ['#f59e0b', state.toLowerCase()]
  dot.style.background = color
  label.textContent = text
}

sb.channel('bi-overlay-' + CAMPAIGN_ID)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'celebration_events',
    filter: 'campaign_id=eq.' + CAMPAIGN_ID
  }, async (payload) => {
    const ev = payload.new
    const [uRes, cpRes] = await Promise.all([
      sb.from('users').select('name').eq('id', ev.user_id).single(),
      sb.from('campaign_participants').select('photo_url').eq('user_id', ev.user_id).eq('campaign_id', CAMPAIGN_ID).single()
    ])
    enqueueCelebration({
      ...ev,
      user_name: uRes.data?.name,
      avatar_url: cpRes.data?.photo_url || undefined
    })
  })
  .subscribe((status) => setConnStatus(status))
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="gamificacao-${slug}.html"`,
      'Cache-Control': 'no-store',
    },
  })
}
