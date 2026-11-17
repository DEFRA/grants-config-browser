import { vi, describe, it, expect } from 'vitest'
import {
  latestVersionsOfEachMajor,
  storeArchivingOutcome,
  takeArchivingOutcome,
  describeArchivingOutcome
} from './archiving.js'

describe('latestVersionsOfEachMajor', () => {
  it('returns an empty set for no versions', () => {
    expect(latestVersionsOfEachMajor([])).toEqual(new Set())
  })

  it('returns the only version when there is one', () => {
    expect(latestVersionsOfEachMajor([{ version: '1.0.0', archived: false }])).toEqual(new Set(['1.0.0']))
  })

  it('picks the highest minor within a major', () => {
    const versions = [
      { version: '1.0.0', archived: false },
      { version: '1.2.0', archived: false },
      { version: '1.1.0', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.2.0']))
  })

  it('uses the patch as a tie-breaker when minors are equal', () => {
    const versions = [
      { version: '1.2.0', archived: false },
      { version: '1.2.3', archived: false },
      { version: '1.2.1', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.2.3']))
  })

  it('compares numerically, not lexically', () => {
    const versions = [
      { version: '1.2.0', archived: false },
      { version: '1.10.0', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.10.0']))
  })

  it('returns the latest of each major', () => {
    const versions = [
      { version: '1.0.0', archived: false },
      { version: '1.3.0', archived: false },
      { version: '2.1.0', archived: false },
      { version: '2.0.0', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.3.0', '2.1.0']))
  })

  it('ignores archived versions', () => {
    const versions = [
      { version: '1.0.0', archived: false },
      { version: '1.3.0', archived: true }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.0.0']))
  })

  it('omits a major whose every version is archived', () => {
    const versions = [
      { version: '1.0.0', archived: true },
      { version: '1.1.0', archived: true },
      { version: '2.0.0', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['2.0.0']))
  })

  it('is independent of input order', () => {
    const versions = [
      { version: '2.1.0', archived: false },
      { version: '1.0.0', archived: false },
      { version: '1.3.0', archived: false },
      { version: '2.0.0', archived: false }
    ]
    expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.3.0', '2.1.0']))
  })

  describe('with missing segments, which default to 0', () => {
    it('includes a bare major version', () => {
      expect(latestVersionsOfEachMajor([{ version: '1', archived: false }])).toEqual(new Set(['1']))
    })

    it('treats 1, 1.0 and 1.0.0 as the same version, keeping the first seen', () => {
      const versions = [
        { version: '1.0.0', archived: false },
        { version: '1', archived: false },
        { version: '1.0', archived: false }
      ]
      expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.0.0']))
    })

    it('picks the highest minor when versions use short forms', () => {
      const versions = [
        { version: '1.0', archived: false },
        { version: '1.2', archived: false }
      ]
      expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.2']))
    })

    it('picks the higher patch even when the lower version omits it', () => {
      const versions = [
        { version: '1.0', archived: false },
        { version: '1.0.5', archived: false }
      ]
      expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.0.5']))
    })

    it('compares short-form minors numerically', () => {
      const versions = [
        { version: '1.2', archived: false },
        { version: '1.10', archived: false }
      ]
      expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['1.10']))
    })

    it('separates bare majors into their own lines', () => {
      const versions = [
        { version: '2', archived: false },
        { version: '10', archived: false }
      ]
      expect(latestVersionsOfEachMajor(versions)).toEqual(new Set(['2', '10']))
    })
  })
})

const requestWithSession = (sessionId, session) => ({
  state: sessionId ? { userSessionCookie: { sessionId } } : {},
  server: { session }
})

describe('storeArchivingOutcome', () => {
  it('returns null and stores nothing when there is no session', () => {
    const session = { set: vi.fn() }
    const request = requestWithSession(null, session)

    expect(storeArchivingOutcome(request, { status: 'success' })).toBeNull()
    expect(session.set).not.toHaveBeenCalled()
  })

  it('stores the record under the session-scoped key and returns the result', () => {
    const session = { set: vi.fn().mockReturnValue('stored') }
    const request = requestWithSession('abc', session)
    const record = { status: 'success', action: 'archive', version: '1.0.0' }

    const result = storeArchivingOutcome(request, record)

    expect(session.set).toHaveBeenCalledWith('abc-archiving', record)
    expect(result).toBe('stored')
  })
})

describe('takeArchivingOutcome', () => {
  it('returns null when there is no session', async () => {
    const session = { get: vi.fn(), drop: vi.fn() }
    const request = requestWithSession(null, session)

    await expect(takeArchivingOutcome(request)).resolves.toBeNull()
    expect(session.get).not.toHaveBeenCalled()
  })

  it('reads, drops and returns the outcome when present', async () => {
    const outcome = { status: 'success', action: 'archive', version: '1.0.0' }
    const session = { get: vi.fn().mockResolvedValue(outcome), drop: vi.fn().mockResolvedValue() }
    const request = requestWithSession('abc', session)

    const result = await takeArchivingOutcome(request)

    expect(session.get).toHaveBeenCalledWith('abc-archiving')
    expect(session.drop).toHaveBeenCalledWith('abc-archiving')
    expect(result).toBe(outcome)
  })

  it('does not drop anything when there is no stored outcome', async () => {
    const session = { get: vi.fn().mockResolvedValue(undefined), drop: vi.fn() }
    const request = requestWithSession('abc', session)

    const result = await takeArchivingOutcome(request)

    expect(session.drop).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})

describe('describeArchivingOutcome', () => {
  it('describes a successful archive', () => {
    expect(describeArchivingOutcome({ status: 'success', action: 'archive', version: '1.0.0' })).toEqual({
      status: 'success',
      message: 'Version 1.0.0 has been archived.'
    })
  })

  it('describes a successful unarchive', () => {
    expect(describeArchivingOutcome({ status: 'success', action: 'unarchive', version: '2.1.0' })).toEqual({
      status: 'success',
      message: 'Version 2.1.0 has been unarchived.'
    })
  })

  it('describes a failed archive, including the error', () => {
    expect(
      describeArchivingOutcome({
        status: 'error',
        action: 'archive',
        version: '1.0.0',
        error: 'Cannot archive the latest version'
      })
    ).toEqual({
      status: 'error',
      message: 'Version 1.0.0 could not be archived. Cannot archive the latest version'
    })
  })

  it('describes a failed unarchive', () => {
    expect(describeArchivingOutcome({ status: 'error', action: 'unarchive', version: '2.1.0', error: 'Boom' })).toEqual(
      {
        status: 'error',
        message: 'Version 2.1.0 could not be unarchived. Boom'
      }
    )
  })
})
