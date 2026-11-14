const fs = require('node:fs')
const sharp = require('sharp')

const source = fs.readFileSync('public/favicon.svg')

async function generate() {
  const faviconImages = []
  for (const [name, size] of [
    ['favicon-16.png', 16],
    ['favicon-32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    const png = await sharp(source).resize(size, size).png().toBuffer()
    fs.writeFileSync(`public/icons/${name}`, png)
    if (size === 16 || size === 32) faviconImages.push({ size, png })
  }

  const header = Buffer.alloc(6 + faviconImages.length * 16)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(faviconImages.length, 4)
  let offset = header.length
  faviconImages.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  fs.writeFileSync('public/favicon.ico', Buffer.concat([header, ...faviconImages.map(({ png }) => png)]))

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
