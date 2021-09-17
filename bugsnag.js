const Bugsnag = require('@bugsnag/js')
const BugsnagPluginExpress = require('@bugsnag/plugin-express')

if (process.env.BUGSNAG_API_KEY) {
  Bugsnag.start({
    apiKey: process.env.BUGSNAG_API_KEY,
    plugins: [BugsnagPluginExpress],
  })
}

module.exports = () => Bugsnag.getPlugin('express')