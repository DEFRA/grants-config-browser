import neostandard from 'neostandard'

export default neostandard({
  env: ['node', 'vitest'],
  ignores: [...neostandard.resolveIgnoresFromGitignore(), 'src/server/asyncapidocs/*'],
  noJsx: true,
  noStyle: true
})
