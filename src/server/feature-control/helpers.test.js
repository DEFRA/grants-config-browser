import { canUserUpdate, getBreadcrumbs } from './helpers.js'

describe('helpers', () => {
  describe('getBreadcrumbs', () => {
    const displayName = 'Feature Name'
    const name = 'feature-name'

    it('should return default breadcrumbs for detail page', () => {
      const expected = [{ text: 'Home', href: '/' }, { text: 'Features', href: '/features' }, { text: displayName }]
      expect(getBreadcrumbs(displayName, name)).toEqual(expected)
    })

    it('should return breadcrumbs for update page', () => {
      const expected = [
        { text: 'Home', href: '/' },
        { text: 'Features', href: '/features' },
        { text: displayName, href: `/feature-control/detail?name=${name}` },
        { text: 'Update' }
      ]
      expect(getBreadcrumbs(displayName, name, 'update')).toEqual(expected)
    })

    it('should return breadcrumbs for withdraw page', () => {
      const expected = [
        { text: 'Home', href: '/' },
        { text: 'Features', href: '/features' },
        { text: displayName, href: `/feature-control/detail?name=${name}` },
        { text: 'Withdraw' }
      ]
      expect(getBreadcrumbs(displayName, name, 'withdraw')).toEqual(expected)
    })

    it('should return breadcrumbs for reactivate page', () => {
      const expected = [
        { text: 'Home', href: '/' },
        { text: 'Features', href: '/features' },
        { text: displayName, href: `/feature-control/detail?name=${name}` },
        { text: 'Reactivate' }
      ]
      expect(getBreadcrumbs(displayName, name, 'reactivate')).toEqual(expected)
    })
  })

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
