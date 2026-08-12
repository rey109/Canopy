package public

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.Named("public")

// --- Aspirations ---

type AspirationDetail struct {
	ID          int       `json:"id"`
	Content     string    `json:"content"`
	IsAnonymous bool      `json:"is_anonymous"`
	UserNIS     *string   `json:"user_nis"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type SubmitAspirationParams struct {
	Content     string `json:"content"`
	IsAnonymous bool   `json:"is_anonymous"`
}

type ListAspirationsResponse struct {
	Aspirations []AspirationDetail `json:"aspirations"`
}

type UpdateAspirationStatusParams struct {
	Status string `json:"status"` // 'Diterima', 'Diproses', 'Ditindaklanjuti'
}

// --- Events ---

type EventDetail struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateEventParams struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
}

type ListEventsResponse struct {
	Events []EventDetail `json:"events"`
}

// --- Registrations ---

type RegistrationDetail struct {
	ID        int       `json:"id"`
	EventID   int       `json:"event_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

type RegisterEventParams struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

type ListRegistrationsResponse struct {
	Registrations []RegistrationDetail `json:"registrations"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

// ========================
// ASPIRATION ENDPOINTS
// ========================

//encore:api public path=/public/aspiration method=POST
func SubmitAspiration(ctx context.Context, params *SubmitAspirationParams) (*AspirationDetail, error) {
	var userNIS sql.NullString
	if !params.IsAnonymous {
		nis, ok := auth.UserID()
		if ok {
			userNIS.Valid = true
			userNIS.String = string(nis)
		}
	}

	var a AspirationDetail
	var uNIS sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO aspirations (content, is_anonymous, user_nis)
		VALUES ($1, $2, $3)
		RETURNING id, content, is_anonymous, user_nis, status, created_at
	`, params.Content, params.IsAnonymous, userNIS).
		Scan(&a.ID, &a.Content, &a.IsAnonymous, &uNIS, &a.Status, &a.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if uNIS.Valid {
		a.UserNIS = &uNIS.String
	}
	return &a, nil
}

//encore:api auth path=/public/aspirations method=GET
func ListAspirations(ctx context.Context) (*ListAspirationsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, content, is_anonymous, user_nis, status, created_at
		FROM aspirations ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var aspirations []AspirationDetail
	for rows.Next() {
		var a AspirationDetail
		var uNIS sql.NullString
		err := rows.Scan(&a.ID, &a.Content, &a.IsAnonymous, &uNIS, &a.Status, &a.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if uNIS.Valid {
			a.UserNIS = &uNIS.String
		}
		aspirations = append(aspirations, a)
	}
	return &ListAspirationsResponse{Aspirations: aspirations}, nil
}

//encore:api auth path=/public/aspiration/:id/status method=PUT
func UpdateAspirationStatus(ctx context.Context, id int, params *UpdateAspirationStatusParams) (*MessageResponse, error) {
	userData := auth.Data().(*user.UserData)
	if userData.Role != "Trimitra" && userData.Role != "Sekretariat" && userData.Role != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "insufficient permissions to update aspiration status",
		}
	}

	valid := map[string]bool{"Diterima": true, "Diproses": true, "Ditindaklanjuti": true}
	if !valid[params.Status] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "invalid status"}
	}

	res, err := db.Exec(ctx, "UPDATE aspirations SET status = $1 WHERE id = $2", params.Status, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	rows := res.RowsAffected()
	if rows == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "aspiration not found"}
	}
	return &MessageResponse{Message: "Aspiration status updated"}, nil
}

// ========================
// EVENT ENDPOINTS
// ========================

//encore:api auth path=/public/event method=POST
func CreateEvent(ctx context.Context, params *CreateEventParams) (*EventDetail, error) {
	nis, _ := auth.UserID()
	var e EventDetail
	err := db.QueryRow(ctx, `
		INSERT INTO events (name, description, date, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, description, date, created_by, created_at
	`, params.Name, params.Description, params.Date, string(nis)).
		Scan(&e.ID, &e.Name, &e.Description, &e.Date, &e.CreatedBy, &e.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &e, nil
}

//encore:api public path=/public/events method=GET
func ListEvents(ctx context.Context) (*ListEventsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, name, description, date, created_by, created_at
		FROM events ORDER BY date DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var events []EventDetail
	for rows.Next() {
		var e EventDetail
		err := rows.Scan(&e.ID, &e.Name, &e.Description, &e.Date, &e.CreatedBy, &e.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		events = append(events, e)
	}
	return &ListEventsResponse{Events: events}, nil
}

//encore:api public path=/public/event/:id method=GET
func GetEvent(ctx context.Context, id int) (*EventDetail, error) {
	var e EventDetail
	err := db.QueryRow(ctx, `
		SELECT id, name, description, date, created_by, created_at
		FROM events WHERE id = $1
	`, id).Scan(&e.ID, &e.Name, &e.Description, &e.Date, &e.CreatedBy, &e.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "event not found"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &e, nil
}

// ========================
// REGISTRATION ENDPOINTS
// ========================

//encore:api public path=/public/event/:id/register method=POST
func RegisterForEvent(ctx context.Context, id int, params *RegisterEventParams) (*RegistrationDetail, error) {
	var r RegistrationDetail
	err := db.QueryRow(ctx, `
		INSERT INTO registrations (event_id, name, email, phone)
		VALUES ($1, $2, $3, $4)
		RETURNING id, event_id, name, email, phone, created_at
	`, id, params.Name, params.Email, params.Phone).
		Scan(&r.ID, &r.EventID, &r.Name, &r.Email, &r.Phone, &r.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &r, nil
}

//encore:api auth path=/public/event/:id/registrations method=GET
func ListRegistrations(ctx context.Context, id int) (*ListRegistrationsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, event_id, name, email, phone, created_at
		FROM registrations WHERE event_id = $1 ORDER BY created_at ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var regs []RegistrationDetail
	for rows.Next() {
		var r RegistrationDetail
		err := rows.Scan(&r.ID, &r.EventID, &r.Name, &r.Email, &r.Phone, &r.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		regs = append(regs, r)
	}
	return &ListRegistrationsResponse{Registrations: regs}, nil
}
