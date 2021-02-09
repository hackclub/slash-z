package db

import (
	"encoding/json"
	"fmt"
	"log"
	"runtime/debug"
	"time"
)

const TableErrors = "Errors"

type Error struct {
	AirtableID string    `json:"-"`
	Time       time.Time `json:"Time,omitempty"`
	Text       string    `json:"Text,omitempty"`
	StackTrace string    `json:"Stack Trace,omitempty"`
}

func (db DB) CreateError(time time.Time, inputErr error, stack []byte) (Error, error) {
	er := Error{
		Time:       time,
		Text:       inputErr.Error(),
		StackTrace: string(stack),
	}

	contents, err := json.Marshal(prepFields(er))
	if err != nil {
		return Error{}, err
	}

	e := envelope{Object: contents}

	if err := db.client.CreateRecord(TableErrors, &e); err != nil {
		return Error{}, err
	}

	if err := json.Unmarshal(e.Object, &er); err != nil {
		return Error{}, err
	}

	er.AirtableID = e.AirtableID

	return er, nil
}

func (db DB) LogError(inputErr error) error {
	stack := debug.Stack()

	log.Println("Error:", inputErr)
	fmt.Println(string(stack))

	if _, err := db.CreateError(time.Now(), inputErr, debug.Stack()); err != nil {
		return err
	}

	return nil
}
