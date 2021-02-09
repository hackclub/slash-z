package db

import (
	"encoding/json"
	"reflect"
	"strings"

	"github.com/fabioberger/airtable-go"
	"github.com/hackclub/slash-z/util"
)

type NotFoundError struct {
	s string
}

func (e *NotFoundError) Error() string {
	return e.s
}

func NewNotFoundError(e string) *NotFoundError {
	return &NotFoundError{s: e}
}

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
//
// fields annotated with the tag "formula" aren't included in the generated
// map[string]interface{}. tag fields that are equivalent to formula fields in
// airtable with this.
func prepFields(obj interface{}) map[string]interface{} {
	fields := make(map[string]interface{})

	v := reflect.ValueOf(obj)

	for i := 0; i < v.NumField(); i++ {
		tag := v.Type().Field(i).Tag.Get("json")

		// "Email,omitempty" -> ["Email", "omitempty"]
		tags := strings.Split(tag, ",")

		baseTag := tags[0]

		// skip if tag is not defined or ignored
		if baseTag == "" || baseTag == "-" {
			continue
		}

		// skip if formula is one of the tags, so we don't incorrectly try to set
		// formula fields
		if util.Contains(tags, "formula") {
			continue
		}

		fields[baseTag] = v.Field(i).Interface()
	}

	return fields
}

func getWithFormula(db DB, table, formula string) ([]envelope, error) {
	listParams := airtable.ListParameters{
		FilterByFormula: formula,
	}

	envelopes := []envelope{}

	if err := db.client.ListRecords(table, &envelopes, listParams); err != nil {
		return nil, err
	}

	return envelopes, nil
}
