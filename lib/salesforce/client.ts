import { Connection } from 'jsforce'

let cachedConn: Connection | null = null
let connExpiresAt = 0

export async function getSalesforceConnection(): Promise<Connection> {
  if (cachedConn && Date.now() < connExpiresAt) return cachedConn

  const instanceUrl = process.env.SFDC_INSTANCE_URL!
  const tokenRes = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SFDC_CLIENT_ID!,
      client_secret: process.env.SFDC_CLIENT_SECRET!,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Salesforce auth failed: ${err}`)
  }

  const { access_token, instance_url } = await tokenRes.json() as { access_token: string; instance_url: string }

  cachedConn = new Connection({
    instanceUrl: instance_url,
    accessToken: access_token,
  })
  connExpiresAt = Date.now() + 55 * 60 * 1000 // 55 min
  return cachedConn
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
