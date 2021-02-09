package zoom

import "fmt"

// UpdateMeetingStatusOptions are the options to update a meeting's status. FYI
// that this method was added by Zach in putting together `slash-z` and may not
// include all the options the Zoom API offers for this field. Review API docs
// and modify this method as needed.
type UpdateMeetingStatusOptions struct {
	MeetingID int    `url:"-"`
	Action    string `json:"action"`
}

// UpdateMeetingStatusPath - v2 update a meeting
const UpdateMeetingStatusPath = "/meetings/%d/status"

// UpdateMeetingStatus calls PUT /meetings/{meetingID}/status
func UpdateMeetingStatus(opts UpdateMeetingStatusOptions) error {
	return defaultClient.UpdateMeetingStatus(opts)
}

// UpdateMeetingStatus calls PUT /meetings/{meetingID}/status
func (c *Client) UpdateMeetingStatus(opts UpdateMeetingStatusOptions) error {
	return c.requestV2(requestV2Opts{
		Method:         Put,
		Path:           fmt.Sprintf(UpdateMeetingStatusPath, opts.MeetingID),
		DataParameters: &opts,
		HeadResponse:   true,
	})
}
