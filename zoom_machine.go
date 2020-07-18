package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/hackclub/slash-z/lib/zoom"
	"github.com/hackclub/slash-z/util"
)

type ZoomAccount struct {
	APIKey    string
	APISecret string
	Email     string
	ID        string
}

type ZoomMeeting struct {
	ID  int
	URL string
}

// "33333333333" -> "333-3333-3333"
func (m ZoomMeeting) PrettyID() string {
	strID := strconv.Itoa(m.ID)

	return util.InsertNth(strID, '-', 4, false)
}

type ZoomMachine struct {
	Accounts []ZoomAccount
}

func (machine ZoomMachine) RandomClient() (*zoom.Client, ZoomAccount, error) {
	if len(machine.Accounts) == 0 {
		return nil, ZoomAccount{}, errors.New("ZoomMachine has no Accounts")
	}

	randSource := rand.NewSource(time.Now().Unix())
	rand := rand.New(randSource)

	randAccount := machine.Accounts[rand.Intn(len(machine.Accounts))]

	return zoom.NewClient(randAccount.APIKey, randAccount.APISecret), randAccount, nil
}

func (machine *ZoomMachine) CreateJoinableMeeting() (ZoomMeeting, error) {
	client, account, err := machine.RandomClient()
	if err != nil {
		return ZoomMeeting{}, err
	}

	user, err := client.GetUser(zoom.GetUserOpts{EmailOrID: account.Email})
	if err != nil {
		return ZoomMeeting{}, err
	}

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
		StartTime: &zoom.Time{time.Now()},
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
		return ZoomMeeting{}, err
	}

	meeting := ZoomMeeting{
		ID:  rawMeeting.ID,
		URL: rawMeeting.JoinURL,
	}

	return meeting, nil
}

func (machine *ZoomMachine) MockJoinableMeeting() (ZoomMeeting, error) {
	return ZoomMeeting{
		ID:  98240669677,
		URL: "https://hackclub.zoom.us/j/98240669677",
	}, nil
}

type ZoomWebhookEnvelope struct {
	Event   string `json:"event"`
	Payload struct {
		AccountID string      `json:"account_id"`
		Object    interface{} `json:"object"`
	} `json:"payload"`
}

type ZoomWebhookParticipantJoined struct {
	MeetingID   string `json:"id"`
	Participant struct {
		ID       string    `json:"id"`
		UserName string    `json:"user_name"`
		JoinTime time.Time `json:"join_time"`
	} `json:"participant"`
}

type ZoomWebhookParticipantLeft struct {
	MeetingID   string `json:"id"`
	Participant struct {
		ID        string    `json:"id"`
		UserName  string    `json:"user_name"`
		LeaveTime time.Time `json:"leave_time"`
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

		// Add every person who joins the meeting as an alternative host. Zoom
		// meetings can only have 1 active host at a time, which means that the
		// first host remains the only host - but if they later leave the meeting,
		// someone else can claim host by quitting and rejoining.
		//
		// Not sure if this actually makes sense... more of an idea that this might be helpful for now

		client, _, err := machine.RandomClient()
		if err != nil {
			return err
		}

		meetingID, err := strconv.Atoi(obj.MeetingID)
		if err != nil {
			return err
		}

		meeting, err := client.GetMeeting(zoom.GetMeetingOptions{MeetingID: meetingID})
		if err != nil {
			return err
		}

		altHosts := strings.Split(meeting.Settings.AlternativeHosts, ",")
		altHosts = util.AppendIfMissing(altHosts, obj.Participant.ID)

		err = client.UpdateMeeting(zoom.UpdateMeetingOptions{
			MeetingID: meetingID,
			Settings: zoom.MeetingSettings{
				AlternativeHosts: strings.Join(altHosts, ","),
			},
		})
		if err != nil {
			return err
		}

		// Add participant to the Slack call, so their icon shows up in the interface

		if err := slack.AddParticipantToCall(globalCallID, obj.Participant.ID, obj.Participant.UserName); err != nil {
			fmt.Println(err)
		}
	case "meeting.participant_left":
		var obj ZoomWebhookParticipantLeft
		if err := json.Unmarshal(rawObj, &obj); err != nil {
			return err
		}
		webhook.Payload.Object = obj

		if err := slack.RemoveParticipantFromCall(globalCallID, obj.Participant.ID, obj.Participant.UserName); err != nil {
			fmt.Println(err)
		}
	default:
		log.Println("unknown event type:", webhook.Event)
		return nil
	}

	return nil
}
