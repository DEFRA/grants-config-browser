import { getS3FileContent } from './s3-interactions.js'
import { statusCodes } from '../../constants/status-codes.js'

export const loadJsonFromS3 = async (request, h) => {
  const { bucket, filename, grant, version } = request.query || {}

  try {
    let fileContent
    if (bucket && filename) {
      fileContent = await getS3FileContent(bucket, filename)
    } else {
      return {
        errorResponse: h
          .response(`Error loading JSON: No bucket or filename provided`)
          .code(statusCodes.internalServerError)
      }
    }
    const config = JSON.parse(fileContent)
    return { config, bucket, filename, grant, version }
  } catch (e) {
    return { errorResponse: h.response(`Error loading JSON: ${e.message}`).code(statusCodes.internalServerError) }
  }
}
