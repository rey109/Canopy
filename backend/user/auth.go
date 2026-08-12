package user

import (
	"context"
	"database/sql"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"
	"github.com/golang-jwt/jwt/v5"
)

var db = sqldb.Named("user")
var jwtSecret = []byte("canopy-super-secret-key-12345") // For development

type UserData struct {
	Role       string
	DivisionID *int
}

//encore:authhandler
func AuthHandler(ctx context.Context, token string) (auth.UID, *UserData, error) {
	if token == "" {
		return "", nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "missing token",
		}
	}

	claims := &jwt.RegisteredClaims{}
	t, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !t.Valid {
		return "", nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token",
		}
	}

	nis := claims.Subject

	var u UserData
	var divID sql.NullInt32
	err = db.QueryRow(ctx, "SELECT role, division_id FROM users WHERE nis = $1", nis).Scan(&u.Role, &divID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil, &errs.Error{
				Code:    errs.Unauthenticated,
				Message: "user not found",
			}
		}
		return "", nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if divID.Valid {
		val := int(divID.Int32)
		u.DivisionID = &val
	}

	return auth.UID(nis), &u, nil
}
