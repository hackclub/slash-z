package db

import (
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"time"

	"github.com/fabioberger/airtable-go"
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

func (db *DB) GetHosts() ([]Host, error) {
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

func (db *DB) UpdateHost(h Host) error {
	return db.client.UpdateRecord(TableHosts, h.AirtableID, prepFields(h), nil)
}

type Meeting struct {
	AirtableID string    `json:"-"`
	ZoomID     int       `json:"Zoom ID"`
	StartTime  time.Time `json:"Start Time"`
	EndTime    time.Time `json:"End Time"`
	Timezone   string    `json:"Timezone"`
}

// TODO
func (db *DB) CreateMeeting(zoomID string, startTime time.Time, timezone string) (Meeting, error) {
	return Meeting{}, nil
}
