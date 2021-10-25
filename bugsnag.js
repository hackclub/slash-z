import Bugsnag from '@bugsnag/js'
import BugsnagPluginExpress from '@bugsnag/plugin-express'

let started = false

export default () => {
  if (!started) {
    Bugsnag.start({
      apiKey: process.env.BUGSNAG_API_KEY,
      plugins: [BugsnagPluginExpress]
    })
    started = true
  }
  return Bugsnag.getPlugin('express')
}
