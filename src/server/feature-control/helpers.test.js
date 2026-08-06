import { canUserUpdate } from './helpers.js'

describe('helpers', () => {
  describe('canUserUpdate', () => {
    it('should return true if user has permission to update', () => {
      const user = ['admin']
      const featureControl = ['admin']
      expect(canUserUpdate(user, featureControl)).toBe(true)
    })

    it('should return false if user does not have permission to update', () => {
      const user = ['user']
      const featureControl = ['admin']
      expect(canUserUpdate(user, featureControl)).toBe(false)
    })

    it('should return false if user has no permissions', () => {
      const user = undefined
      const featureControl = ['admin']
      expect(canUserUpdate(user, featureControl)).toBe(false)
    })

    it('should return true if no role is required', () => {
      const user = ['user']
      const featureControl = []
      expect(canUserUpdate(user, featureControl)).toBe(true)
    })

    it('should return true if no role required is defined', () => {
      const user = ['user']
      const featureControl = undefined
      expect(canUserUpdate(user, featureControl)).toBe(true)
    })
  })
})
