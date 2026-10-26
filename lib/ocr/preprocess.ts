import sharp from 'sharp'

export type PreprocessedImage = {
  buffer: Buffer
  mimeType: 'image/jpeg'
  label: 'enhanced' | 'threshold'
}

export async function preprocessReceipt(image: Buffer): Promise<PreprocessedImage[]> {
  const base = sharp(image, { failOn: 'none' }).rotate().resize({
    width: 2200,
    height: 3200,
    fit: 'inside',
    withoutEnlargement: false,
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
