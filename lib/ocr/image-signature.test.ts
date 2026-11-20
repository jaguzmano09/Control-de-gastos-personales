import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { matchesImageSignature } from './image-signature.ts'

test('accepts supported image signatures only for the matching declared type', () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const jpeg = Uint8Array.from([255, 216, 255])
  const webp = Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])
  assert.equal(matchesImageSignature(png, 'image/png'), true)
  assert.equal(matchesImageSignature(jpeg, 'image/jpeg'), true)
  assert.equal(matchesImageSignature(webp, 'image/webp'), true)
  assert.equal(matchesImageSignature(png, 'image/jpeg'), false)
  assert.equal(matchesImageSignature(Uint8Array.from([137, 80]), 'image/png'), false)
  assert.equal(matchesImageSignature(webp, 'text/html'), false)
})
