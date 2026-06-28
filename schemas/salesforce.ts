import { z } from 'zod'

export const salesforceRuleFieldsSchema = z.object({
  data_origin: z.enum(['manual', 'salesforce']).default('manual'),
  sf_soql: z.string().min(10, 'SOQL muito curta').nullable().optional(),
  sf_value_field: z.string().min(1).nullable().optional(),
  sf_alias_field: z.string().default('Alias'),
  sf_frequency: z.enum(['5min', 'daily', 'weekly']).nullable().optional(),
  sf_run_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  sf_run_day: z.number().int().min(0).max(6).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.data_origin === 'salesforce') {
    if (!data.sf_soql) ctx.addIssue({ code: 'custom', path: ['sf_soql'], message: 'SOQL obrigatória quando origem é Salesforce' })
    if (!data.sf_value_field) ctx.addIssue({ code: 'custom', path: ['sf_value_field'], message: 'Campo de valor obrigatório' })
    if (!data.sf_frequency) ctx.addIssue({ code: 'custom', path: ['sf_frequency'], message: 'Frequência obrigatória' })
    if (data.sf_frequency === 'daily' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência diária' })
    if (data.sf_frequency === 'weekly' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência semanal' })
    if (data.sf_frequency === 'weekly' && data.sf_run_day == null) ctx.addIssue({ code: 'custom', path: ['sf_run_day'], message: 'Dia da semana obrigatório para frequência semanal' })
  }
})

export type SalesforceRuleFields = z.infer<typeof salesforceRuleFieldsSchema>
