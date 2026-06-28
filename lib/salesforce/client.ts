import { Connection } from 'jsforce'

let cachedConn: Connection | null = null
let connExpiresAt = 0

export async function getSalesforceConnection(): Promise<Connection> {
  if (cachedConn && Date.now() < connExpiresAt) return cachedConn

  const conn = new Connection({
    instanceUrl: process.env.SFDC_INSTANCE_URL,
    oauth2: {
      clientId: process.env.SFDC_CLIENT_ID!,
      clientSecret: process.env.SFDC_CLIENT_SECRET!,
      redirectUri: 'https://localhost',
    },
  })

  await conn.login(process.env.SFDC_USERNAME!, process.env.SFDC_PASSWORD!)

  cachedConn = conn
  connExpiresAt = Date.now() + 55 * 60 * 1000 // 55 min (token dura 2h no SF)
  return conn
}

export async function executeSoql(
  conn: Connection,
  soql: string
): Promise<Record<string, unknown>[]> {
  const result = await conn.query(soql)
  return (result.records ?? []) as Record<string, unknown>[]
}

export async function testConnection(): Promise<{ ok: boolean; orgName?: string; error?: string }> {
  try {
    const conn = await getSalesforceConnection()
    const result = await conn.query<{ Name: string }>('SELECT Name FROM Organization LIMIT 1')
    return { ok: true, orgName: result.records[0]?.Name }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
