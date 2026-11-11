// Shared helpers for archiving and unarchiving config versions, used by both the
// grant listing page and the single-version page.

// The broker refuses to archive the latest version of a major line
// (isLatestVersionInMajor), so the browser hides the button for it. The latest
// of a major is its highest non-archived version.
export const latestVersionsOfEachMajor = (versions) => {
  const highestByMajor = new Map()
  for (const { version, archived } of versions) {
    if (archived) {
      continue
    }
    const [major, minor, patch] = version.split('.').map(Number)
    const current = highestByMajor.get(major)
    if (!current || minor > current.minor || (minor === current.minor && patch > current.patch)) {
      highestByMajor.set(major, { version, minor, patch })
    }
  }
  return new Set([...highestByMajor.values()].map((entry) => entry.version))
}

// The outcome of an archive/unarchive is stashed on the session so it survives
// the redirect back to the originating page, where it is shown as a banner.
const sessionIdFromCookie = (request) => request.state?.userSessionCookie?.sessionId

const archivingKey = (sessionId) => `${sessionId}-archiving`

export const storeArchivingOutcome = (request, record) => {
  const sessionId = sessionIdFromCookie(request)
  if (!sessionId) {
    return null
  }
  return request.server.session.set(archivingKey(sessionId), record)
}

export const takeArchivingOutcome = async (request) => {
  const sessionId = sessionIdFromCookie(request)
  if (!sessionId) {
    return null
  }
  const key = archivingKey(sessionId)
  const outcome = await request.server.session.get(key)
  if (outcome) {
    await request.server.session.drop(key)
  }
  return outcome
}

export const describeArchivingOutcome = ({ status, action, version, error }) => {
  const past = action === 'archive' ? 'archived' : 'unarchived'
  return {
    status,
    message:
      status === 'success'
        ? `Version ${version} has been ${past}.`
        : `Version ${version} could not be ${past}. ${error}`
  }
}
