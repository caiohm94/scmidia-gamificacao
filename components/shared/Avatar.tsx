import Image from 'next/image'

interface Props { src?: string | null; name: string; size?: number; className?: string }

export function Avatar({ src, name, size = 40, className = '' }: Props) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (src) {
    return <Image src={src} alt={name} width={size} height={size}
      className={`rounded-full object-cover ${className}`} />
  }
  return (
    <div
      className={`rounded-full bg-yellow-500 text-black font-bold flex items-center justify-center ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}
