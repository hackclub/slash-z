if (process.env.NODE_ENV != 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.get('/ping', (req, res) => {
  res.send('pong!')
})

app.use(express.static('public'))

require('./router')(app)

const port = process.env.PORT || 0
const listener = app.listen(port, () => {
  console.log(`Listening on port ${listener.address().port}`)
})