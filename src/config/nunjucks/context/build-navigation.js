const NAV_ITEM_CLASS = 'govuk-service-navigation__item'
const NAV_ITEM_RIGHT_CLASS = 'app-service-navigation__item--right'
const NAV_LINK_CLASS = 'govuk-service-navigation__link'
export function buildNavigation(request, isAuthenticated = false, user = null) {
  const signOption = isAuthenticated
    ? {
        text: 'Sign out',
        href: '/logout'
      }
    : {
        text: 'Sign in',
        href: '/login'
      }

  const userElement = user
    ? `<li class="${NAV_ITEM_CLASS} ${NAV_ITEM_RIGHT_CLASS}">${user}</li><li class="${NAV_ITEM_CLASS}">`
    : `<li class="${NAV_ITEM_CLASS} ${NAV_ITEM_RIGHT_CLASS}">`
  return {
    navigation: [
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
      }
    ],
    slots: {
      navigationEnd: `${userElement}<a class="${NAV_LINK_CLASS}" href="${signOption.href}">${signOption.text}</a></li>`
    }
  }
}
