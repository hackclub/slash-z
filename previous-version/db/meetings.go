package db

import (
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/hackclub/slash-z/util"
)

const TableMeetings = "Meetings"

type MeetingStatus string

const (
	MeetingStatusActive = "1 - Active"
	MeetingStatusIdling = "2 - Idling"
	MeetingStatusEnded  = "3 - Ended"
)

type Meeting struct {
	AirtableID  string `json:"-"`
	ZoomID      int    `json:"Zoom ID,omityempty"`
	SlackCallID string `json:"Slack Call ID,omitempty"`

	// It actually only supports one host ID. Airtable requires that we send it
	// an array of record IDs though.
	LinkedHostIDs []string `json:"Host,omitempty"`

	Status MeetingStatus `json:"Status,formula"`

	StartedAt   *time.Time `json:"Started At,omitempty"`
	IdlingSince *time.Time `json:"Idling Since,omitempty"`
	EndedAt     *time.Time `json:"Ended At,omitempty"`

	CreatorDisplayName string `json:"Creator Display Name,omitempty"`
	CreatorSlackID     string `json:"Creator Slack ID,omitempty"`
	CreatorEmail       string `json:"Creator Email,omitempty"`

	JoinURL string `json:"Join URL,omitempty"`

	CurrentActiveUsers int `json:"Current Active Users,formula"`
}

// "33333333333" -> "333-3333-3333"
func (m Meeting) PrettyZoomID() string {
	strID := strconv.Itoa(m.ZoomID)

	return util.InsertNth(strID, '-', 4, false)
}

func (db DB) CreateMeeting(m *Meeting) error {
	contents, err := json.Marshal(prepFields(*m))
	if err != nil {
		return err
	}

	e := envelope{Object: contents}

	if err := db.client.CreateRecord(TableMeetings, &e); err != nil {
		return err
	}

	if err := json.Unmarshal(e.Object, &m); err != nil {
		return err
	}

	m.AirtableID = e.AirtableID

	return nil
}

func (db DB) UpdateMeeting(m *Meeting) error {
	return db.client.UpdateRecord(TableMeetings, m.AirtableID, prepFields(*m), m)
}

func (db DB) GetMeetingsWithFormula(formula string) ([]Meeting, error) {
	envelopes, err := getWithFormula(db, TableMeetings, formula)
	if err != nil {
		return nil, err
	}

	meetings := make([]Meeting, len(envelopes))

	for i, e := range envelopes {
		var meeting Meeting

		if err := json.Unmarshal(e.Object, &meeting); err != nil {
			return nil, err
		}

		meeting.AirtableID = e.AirtableID
		meetings[i] = meeting
	}

	return meetings, nil
}

// Returns Meetings that are Active or Idling (anything that Zoom considers a meeting in-progress)
func (db DB) GetActiveMeetings() ([]Meeting, error) {
	meetings, err := db.GetMeetingsWithFormula(`{Status} != "` + MeetingStatusEnded + `"`)
	if err != nil {
		return nil, err
	}

	if len(meetings) == 0 {
		return nil, NewNotFoundError("no active meetings found")
	}

	return meetings, nil
}

func (db DB) GetMeeting(zoomID string) (Meeting, error) {
	meetings, err := db.GetMeetingsWithFormula(`{Zoom ID} = "` + zoomID + `"`)
	if err != nil {
		return Meeting{}, nil
	}

	if len(meetings) > 1 {
		return Meeting{}, errors.New("too many meetings, non-unique Zoom IDs")
	} else if len(meetings) == 0 {
		return Meeting{}, NewNotFoundError("no meetings found")
	}

	return meetings[0], nil
}
