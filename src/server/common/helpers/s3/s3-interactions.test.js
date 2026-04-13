import { getS3SignedUrl } from './s3-interactions.js'
import { createS3Client } from './s3-client.js'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

vi.mock('./s3-client.js')
vi.mock('@aws-sdk/s3-request-presigner')

describe('s3-interactions', () => {
  beforeEach(() => {
    createS3Client.mockReturnValueOnce(mockS3Client)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const mockPutObjectResponse = { ETag: '"mock-etag"' }
  const mockS3Client = {
    send: vi.fn(() => Promise.resolve(mockPutObjectResponse))
  }

  describe('getS3SignedUrl', () => {
    it('should return a signed Url to the S3 bucket resource with specified key', async () => {
      getSignedUrl.mockResolvedValueOnce('mock-signed-url')
      const key = 'test-key'
      const bucket = 'some-bucket'

      const result = await getS3SignedUrl(bucket, key)

      expect(createS3Client).toHaveBeenCalledTimes(1)
      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          input: {
            Bucket: bucket,
            Key: key,
            ResponseContentDisposition: `inline`,
            ResponseContentType: 'text/plain'
          }
        }),
        { expiresIn: 60 }
      )

      expect(result).toEqual('mock-signed-url')
    })

    it('should supply custom content type', async () => {
      getSignedUrl.mockResolvedValueOnce('http://localstack/mock-signed-url')
      const key = 'key/something/blah/test.json'
      const bucket = 'some-bucket'

      const result = await getS3SignedUrl(bucket, key)

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.objectContaining({
          input: {
            Bucket: bucket,
            Key: key,
            ResponseContentDisposition: `inline`,
            ResponseContentType: 'application/json'
          }
        }),
        { expiresIn: 60 }
      )

      expect(result).toEqual('http://localhost/mock-signed-url')
    })
  })
})
