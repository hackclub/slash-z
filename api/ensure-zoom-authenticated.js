// this is a helper method to make sure the zoom request we get is authentic
module.exports = async (req, res, callback) => {
  if (req.header('authorization') == process.env.ZOOM_VERIFICATION_TOKEN) {
    callback()
    res.status(200).send('Success!')
  } else {
    res.status(403).send('Missing/invalid Zoom verification token')
  }
}