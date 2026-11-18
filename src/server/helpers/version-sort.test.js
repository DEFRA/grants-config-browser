import { describe, it, expect } from 'vitest'
import { versionSortValue } from './version-sort.js'

describe('versionSortValue', () => {
  describe('with well-formed major.minor.patch versions', () => {
    it('encodes each segment into a single ordering number', () => {
      expect(versionSortValue('1.2.3')).toBe(1_002_003)
    })

    it('orders a double-digit major above a single-digit one', () => {
      expect(versionSortValue('10.0.0')).toBeGreaterThan(versionSortValue('2.0.0'))
    })

    it('ignores any segments beyond the patch', () => {
      expect(versionSortValue('1.2.3.4')).toBe(versionSortValue('1.2.3'))
    })
  })

  describe('with missing segments, which default to 0', () => {
    it('treats a missing patch as .0', () => {
      expect(versionSortValue('1.0')).toBe(versionSortValue('1.0.0'))
      expect(versionSortValue('1.2')).toBe(versionSortValue('1.2.0'))
    })

    it('treats a missing minor and patch as .0.0', () => {
      expect(versionSortValue('1')).toBe(versionSortValue('1.0.0'))
    })

    it('orders short and long forms of the same version equally', () => {
      expect(versionSortValue('1')).toBe(1_000_000)
      expect(versionSortValue('1.0')).toBe(1_000_000)
      expect(versionSortValue('1.0.0')).toBe(1_000_000)
    })

    it('still orders a short form against a full version correctly', () => {
      expect(versionSortValue('2')).toBeGreaterThan(versionSortValue('1.9.9'))
      expect(versionSortValue('1.10')).toBeGreaterThan(versionSortValue('1.9.9'))
    })
  })

  // The .0 default only fills in absent segments; a genuinely non-numeric
  // segment is still NaN, which we deliberately do not try to sort.
  describe('with non-numeric segments', () => {
    it.each(['abc', '1.2.x'])('returns NaN for %j', (version) => {
      expect(versionSortValue(version)).toBeNaN()
    })
  })
})
