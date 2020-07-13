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
