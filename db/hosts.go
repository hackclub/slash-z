package db

import (
	"encoding/json"
	"errors"
	"math/rand"
	"time"

	"github.com/fabioberger/airtable-go"
)

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
