package db

import (
	"encoding/json"
	"time"
)

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
