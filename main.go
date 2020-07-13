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

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("error loading .env file:", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	http.HandleFunc("/slash-z", slashZHandler)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func slashZHandler(w http.ResponseWriter, r *http.Request) {
	var (
		apiKey    = os.Getenv("ZOOM_API_KEY")
		apiSecret = os.Getenv("ZOOM_API_SECRET")
		email     = os.Getenv("ZOOM_EMAIL")
	)

	zoom.APIKey = apiKey
	zoom.APISecret = apiSecret
	zoom.Debug = true

	user, err := zoom.GetUser(zoom.GetUserOpts{EmailOrID: email})
	if err != nil {
		log.Fatalf("got error retrieving user: %+v\n", err)
	}

	fmt.Printf("%+v\n", user)

	// only allowed to call 100 times per day
	meeting, err := zoom.CreateMeeting(zoom.CreateMeetingOptions{
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
