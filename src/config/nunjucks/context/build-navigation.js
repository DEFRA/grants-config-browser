export function buildNavigation(request) {
  const signOption = request?.user
    ? {
        text: 'Sign out',
        href: '/logout'
      }
    : {
        text: 'Sign in',
        href: '/login'
      }
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
      navigationEnd: `<li class="govuk-service-navigation__item app-service-navigation__item--right"><a class="govuk-service-navigation__link" href="${signOption.href}">${signOption.text}</a></li>`
    }
  }
}
