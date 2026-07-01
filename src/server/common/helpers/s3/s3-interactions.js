import { config } from '../../../../config/config.js'
import { createS3Client } from './s3-client.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3client

const initialiseClient = () => {
  if (!s3client) {
    s3client = createS3Client({
      region: config.get('aws.region'),
      endpoint: config.get('aws.endpointUrl'),
      forcePathStyle: config.get('aws.s3.forcePathStyle')
    })
  }
  return s3client
}

const getCustomType = (filename) => {
  if (filename.endsWith('.json')) {
    return 'application/json'
  } else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    return 'text/yaml'
  } else {
    return 'text/plain'
  }
}

export const getS3SignedUrl = async (bucket, filename, options = {}) => {
  const { internal = false } = options
  const client = initialiseClient()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
    ResponseContentDisposition: `inline`,
    ResponseContentType: getCustomType(filename)
  })

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 60
  })

  if (internal) {
    return signedUrl
  }

  return signedUrl?.replace('localstack', 'localhost')
}

export const getS3FileContent = async (bucket, filename) => {
  const url = await getS3SignedUrl(bucket, filename, { internal: true })
  console.log(`Fetching file from S3: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file from S3: ${response.statusText}`)
  }
  return response.text()
}
