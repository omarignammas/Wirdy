import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const sources = {
  'assets/databases/mushaf-layout.db': '9f4b2f8d085257bc2fbd939e7344b2d0d8e0e532757d09b8173cae0fa778e94c',
  'assets/databases/quran.db': 'f9c3985ed89611b216c7670a55bf3d27d76f822c3fd58a69977dc64e94aab16b',
  'assets/tafsir/ar-tafseer-al-qurtubi.db': 'c8b33ba2f47d2ea235ec9f3e41e5705f3aafe68e35ce01f1e171f7f348a0acb9',
  'assets/tafsir/ar-tafseer-al-saddi.db': '0527b07209a1363452bb31a51586bc4ddfbe360c33ed72fb700af2f3ce64262e',
  'assets/tafsir/ar-tafsir-al-tabari.db': '070168ba07a121d2f4da53327b3ecc03f62a373fa03e5e1336d9b1fc1e720076',
  'assets/tafsir/ar-tafsir-ibn-kathir.db': 'af6e8c6985f9e5defe717664babf2d2dc8028045fa51c925adf585c612a7b1e9',
  'assets/tafsir/ar-tafsir-muyassar.db': '73a405b933a33039affe96af05bd3cc82f4967f1372dccc797a8b2408cd9b916',
  'assets/wird-app-icon.png': 'f741b01003a10ec17c922339a7edde1e4977f3a460ae2f3b8c23beaccfc9802d',
}

for (const [path, expected] of Object.entries(sources)) {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url))
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== expected) throw new Error(`Integrity check failed: ${path}`)
}

console.log(`Verified ${Object.keys(sources).length} bundled data and brand assets.`)
