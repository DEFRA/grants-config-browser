// A single number that orders versions as semver (so 10.x sorts above 2.x).
export const versionSortValue = (version) => {
  const [major, minor, patch] = version.split('.').map(Number)
  return major * 1_000_000 + minor * 1_000 + patch
}
