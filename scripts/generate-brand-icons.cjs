const fs = require('node:fs')
const sharp = require('sharp')

const source = fs.readFileSync('public/favicon.svg')

async function generate() {
  for (const [name, size] of [
    ['favicon-32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    await sharp(source).resize(size, size).png().toFile(`public/icons/${name}`)
  }

  const mark = await sharp(source).resize(410, 410).png().toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#F4F7F3' } })
    .composite([{ input: mark, left: 51, top: 51 }])
    .png()
    .toFile('public/icons/icon-maskable-512.png')
}

generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
