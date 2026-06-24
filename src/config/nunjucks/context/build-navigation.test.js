import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/non-existent-path' }))).toEqual({
      navigation: [
        {
          current: false,
          text: 'Home',
          href: '/'
        },
        {
          current: false,
          text: 'About',
          href: '/about'
        },
        {
          current: false,
          href: '/notifications',
          text: 'Notifications'
        }
      ],
      slots: {
        navigationEnd:
          '<li class="govuk-service-navigation__item app-service-navigation__item--right"><a class="govuk-service-navigation__link" href="/login">Sign in</a></li>'
      }
    })
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual({
      navigation: [
        {
          current: true,
          text: 'Home',
          href: '/'
        },
        {
          current: false,
          text: 'About',
          href: '/about'
        },
        {
          current: false,
          href: '/notifications',
          text: 'Notifications'
        }
      ],
      slots: {
        navigationEnd:
          '<li class="govuk-service-navigation__item app-service-navigation__item--right"><a class="govuk-service-navigation__link" href="/login">Sign in</a></li>'
      }
    })
  })
})
