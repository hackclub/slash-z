export default async (req, res) => {
  const { body } = req
  // body = { hostkey: String, meetingID: String }
  
  
  if (!body.hostkey) return req.status(400).json({ success: false, error: 'Missing hostkey' })
  if (!body.meetingID) return req.status(400).json({ success: false, error: 'Missing meeting ID' })
  
  // Fetch the meeting by the ID from AirTable
  // Check if given host key matches the one in AirTable
  
  const hostKeyMatches = /* the result from airtable */ false;
  
  if (hostKeyMatches) res.json({ success: true, callLink: 'https://hackclub.zoom.us/something' });
  else res.json({ success: false, error: 'Invalid hostkey' });
  
    
}
