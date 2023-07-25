import './env.js'
import './jobs/index.js'
import transcript from './api/transcript.js'
import {getTotalHosts, getOpenHosts} from "./api/state.js";

import express from 'express'
const app = express()

import bugsnag from './bugsnag.js'
import metrics from './metrics.js'

app.use(bugsnag().requestHandler)

app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.get('/ping', (req, res) => {
  res.send('pong!')
})

app.use(express.static('public'))

import routes from './routes.js'
routes(app)

app.use(bugsnag().errorHandler)

const port = process.env.PORT || 0
const listener = app.listen(port, () => {
  console.log(transcript('startup', {port: listener.address().port}))
})


// Spit out global metrics every 1s
setInterval(async () => {
  const total = await getTotalHosts()
  const open = await getOpenHosts()

  metrics.gauge("hosts.open", open)
  metrics.gauge("hosts.total", total)
}, 1000);