import sharp from 'sharp'

export type PreprocessedImage = {
  buffer: Buffer
  mimeType: 'image/jpeg'
  label: 'enhanced' | 'threshold'
}

const MAX_IMAGE_PIXELS = 20_000_000

export async function validateReceiptImage(image: Buffer, mimeType: string) {
  const metadata = await sharp(image, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata()
  const expectedFormat = mimeType === 'image/jpeg' ? 'jpeg' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : ''
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS || metadata.format !== expectedFormat) {
    throw new Error('Unsupported receipt image')
  }
}

export async function preprocessReceipt(image: Buffer): Promise<PreprocessedImage[]> {
  const base = sharp(image, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate().resize({
    width: 2200,
    height: 3200,
    fit: 'inside',
    withoutEnlargement: true,
  })

  const enhanced = await base
    .clone()
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 92 })
    .toBuffer()

  const threshold = await base
    .clone()
    .grayscale()
    .normalize()
    .linear(1.35, -35)
    .threshold(175)
    .jpeg({ quality: 94 })
    .toBuffer()

  return [
    { buffer: enhanced, mimeType: 'image/jpeg', label: 'enhanced' },
    { buffer: threshold, mimeType: 'image/jpeg', label: 'threshold' },
  ]
}
