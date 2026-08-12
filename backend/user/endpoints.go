package user

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type RegisterParams struct {
	NIS              string `json:"nis"`
	Name             string `json:"name"`
	Major            string `json:"major"`
	Class            string `json:"class"`
	Role             string `json:"role"`
	DivisionID       *int   `json:"division_id"`
	ManagementPeriod string `json:"management_period"`
	Password         string `json:"password"`
}

type RegisterResponse struct {
	Message string `json:"message"`
}

type LoginParams struct {
	NIS      string `json:"nis"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string     `json:"token"`
	User  UserDetail `json:"user"`
}

type UserDetail struct {
	NIS              string `json:"nis"`
	Name             string `json:"name"`
	Major            string `json:"major"`
	Class            string `json:"class"`
	Role             string `json:"role"`
	DivisionID       *int   `json:"division_id"`
	ManagementPeriod string `json:"management_period"`
}

type ListUsersResponse struct {
	Users []UserDetail `json:"users"`
}

//encore:api public path=/user/register method=POST
func Register(ctx context.Context, params *RegisterParams) (*RegisterResponse, error) {
	if params.NIS == "" || params.Name == "" || params.Password == "" || params.Role == "" {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "NIS, Name, Password, and Role are required fields",
		}
	}

	validRoles := map[string]bool{
		"Pembina": true, "Trimitra": true, "Sekretariat": true, "Bendahara": true, "Ketua Bidang": true, "Anggota": true,
	}
	if !validRoles[params.Role] {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "invalid role: must be one of Pembina, Trimitra, Sekretariat, Bendahara, Ketua Bidang, Anggota",
		}
	}

	var exists bool
	err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE nis = $1)", params.NIS).Scan(&exists)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	if exists {
		return nil, &errs.Error{
			Code:    errs.AlreadyExists,
			Message: "user with this NIS already exists",
		}
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "failed to hash password",
		}
	}

	var divID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}

	_, err = db.Exec(ctx, `
		INSERT INTO users (nis, name, major, class, role, division_id, management_period, password_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, params.NIS, params.Name, params.Major, params.Class, params.Role, divID, params.ManagementPeriod, string(hashed))
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	return &RegisterResponse{Message: "User registered successfully"}, nil
}

//encore:api public path=/user/login method=POST
func Login(ctx context.Context, params *LoginParams) (*LoginResponse, error) {
	var u UserDetail
	var passHash string
	var divID sql.NullInt32

	err := db.QueryRow(ctx, `
		SELECT nis, name, major, class, role, division_id, management_period, password_hash
		FROM users WHERE nis = $1
	`, params.NIS).Scan(&u.NIS, &u.Name, &u.Major, &u.Class, &u.Role, &divID, &u.ManagementPeriod, &passHash)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.Unauthenticated,
				Message: "invalid NIS or password",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	err = bcrypt.CompareHashAndPassword([]byte(passHash), []byte(params.Password))
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid NIS or password",
		}
	}

	if divID.Valid {
		val := int(divID.Int32)
		u.DivisionID = &val
	}

	claims := &jwt.RegisteredClaims{
		Subject:   u.NIS,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "failed to generate token",
		}
	}

	return &LoginResponse{
		Token: tokenString,
		User:  u,
	}, nil
}

//encore:api auth path=/user/profile method=GET
func GetProfile(ctx context.Context) (*UserDetail, error) {
	nis, ok := auth.UserID()
	if !ok {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "not authenticated",
		}
	}

	var u UserDetail
	var divID sql.NullInt32
	err := db.QueryRow(ctx, `
		SELECT nis, name, major, class, role, division_id, management_period
		FROM users WHERE nis = $1
	`, string(nis)).Scan(&u.NIS, &u.Name, &u.Major, &u.Class, &u.Role, &divID, &u.ManagementPeriod)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "user profile not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if divID.Valid {
		val := int(divID.Int32)
		u.DivisionID = &val
	}

	return &u, nil
}

//encore:api auth path=/users method=GET
func ListUsers(ctx context.Context) (*ListUsersResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT nis, name, major, class, role, division_id, management_period
		FROM users
	`)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	var users []UserDetail
	for rows.Next() {
		var u UserDetail
		var divID sql.NullInt32
		err := rows.Scan(&u.NIS, &u.Name, &u.Major, &u.Class, &u.Role, &divID, &u.ManagementPeriod)
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: err.Error(),
			}
		}
		if divID.Valid {
			val := int(divID.Int32)
			u.DivisionID = &val
		}
		users = append(users, u)
	}

	return &ListUsersResponse{Users: users}, nil
}

//encore:api auth path=/users/:nis method=GET
func GetUser(ctx context.Context, nis string) (*UserDetail, error) {
	var u UserDetail
	var divID sql.NullInt32
	err := db.QueryRow(ctx, `
		SELECT nis, name, major, class, role, division_id, management_period
		FROM users WHERE nis = $1
	`, nis).Scan(&u.NIS, &u.Name, &u.Major, &u.Class, &u.Role, &divID, &u.ManagementPeriod)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "user not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if divID.Valid {
		val := int(divID.Int32)
		u.DivisionID = &val
	}

	return &u, nil
}

type UpdateDivisionParams struct {
	DivisionID *int `json:"division_id"`
}

//encore:api private path=/users/:nis/division method=PUT
func UpdateUserDivision(ctx context.Context, nis string, params *UpdateDivisionParams) error {
	var divID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}

	_, err := db.Exec(ctx, "UPDATE users SET division_id = $1 WHERE nis = $2", divID, nis)
	return err
}
