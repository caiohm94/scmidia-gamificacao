import { describe, it, expect } from 'vitest'

function resolveDestination(role: string | undefined) {
  return role === 'manager' ? '/manager/dashboard' : '/participant/dashboard'
}

describe('auth redirect logic', () => {
  it('redirects manager to manager dashboard', () => {
    expect(resolveDestination('manager')).toBe('/manager/dashboard')
  })
  it('redirects participant to participant dashboard', () => {
    expect(resolveDestination('participant')).toBe('/participant/dashboard')
  })
  it('redirects unknown role to participant dashboard', () => {
    expect(resolveDestination(undefined)).toBe('/participant/dashboard')
  })
})
