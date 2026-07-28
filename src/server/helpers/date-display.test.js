import { formatDateTime, formatDateExplicit, formatDateTimeExplicit } from './date-display.js'
import { subDays } from 'date-fns'

describe('date-display', () => {
  const testDate = '2026-04-16T09:34:00Z'

  describe('formatDateTime', () => {
    it('should display the formatted date for dates far in the past', () => {
      expect(formatDateTime(testDate)).toEqual('16/04/2026')
    })

    it('should display relative time for recent dates', () => {
      const now = new Date()
      expect(formatDateTime(now.toISOString())).toMatch(/^Today at/)

      const yesterday = subDays(now, 1)
      expect(formatDateTime(yesterday.toISOString())).toMatch(/^Yesterday at/)
    })

    it('should throw RangeError for invalid dates', () => {
      expect(() => formatDateTime('invalid-date')).toThrow(RangeError)
    })
  })

  describe('formatDateExplicit', () => {
    it('should display the date in YYYY-MM-DD format', () => {
      expect(formatDateExplicit(testDate)).toEqual('2026-04-16')
    })

    it('should throw RangeError for invalid dates', () => {
      expect(() => formatDateExplicit('invalid-date')).toThrow(RangeError)
    })
  })

  describe('formatDateTimeExplicit', () => {
    it('should display the date in RFC7231 format', () => {
      expect(formatDateTimeExplicit(testDate)).toEqual('Thu, 16 Apr 2026 09:34:00 GMT')
    })

    it('should throw RangeError for invalid dates', () => {
      expect(() => formatDateTimeExplicit('invalid-date')).toThrow(RangeError)
    })
  })
})
