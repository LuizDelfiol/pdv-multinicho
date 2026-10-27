import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(root, 'node_modules', 'sql.js', 'dist')
const publicDir = join(root, 'public')

// sql.js resolve pra um build diferente em browser (ESM/bundler) vs node,
// cada um pede um .wasm com nome próprio — copia os dois pra cobrir ambos.
for (const name of ['sql-wasm.wasm', 'sql-wasm-browser.wasm']) {
  copyFileSync(join(distDir, name), join(publicDir, name))
  console.log(`${name} copiado para public/`)
}
