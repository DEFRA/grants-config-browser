import { formatDateTime } from './date-display.js'

describe('date-display', () => {
  it('should display the formatted date', () => {
    expect(formatDateTime('2026-04-16T09:34:00Z')).not.toBeNull()
  })
})
