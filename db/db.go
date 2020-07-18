package db

import (
	"encoding/json"
	"errors"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/fabioberger/airtable-go"
	"github.com/hackclub/slash-z/util"
)

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
func prepFields(obj interface{}) map[string]interface{} {
	fields := make(map[string]interface{})

	v := reflect.ValueOf(obj)

	for i := 0; i < v.NumField(); i++ {
		tag := v.Type().Field(i).Tag.Get("json")

		// "Email,omitempty" -> "email"
		baseTag := strings.Split(tag, ",")[0]

		// skip if tag is not defined or ignored
		if baseTag == "" || baseTag == "-" {
			continue
		}

		fields[baseTag] = v.Field(i).Interface()
	}

	return fields
}

const TableHosts = "Hosts"

type Host struct {
	AirtableID string `json:"-"`
	Email      string `json:"Email,omitempty"`
	APIKey     string `json:"API Key,omitempty"`
	APISecret  string `json:"API Secret,omitempty"`
	ZoomID     string `json:"Zoom ID,omitempty"`
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

// TODO: Pretty sure I wrote this wrong (the last arg). See CreateMeeting for
// reference.
func (db DB) UpdateHost(h *Host) error {
	return db.client.UpdateRecord(TableHosts, h.AirtableID, prepFields(h), h)
}

const TableMeetings = "Meetings"

type Meeting struct {
	AirtableID  string `json:"-"`
	ZoomID      int    `json:"Zoom ID,omityempty"`
	SlackCallID string `json:"Slack Call ID,omitempty"`

	// It actually only supports one host ID. Airtable requires that we send it
	// an array of record IDs though.
	LinkedHostIDs []string `json:"Host,omitempty"`

	StartTime *time.Time `json:"Start Time,omitempty"`
	EndTime   *time.Time `json:"End Time,omitempty"`
	JoinURL   string     `json:"Join URL,omitempty"`
}

// "33333333333" -> "333-3333-3333"
func (m Meeting) PrettyZoomID() string {
	strID := strconv.Itoa(m.ZoomID)

	return util.InsertNth(strID, '-', 4, false)
}

func (db DB) CreateMeeting(m *Meeting) error {
	contents, err := json.Marshal(m)
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
