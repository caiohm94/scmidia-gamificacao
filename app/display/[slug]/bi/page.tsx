import { Suspense } from 'react'
import { BIOverlayClient } from './BIOverlayClient'

export default function BIOverlayPage() {
  return (
    <Suspense>
      <BIOverlayClient />
    </Suspense>
  )
}
