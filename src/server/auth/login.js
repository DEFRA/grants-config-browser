export const signInController = {
  options: {
    auth: false
  },
  method: 'GET',
  path: '/login',
  handler: async (request, h) => {
    return request.login(h)
  }
}
