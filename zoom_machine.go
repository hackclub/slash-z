package main

import (
	"errors"
	"math/rand"
	"time"

	"github.com/himalayan-institute/zoom-lib-golang"
)

type ZoomAccount struct {
	APIKey    string
	APISecret string
	Email     string
}

type ZoomMeeting struct {
	ID  int
	URL string
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
