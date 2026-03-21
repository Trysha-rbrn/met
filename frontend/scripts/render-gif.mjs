import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer'
import { PNG } from 'pngjs'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc

const width = 800
const height = 450
const fps = 8
const durationSeconds = 10
const totalFrames = fps * durationSeconds

const inputPath = path.resolve('public/gif.html')
const outputPath = path.resolve('public/gif.gif')
const inputUrl = pathToFileURL(inputPath).toString()

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width, height }
})

try {
  const page = await browser.newPage()
  await page.goto(inputUrl, { waitUntil: 'networkidle0' })
  await new Promise((resolve) => setTimeout(resolve, 500))

  const gif = GIFEncoder()

  for (let i = 0; i < totalFrames; i += 1) {
    const buffer = await page.screenshot({ type: 'png' })
    const png = PNG.sync.read(buffer)
    const palette = quantize(png.data, 256)
    const index = applyPalette(png.data, palette)
    gif.writeFrame(index, png.width, png.height, {
      palette,
      delay: Math.round(1000 / fps)
    })
    await new Promise((resolve) => setTimeout(resolve, Math.round(1000 / fps)))
  }

  gif.finish()
  const bytes = Buffer.from(gif.bytesView())
  writeFileSync(outputPath, bytes)
  console.log(`Generated ${outputPath} (${bytes.length} bytes)`)
} finally {
  await browser.close()
}
