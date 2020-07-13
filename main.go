package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/himalayan-institute/zoom-lib-golang"
	"github.com/joho/godotenv"
)

var zoomMachine ZoomMachine

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("error loading .env file:", err)
	}

	zoomMachine = ZoomMachine{
		Accounts: []ZoomAccount{
			ZoomAccount{
				APIKey:    os.Getenv("ZOOM_API_KEY"),
				APISecret: os.Getenv("ZOOM_API_SECRET"),
				Email:     os.Getenv("ZOOM_EMAIL"),
			},
		},
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	http.HandleFunc("/slash-z", slashZHandler)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func slashZHandler(w http.ResponseWriter, r *http.Request) {
	client, account, err := zoomMachine.RandomClient()
	if err != nil {
		fmt.Fprintln(w, "error getting Zoom client:", err)
		return
	}

	user, err := client.GetUser(zoom.GetUserOpts{EmailOrID: account.Email})
	if err != nil {
		log.Fatalf("got error retrieving user: %+v\n", err)
	}

	fmt.Printf("%+v\n", user)

	// only allowed to call 100 times per day
	meeting, err := client.CreateMeeting(zoom.CreateMeetingOptions{
		HostID:    user.ID,
		Type:      zoom.MeetingTypeScheduled,
		StartTime: &zoom.Time{time.Now()},
		// TODO: Add Timezone to the current Slack user's timezone
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
		log.Fatalf("got error creating meeting: %+v\n", err)
	}

	fmt.Fprintln(w, meeting.JoinURL)
}
