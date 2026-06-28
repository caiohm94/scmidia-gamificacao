'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'

interface Props {
  campaignId: string
  userId: string
  currentPhotoUrl?: string | null
  participantName: string
}

export function ParticipantPhotoUpload({ campaignId, userId, currentPhotoUrl, participantName }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_id', userId)
    const res = await fetch(`/api/campaigns/${campaignId}/participants/photo`, { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao enviar foto'); return }
    setPreview(json.photo_url)
    toast.success('Foto atualizada!')
    router.refresh()
  }

  const initial = participantName.charAt(0).toUpperCase()

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Trocar foto"
        style={{ background: 'none', border: 'none', cursor: uploading ? 'wait' : 'pointer', padding: 0, position: 'relative' }}
      >
        {preview ? (
          <img
            src={preview}
            alt={participantName}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#8DB23C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: '#fff',
          }}>
            {initial}
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: uploading ? 1 : 0, transition: 'opacity 0.15s',
        }}
          className="group-hover:opacity-100"
        >
          <Camera size={14} color="#fff" />
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
