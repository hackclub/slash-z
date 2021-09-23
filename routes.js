import { resolve, relative, extname, basename, dirname } from 'path'
import { readdir } from 'fs/promises'

import recordError from './api/record-error.js'

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map(dirent => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFiles(res) : res
    })
  )
  return Array.prototype.concat(...files)
}

export default async app => {
  const startTS = Date.now()
  const files = await getFiles('./api/endpoints')
  const filesToLoad = files.map(async file => {
    try {
      const ext = extname(file)
      if (!['.js', '.mjs'].includes(ext)) {
        // skip loading non-js files
        return
      }

      const moduleURL = new URL(import.meta.url)
      const __dirname = decodeURIComponent(dirname(moduleURL.pathname))

      // if it's an index.js file, use the parent directory's name
      // ex. '/api/slack/index.js' is hosted at '/api/slack' (no index)
      let routePath = relative(__dirname, dirname(file))
      // if it's NOT an index.js file, include the basename
      // ex. '/api/zoom/new.js' is hosted at '/api/zoom/new'
      if (basename(file, extname(file)) != 'index') {
        routePath = `${routePath}/${basename(file, extname(file))}`
      }

      const route = (await import(file)).default // just to test we can load the file

      app.all('/' + routePath, async (req, res) => {
        try {
          await route(req, res)
        } catch (err) {
          console.error(err)
          recordError(err)
        }
      })
    } catch (err) {
      console.error(err)
      console.log('Failed to load file:', file)
    }
  })
  await Promise.all(filesToLoad)
  console.log(`Finished loading in ${Date.now() - startTS}ms`)
}
