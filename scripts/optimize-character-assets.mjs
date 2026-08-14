import sharp from 'sharp'
import { readdir } from 'node:fs/promises'
import { join, parse } from 'node:path'

const directory = join(process.cwd(), 'public', 'images', 'characters', 'superskill-characters')
const files = (await readdir(directory)).filter(name => name.toLowerCase().endsWith('.png'))

for (const file of files) {
  const input = join(directory, file)
  const output = join(directory, `${parse(file).name}.webp`)
  await sharp(input)
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 92, effort: 6 })
    .toFile(output)
  const metadata = await sharp(output).metadata()
  console.log(`${file} -> ${parse(file).name}.webp (${metadata.width}x${metadata.height})`)
}
