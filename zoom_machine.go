package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/hackclub/slash-z/db"
	"github.com/hackclub/slash-z/lib/zoom"
)

type ZoomMachine struct {
	dbc   db.DB
	slack SlackClient
}

func NewZoomMachine(c db.DB, s SlackClient) ZoomMachine {
	return ZoomMachine{dbc: c, slack: s}
}

type NoAvailableHostsError struct {
	s string
}

func (e *NoAvailableHostsError) Error() string {
	return "no available Zoom hosts: " + e.s
}

func NewNoAvailableHostsError(e string) *NoAvailableHostsError {
	return &NoAvailableHostsError{s: e}
}

func (machine ZoomMachine) AvailableHost() (db.Host, error) {
	host, err := dbc.GetAvailableHost()
	if err != nil {
		if _, ok := err.(*db.NotFoundError); ok {
			return db.Host{}, NewNoAvailableHostsError(err.Error())
		}

		return db.Host{}, err
	}

	return host, nil
}

func (machine ZoomMachine) HostToClient(h db.Host) *zoom.Client {
	return zoom.NewClient(h.APIKey, h.APISecret)
}

func (machine ZoomMachine) CreateJoinableMeeting() (db.Meeting, db.Host, error) {
	host, err := machine.AvailableHost()
	if err != nil {
		return db.Meeting{}, db.Host{}, err
	}

	client := machine.HostToClient(host)

	user, err := client.GetUser(zoom.GetUserOpts{EmailOrID: host.Email})
	if err != nil {
		return db.Meeting{}, host, err
	}

	now := time.Now()

	// Only allowed to call this 100 times per day per Zoom API limits
	//
	// We need to make this meeting as a scheduled meeting to allow the
	// JoinBeforeHost flag to be set to true, so we create a schedule meeting
	// with a start time of right now.
	//
	// TODO: Set "Timezone" to the current Slack user's timezone
	rawMeeting, err := client.CreateMeeting(zoom.CreateMeetingOptions{
		HostID:    user.ID,
		Type:      zoom.MeetingTypeScheduled,
		StartTime: &zoom.Time{now},
		Settings: zoom.MeetingSettings{
			HostVideo:        true,
			ParticipantVideo: true,
			JoinBeforeHost:   true,
			Audio:            "both",
			AlternativeHosts: "", // comma separated array
			WaitingRoom:      false,
			EnforceLogin:     false,
		},
	})
	if err != nil {
		return db.Meeting{}, host, err
	}

	meeting := db.Meeting{
		ZoomID:    rawMeeting.ID,
		JoinURL:   rawMeeting.JoinURL,
		StartedAt: &now,
	}

	return meeting, host, nil
}

func (m ZoomMachine) EndMeeting(meeting db.Meeting) error {
	if meeting.EndedAt != nil {
		return errors.New("meeting already ended")
	}

	if len(meeting.LinkedHostIDs) == 0 {
		return errors.New("no linked host ID")
	} else if len(meeting.LinkedHostIDs) > 1 {
		return errors.New("too many linked host IDs - there should only be one")
	}

	hostAirtableID := meeting.LinkedHostIDs[0]

	host, err := m.dbc.GetHostByAirtableID(hostAirtableID)
	if err != nil {
		return err
	}

	client := m.HostToClient(host)

	// Set JoinBeforeHost to false so people can no longer join the meeting.
	err = client.UpdateMeeting(zoom.UpdateMeetingOptions{
		MeetingID: meeting.ZoomID,
		Settings: zoom.MeetingSettings{
			JoinBeforeHost: false,
		},
	})
	if err != nil {
		return err
	}

	// Set the status of the meeting to "end". Note to future self: If
	// EnableJoinBeforeHost is set to true, users can still join the meeting
	// after status is set to end. That's why we manually have to set this above.
	err = client.UpdateMeetingStatus(zoom.UpdateMeetingStatusOptions{
		MeetingID: meeting.ZoomID,
		Action:    "end",
	})
	if err != nil {
		return err
	}

	callLength := time.Now().Sub(*meeting.StartedAt)

	// Mark the call as ended in Slack
	if err := slack.EndCall(meeting.SlackCallID, int(callLength.Seconds())); err != nil {
		return err
	}

	return nil
}

func (machine ZoomMachine) MockJoinableMeeting() (db.Meeting, db.Host, error) {
	host, err := machine.AvailableHost()
	if err != nil {
		return db.Meeting{}, db.Host{}, err
	}

	current := time.Now()

	return db.Meeting{
		ZoomID:    98240669677,
		JoinURL:   "https://hackclub.zoom.us/j/98240669677",
		StartedAt: &current,
	}, host, nil
}

