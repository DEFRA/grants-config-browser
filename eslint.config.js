import neostandard from 'neostandard'

export default [
  {
    ignores: [...neostandard.resolveIgnoresFromGitignore(), 'src/server/asyncapidocs/**']
  },
  ...neostandard({
    env: ['node', 'vitest'],
    noJsx: true,
    noStyle: true
  })
]
