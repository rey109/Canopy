package user

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestPasswordHashing(t *testing.T) {
	password := "superSecret123"

	// Hash the password
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	// Compare correct password
	err = bcrypt.CompareHashAndPassword(hashed, []byte(password))
	if err != nil {
		t.Errorf("expected password to match, but got error: %v", err)
	}

	// Compare incorrect password
	err = bcrypt.CompareHashAndPassword(hashed, []byte("wrongPassword"))
	if err == nil {
		t.Error("expected comparison to fail for incorrect password, but it succeeded")
	}
}