// On a regular interval, check currently active meetings for the number of
// participants, increase the IdleTime field if they are inactive, after enough
// inactivity, end the call.
func (m ZoomMachine) RunIdleTimer() error {
	for {
		meetings, err := m.dbc.GetActiveMeetings()
		if err != nil {
			if _, ok := err.(*db.NotFoundError); ok {
				fmt.Println("no active meetings found, continuing")

				time.Sleep(10 * time.Second)
				continue
			}

			return err
		}

		for _, meeting := range meetings {
			// if the meeting has users in it...
			if meeting.CurrentActiveUsers > 0 {
				// and it is currently set as an idle meeting..
				if meeting.IdlingSince != nil {
					// remove the idle status.
					meeting.IdlingSince = nil

					if m.dbc.UpdateMeeting(&meeting); err != nil {
						return err
					}
				}

				// and it is not currently idle, then ignore it
				continue
			}

			// if meeting does not have users in it..

			// and it's set to idle...
			if meeting.IdlingSince != nil {
				elapsed := time.Now().Sub(*meeting.IdlingSince)

				fmt.Println(meeting.ZoomID, "has been idling for", elapsed)

				// if it's been less than one minute, ignore
				if elapsed.Minutes() < 1 {
					continue
				}

				// Actually end the meeting with Zoom's API and update Slack too
				if err := m.EndMeeting(meeting); err != nil {
					return err
				}

				// else end the meeting
				current := time.Now()
				meeting.EndedAt = &current

				if m.dbc.UpdateMeeting(&meeting); err != nil {
					return err
				}

				continue
			}

			// and it's not set to idle...
			if meeting.IdlingSince == nil {
				// mark it as idle.
				current := time.Now()
				meeting.IdlingSince = &current

				if m.dbc.UpdateMeeting(&meeting); err != nil {
					return err
				}

				continue
			}

		}

		time.Sleep(10 * time.Second)
	}

	return nil
}

type ZoomWebhookEnvelope struct {
	Event   string `json:"event"`
	Payload struct {
		AccountID string      `json:"account_id"`
		Object    interface{} `json:"object"`
	} `json:"payload"`
}

type ZoomWebhookParticipantJoined struct {
	HostID      string `json:"host_id"`
	MeetingID   string `json:"id"`
	Participant struct {
		ZoomID       string    `json:"id"`
		PerMeetingID string    `json:"user_id"`
		UserName     string    `json:"user_name"`
		JoinTime     time.Time `json:"join_time"`
	} `json:"participant"`
}

type ZoomWebhookParticipantLeft struct {
	HostID      string `json:"host_id"`
	MeetingID   string `json:"id"`
	Participant struct {
		ZoomID       string    `json:"id"`
		PerMeetingID string    `json:"user_id"`
		UserName     string    `json:"user_name"`
		LeaveTime    time.Time `json:"leave_time"`
	} `json:"participant"`
}

// Parsing method from "Combining the powers of *json.RawMessage and
// interface{}" section of https://eagain.net/articles/go-dynamic-json/
func (machine *ZoomMachine) ProcessWebhook(bytes []byte) error {
	var rawObj json.RawMessage
	var webhook ZoomWebhookEnvelope

	webhook.Payload.Object = &rawObj

	if err := json.Unmarshal(bytes, &webhook); err != nil {
		return err
	}

	switch webhook.Event {
	case "meeting.participant_joined":
		var obj ZoomWebhookParticipantJoined
		if err := json.Unmarshal(rawObj, &obj); err != nil {
			return err
		}
		webhook.Payload.Object = obj

		// DB actions

		meeting, err := dbc.GetMeeting(obj.MeetingID)
		if err != nil {
			// check if db.NotFoundError
			if _, ok := err.(*db.NotFoundError); ok {
				fmt.Println("ignoring meeting " + obj.MeetingID + " because it wasn't found in the db")
				break
			}

			fmt.Println("failed to get meeting from DB:", err)
			break
		}

		pe := db.ParticipantEvent{
			Time:                    obj.Participant.JoinTime,
			LinkedMeetingIDs:        []string{meeting.AirtableID},
			Type:                    "Joined",
			ParticipantName:         obj.Participant.UserName,
			ParticipantPerMeetingID: obj.Participant.PerMeetingID,
			ParticipantZoomID:       obj.Participant.ZoomID,
		}

		if err := dbc.CreateParticipantEvent(&pe); err != nil {
			fmt.Println(err)
			break
		}

		// Add participant to the Slack call, so their icon shows up in the interface

		if err := slack.AddParticipantToCall(
			meeting.SlackCallID,
			pe.ParticipantPerMeetingID,
			pe.ParticipantName,
		); err != nil {
			fmt.Println(err)
			break
		}
	case "meeting.participant_left":
		var obj ZoomWebhookParticipantLeft
		if err := json.Unmarshal(rawObj, &obj); err != nil {
			return err
		}
		webhook.Payload.Object = obj

		meeting, err := dbc.GetMeeting(obj.MeetingID)
		if err != nil {
			fmt.Println("failed to get meeting from DB:", err)
			break
		}

		pe := db.ParticipantEvent{
			Time:                    obj.Participant.LeaveTime,
			LinkedMeetingIDs:        []string{meeting.AirtableID},
			Type:                    "Left",
			ParticipantName:         obj.Participant.UserName,
			ParticipantPerMeetingID: obj.Participant.PerMeetingID,
			ParticipantZoomID:       obj.Participant.ZoomID,
		}

		if err := dbc.CreateParticipantEvent(&pe); err != nil {
			fmt.Println(err)
			break
		}

		if err := slack.RemoveParticipantFromCall(
			meeting.SlackCallID,
			pe.ParticipantPerMeetingID,
			pe.ParticipantName,
		); err != nil {
			fmt.Println(err)
		}
	default:
		log.Println("unknown event type:", webhook.Event)
		return nil
	}

	return nil
}
