import Joi from 'joi'
import { getS3SignedUrl } from '../common/helpers/s3/s3-interactions.js'

const viewFileSchema = Joi.object({
  filename: Joi.string().required(),
  bucket: Joi.string().required()
})

export const viewFileController = {
  async handler(request, h) {
    const { filename, bucket } = request.query
    if (viewFileSchema.validate(request.query).error) {
      return h.redirect('/')
    }

    return h.redirect(await getS3SignedUrl(bucket, filename))
  }
}
