import './env.js'
import './jobs/index.js'
import { setBookmarkTitle } from './api/hack-night.js'
import transcript from './api/transcript.js'

import express from 'express'
const app = express()

import bugsnag from './bugsnag.js'
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

setInterval(() => {
  setBookmarkTitle();
}, 1000 * 60) // update the hack night bookmark every minute with the correct url