import { z } from 'zod'

export const pointSchema = z.object({
  campaign_id: z.string().uuid(),
  user_id: z.string().uuid(),
  scoring_rule_id: z.string().uuid().nullable(),
  points: z.number().int().refine(v => v !== 0, 'Pontos não podem ser zero'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  origin: z.enum(['manual','salesforce','sap']).default('manual'),
})

export type PointInput = z.infer<typeof pointSchema>

export const csvRowSchema = z.object({
  participante: z.string().min(1),
  criterio: z.string().min(1),
  pontos: z.coerce.number().int(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
})

export type CSVRow = z.infer<typeof csvRowSchema>
