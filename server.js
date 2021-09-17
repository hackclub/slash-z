const transcript = require('./api/transcript')
if (process.env.NODE_ENV != 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()

// if (process.env.BUGSNAG_API_KEY) {
//   app.use(require('./bugsnag').requestHandler)
// }

app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.get('/ping', (req, res) => {
  res.send('pong!')
})

app.use(express.static('public'))

require('./router')(app)

// if (process.env.BUGSNAG_API_KEY) {
//   app.use(require('./bugsnag').errorHandler)
// }

const port = process.env.PORT || 0
const listener = app.listen(port, () => {
  console.log(transcript('startup', {port: listener.address().port}))
})

if (process.env.NODE_ENV == 'production') {
  require('./jobs')
}