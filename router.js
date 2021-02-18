const { resolve, relative, extname, basename, dirname } = require('path')
const { readdir } = require('fs').promises

const recordError = require('./api/record-error')

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return Array.prototype.concat(...files)
}

module.exports = async (app) => {
  const startTS = Date.now()
  await getFiles('./api/endpoints').then(files => files.forEach(file => {
    if (extname(file) != '.js') {
      // skip loading non-js files
      return
    }

    // const relativeDir = dirname(relative(__dirname, file))
    // if it's an index.js file, use the parent directory's name
    // ex. '/api/slack/index.js' is hosted at '/api/slack' (no index)
    let routePath = relative(__dirname, dirname(file))
    // if it's NOT an index.js file, include the basename
    // ex. '/api/zoom/new.js' is hosted at '/api/zoom/new'
    if (basename(file, extname(file)) != 'index') {
      routePath = `${routePath}/${basename(file, extname(file))}`
    }

    app.all('/' + routePath, async (req, res) => {
      try {
        let route = require(file)
        await route(req, res)
      } catch (err) {
        console.error(err)
        recordError(err)
      }
    })
  })).then(_ => {
    console.log(`Finished loading in ${Date.now() - startTS}ms`)
  })
}