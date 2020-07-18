package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/hackclub/slash-z/db"
	"github.com/hackclub/slash-z/lib/zoom"
)

type ZoomMachine struct {
	Hosts []db.Host
}

func (machine ZoomMachine) RandomHost() db.Host {
	randSource := rand.NewSource(time.Now().Unix())
	rand := rand.New(randSource)

	randHost := machine.Hosts[rand.Intn(len(machine.Hosts))]

	return randHost
}

func (machine ZoomMachine) HostToClient(h db.Host) *zoom.Client {
	return zoom.NewClient(h.APIKey, h.APISecret)
}

func (machine ZoomMachine) CreateJoinableMeeting() (db.Meeting, db.Host, error) {
	host := machine.RandomHost()
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
		StartTime: &now,
	}

	return meeting, host, nil
}

func (machine ZoomMachine) MockJoinableMeeting() (db.Meeting, db.Host, error) {
	now := time.Now()

	fmt.Println(machine)

	return db.Meeting{
		ZoomID:    98240669677,
		JoinURL:   "https://hackclub.zoom.us/j/98240669677",
		StartTime: &now,
	}, machine.Hosts[0], nil
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
