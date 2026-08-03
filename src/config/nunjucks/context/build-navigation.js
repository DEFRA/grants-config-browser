const NAV_ITEM_CLASS = 'govuk-service-navigation__item'
const NAV_ITEM_RIGHT_CLASS = 'app-service-navigation__item--right'
const NAV_LINK_CLASS = 'govuk-service-navigation__link'

const REDIRECT_OVERRIDES = {
  '/feature-control/update': '/feature-control/detail'
}

export function buildNavigation(request, isAuthenticated = false, user = null) {
  const currentPath = request?.path
  const redirectPath = REDIRECT_OVERRIDES[currentPath] || currentPath
  const redirectUrl = encodeURIComponent(redirectPath + (request?.url?.search || ''))

  const signOption = isAuthenticated
    ? {
        text: 'Sign out',
        href: `/logout?redirect=${redirectUrl}`
      }
    : {
        text: 'Sign in',
        href: '/login'
      }

  const userElement = user
    ? `<li class="${NAV_ITEM_CLASS} ${NAV_ITEM_RIGHT_CLASS}">${user}</li><li class="${NAV_ITEM_CLASS}">`
    : `<li class="${NAV_ITEM_CLASS} ${NAV_ITEM_RIGHT_CLASS}">`
  const navigation = [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    },
    {
      text: 'Notifications',
      href: '/notifications',
      current: request?.path === '/notifications'
    },
    {
      text: 'Features',
      href: '/features',
      current:
        request?.path === '/features' ||
        request?.path === '/feature-control/detail' ||
        request?.path === '/feature-control/update'
    }
  ]

  return {
    navigation,
    slots: {
      navigationEnd: `${userElement}<a class="${NAV_LINK_CLASS}" href="${signOption.href}">${signOption.text}</a></li>`
    }
  }
}
