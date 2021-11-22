export default async (req, res) => {
  const { body } = req
  // body = { hostkey: String, meetingID: String }
  
  
  if (!body.meetingID) return req.status(400).json({ success: false, error: 'Missing meeting ID' })
  
  // Fetch the meeting by the ID from AirTable
  
  // With some AirTable magic, check if the meeting uses the virtual lobby feature and if the meeting has been started by a host
  
  let meetingStarted = false;
  
  if (meetingStarted) res.json({ success: true, callLink: 'https://hackclub.zoom.us/something' });
  else res.json({ success: false, error: 'Meeting has not started yet' });
  
    
}
