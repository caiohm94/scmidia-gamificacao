import { z } from 'zod'

export const campaignSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  rules: z.string().optional(),
  prizes: z.string().optional(),
  status: z.enum(['draft','active','closed']),
  starts_at: z.string().datetime().nullable(),
  ends_at: z.string().datetime().nullable(),
  theme: z.record(z.string(), z.unknown()).default({}),
})

export type CampaignInput = z.infer<typeof campaignSchema>
