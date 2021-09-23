// this is a helper method to make sure the zoom request we get is authentic
export default async (req, res, callback) => {
  const secret = process.env.ZOOM_VERIFICATION_TOKEN
  if (!secret || req.header('authorization') == secret) {
    await callback()
    res.status(200).send('Success!')
  } else {
    res.status(403).send('Missing/invalid Zoom verification token')
  }
}
