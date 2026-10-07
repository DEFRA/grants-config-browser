import { describe, it, expect } from 'vitest'
import { possibleContentOrEmptyString } from './visualise-helpers.js'

describe('visualise-helpers', () => {
  describe('possibleContentOrEmptyString', () => {
    it('should return the string if a non-empty string is provided', () => {
      expect(possibleContentOrEmptyString('hello')).toBe('hello')
      expect(possibleContentOrEmptyString(' ')).toBe(' ')
    })

    it('should return an empty string if an empty string is provided', () => {
      expect(possibleContentOrEmptyString('')).toBe('')
    })

    it('should return an empty string if null is provided', () => {
      expect(possibleContentOrEmptyString(null)).toBe('')
    })

    it('should return an empty string if undefined is provided', () => {
      expect(possibleContentOrEmptyString(undefined)).toBe('')
    })
  })
})
