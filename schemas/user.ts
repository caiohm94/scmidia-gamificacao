import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['manager', 'participant']),
  team_id: z.string().uuid().nullable(),
  function: z.enum(['internal_seller','external_seller','hunter','manager','auditor']),
  status: z.enum(['active','inactive']),
  sf_alias: z.string().nullable().optional(),
})

export type UserInput = z.infer<typeof userSchema>
