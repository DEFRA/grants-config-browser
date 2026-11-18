// Split a version into numeric [major, minor, patch]. Any segment the string
// omits defaults to 0, so '1' and '1.0' both mean '1.0.0'.
export const versionParts = (version) => {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return [major, minor, patch]
}

// A single number that orders versions as semver (so 10.x sorts above 2.x).
export const versionSortValue = (version) => {
  const [major, minor, patch] = versionParts(version)
  return major * 1_000_000 + minor * 1_000 + patch
}
