package zoom

import "fmt"

// UpdateMeetingOptions are the options to update a meeting. FYI that this
// method was added by Zach in putting together `slash-z` and does not include
// all the options the Zoom API offers for this field. Review API docs and
// modify this method as needed.
type UpdateMeetingOptions struct {
	MeetingID int             `url:"-"`
	Topic     string          `json:"topic"`
	Settings  MeetingSettings `json:"settings,omitempty"`
}

// UpdateMeetingPath - v2 update a meeting
const UpdateMeetingPath = "/meetings/%d"

// UpdateMeeting calls PATCH /meetings/{meetingID}
func UpdateMeeting(opts UpdateMeetingOptions) error {
	return defaultClient.UpdateMeeting(opts)
}

// UpdateMeeting calls UPDATE /meetings/{meetingID}
func (c *Client) UpdateMeeting(opts UpdateMeetingOptions) error {
	return c.requestV2(requestV2Opts{
		Method:         Patch,
		Path:           fmt.Sprintf(UpdateMeetingPath, opts.MeetingID),
		DataParameters: &opts,
	})
}
