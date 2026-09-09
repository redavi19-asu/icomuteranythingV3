import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')
const indexPath = path.join(distDir, 'index.html')

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html was not created by Vite')
}

const indexHtml = fs.readFileSync(indexPath, 'utf8')

fs.writeFileSync(path.join(distDir, '404.html'), indexHtml)

const masterDir = path.join(distDir, 'master')
fs.mkdirSync(masterDir, { recursive: true })
fs.writeFileSync(path.join(masterDir, 'index.html'), indexHtml)

// Extra extension-based fallback for hosts that resolve /master -> /master.html.
fs.writeFileSync(path.join(distDir, 'master.html'), indexHtml)

console.log('Created SPA routes: /404.html, /master/index.html, /master.html')
