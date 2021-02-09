export const newZoomMeeting = async () => {
  // hard coding this just for the time being while working out the slack integration
  return {
    zoomID: '6607256097',
    joinURL: 'https://zoom.us/j/6607256097',
  }
}
export default async (req, res) => {
  const meeting = await newZoomMeeting()
  res.status(200).send(meeting)
}