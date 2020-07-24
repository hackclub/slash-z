package db

import (
	"encoding/json"
	"errors"
	"math/rand"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/fabioberger/airtable-go"
	"github.com/hackclub/slash-z/util"
)

type NotFoundError struct {
	s string
}

func (e *NotFoundError) Error() string {
	return e.s
}

func NewNotFoundError(e string) *NotFoundError {
	return &NotFoundError{s: e}
}

type DB struct {
	client *airtable.Client
}

func NewDB(airtableAPIKey, airtableBaseID string) (DB, error) {
	client, err := airtable.New(airtableAPIKey, airtableBaseID)
	if err != nil {
		return DB{}, err
	}

	return DB{client: client}, nil
}

type envelope struct {
	AirtableID string          `json:"id,omitempty"`
	Object     json.RawMessage `json:"fields"`
}

// convert a struct into a map[string]interface{} ready for submission to
// airtable to do things like update records, reading field names from json
// tags
//
// fields annotated with the tag "formula" aren't included in the generated
// map[string]interface{}. tag fields that are equivalent to formula fields in
// airtable with this.
func prepFields(obj interface{}) map[string]interface{} {
	fields := make(map[string]interface{})

	v := reflect.ValueOf(obj)

	for i := 0; i < v.NumField(); i++ {
		tag := v.Type().Field(i).Tag.Get("json")

		// "Email,omitempty" -> ["Email", "omitempty"]
		tags := strings.Split(tag, ",")

		baseTag := tags[0]

		// skip if tag is not defined or ignored
		if baseTag == "" || baseTag == "-" {
			continue
		}

		// skip if formula is one of the tags, so we don't incorrectly try to set
		// formula fields
		if util.Contains(tags, "formula") {
			continue
		}

		fields[baseTag] = v.Field(i).Interface()
	}

	return fields
}

func getWithFormula(db DB, table, formula string) ([]envelope, error) {
	listParams := airtable.ListParameters{
		FilterByFormula: formula,
	}

	envelopes := []envelope{}

	if err := db.client.ListRecords(table, &envelopes, listParams); err != nil {
		return nil, err
	}

	return envelopes, nil
}

const TableHosts = "Hosts"

type Host struct {
	AirtableID     string `json:"-"`
	Email          string `json:"Email,omitempty"`
	RoomName       string `json:"Name Displayed to Users,omitempty"`
	APIKey         string `json:"API Key,omitempty"`
	APISecret      string `json:"API Secret,omitempty"`
	ZoomID         string `json:"Zoom ID,omitempty"`
	ActiveMeetings int    `json:"Active Meetings,formula,omitempty"`
}

func (db DB) GetHosts() ([]Host, error) {
	envelopes := []envelope{}

	if err := db.client.ListRecords(TableHosts, &envelopes, airtable.ListParameters{}); err != nil {
		return nil, err
	}

	if len(envelopes) == 0 {
		return nil, errors.New("no hosts found")
	}

	hosts := make([]Host, len(envelopes))
	for i, e := range envelopes {
		var host Host

		if err := json.Unmarshal(e.Object, &host); err != nil {
			return nil, err
		}

		host.AirtableID = e.AirtableID

		hosts[i] = host
	}

	return hosts, nil
}

func (db DB) GetHostsWithFormula(formula string) ([]Host, error) {
	envelopes, err := getWithFormula(db, TableHosts, formula)
	if err != nil {
		return nil, err
	}

	hosts := make([]Host, len(envelopes))

	for i, e := range envelopes {
		var host Host

		if err := json.Unmarshal(e.Object, &host); err != nil {
			return nil, err
		}

		host.AirtableID = e.AirtableID
		hosts[i] = host
	}

	return hosts, nil
}

func (db DB) GetAvailableHost() (Host, error) {
	// Active Meetings is a formula field on Airtable that shows the number of
	// meetings that don't have EndTime set.
	hosts, err := db.GetHostsWithFormula(`{Active Meetings} = "0"`)
	if err != nil {
		return Host{}, err
	}

	if len(hosts) == 0 {
		return Host{}, NewNotFoundError("no available hosts found")
	}

	// pick a random available host
	randSource := rand.NewSource(time.Now().Unix())
	rand := rand.New(randSource)

	randHost := hosts[rand.Intn(len(hosts))]

	return randHost, nil
}

func (db DB) GetHostByAirtableID(airtableID string) (Host, error) {
	var e envelope
	var host Host

	if err := db.client.RetrieveRecord(TableHosts, airtableID, &e); err != nil {
		return Host{}, err
	}

	if err := json.Unmarshal(e.Object, &host); err != nil {
		return host, err
	}

	host.AirtableID = e.AirtableID

	return host, nil
}

func (db DB) GetHost(zoomID string) (Host, error) {
	hosts, err := db.GetHostsWithFormula(`{Zoom ID} = "` + zoomID + `"`)
	if err != nil {
		return Host{}, err
	}

	if len(hosts) > 1 {
		return Host{}, errors.New("too many hosts returned, non-unique Zoom IDs")
	} else if len(hosts) == 0 {
		return Host{}, NewNotFoundError("no hosts found")
	}

	return hosts[0], nil
}

// TODO: Pretty sure I wrote this wrong (the last arg). See CreateMeeting for
// reference.
func (db DB) UpdateHost(h *Host) error {
	return db.client.UpdateRecord(TableHosts, h.AirtableID, prepFields(*h), h)
}

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

const TableParticipantEvents = "Participant Events"

type ParticipantEvent struct {
	AirtableID string    `json:"-"`
	Time       time.Time `json:"Time,omitempty"`

	// Actually only supports one host ID.
	LinkedMeetingIDs []string `json:"Meeting,omitempty"`

	// "Joined" or "Left"
	Type string `json:"Type,omitempty"`

	ParticipantName         string `json:"Participant Name,omitempty"`
	ParticipantPerMeetingID string `json:"Participant Per-Meeting ID,omitempty"`
	ParticipantZoomID       string `json:"Participant Zoom ID,omitempty"`

	ParticipantCanonicalID string `json:"Participant Canonical ID,formula,omitempty"`
}

func (db DB) CreateParticipantEvent(p *ParticipantEvent) error {
	contents, err := json.Marshal(p)
	if err != nil {
		return err
	}

	e := envelope{Object: contents}

	if err := db.client.CreateRecord(TableParticipantEvents, &e); err != nil {
		return err
	}

	p.AirtableID = e.AirtableID

	return nil
}
