describe('Project setup', () => {
  it('Vitest is configured and working', () => {
    expect(true).toBe(true)
  })

  it('globals are available', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })
})
