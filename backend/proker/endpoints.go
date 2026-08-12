package proker

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

var db = sqldb.Named("proker")

type CreateParams struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	DivisionID  int       `json:"division_id"`
	Budget      float64   `json:"budget"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
}

type ProkerDetail struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	DivisionID  int       `json:"division_id"`
	Budget      float64   `json:"budget"`
	Status      string    `json:"status"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type ListResponse struct {
	Prokers []ProkerDetail `json:"prokers"`
}

//encore:api auth path=/proker method=POST
func Create(ctx context.Context, params *CreateParams) (*ProkerDetail, error) {
	nis, ok := auth.UserID()
	if !ok {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "not authenticated",
		}
	}

	userData := auth.Data().(*user.UserData)
	if userData.Role == "Anggota" || userData.Role == "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "only Ketua Bidang, Trimitra, or Sekretariat/Bendahara can create a proker",
		}
	}

	if userData.Role == "Ketua Bidang" && (userData.DivisionID == nil || *userData.DivisionID != params.DivisionID) {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "you can only create proker for your own division",
		}
	}

	var id int
	var createdAt time.Time
	err := db.QueryRow(ctx, `
		INSERT INTO prokers (name, description, division_id, budget, status, start_date, end_date, created_by)
		VALUES ($1, $2, $3, $4, 'Rencana', $5, $6, $7)
		RETURNING id, created_at
	`, params.Name, params.Description, params.DivisionID, params.Budget, params.StartDate, params.EndDate, string(nis)).
		Scan(&id, &createdAt)

	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	return &ProkerDetail{
		ID:          id,
		Name:        params.Name,
		Description: params.Description,
		DivisionID:  params.DivisionID,
		Budget:      params.Budget,
		Status:      "Rencana",
		StartDate:   params.StartDate,
		EndDate:     params.EndDate,
		CreatedBy:   string(nis),
		CreatedAt:   createdAt,
	}, nil
}

//encore:api auth path=/proker/:id method=GET
func Get(ctx context.Context, id int) (*ProkerDetail, error) {
	var p ProkerDetail
	err := db.QueryRow(ctx, `
		SELECT id, name, description, division_id, budget, status, start_date, end_date, created_by, created_at
		FROM prokers WHERE id = $1
	`, id).Scan(&p.ID, &p.Name, &p.Description, &p.DivisionID, &p.Budget, &p.Status, &p.StartDate, &p.EndDate, &p.CreatedBy, &p.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "proker not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	return &p, nil
}

//encore:api auth path=/prokers method=GET
func List(ctx context.Context) (*ListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, name, description, division_id, budget, status, start_date, end_date, created_by, created_at
		FROM prokers ORDER BY id DESC
	`)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	var prokers []ProkerDetail
	for rows.Next() {
		var p ProkerDetail
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.DivisionID, &p.Budget, &p.Status, &p.StartDate, &p.EndDate, &p.CreatedBy, &p.CreatedAt)
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: err.Error(),
			}
		}
		prokers = append(prokers, p)
	}

	return &ListResponse{Prokers: prokers}, nil
}

type UpdateStatusParams struct {
	Status string `json:"status"`
}

//encore:api private path=/proker/:id/status method=PUT
func UpdateStatus(ctx context.Context, id int, params *UpdateStatusParams) error {
	validStatuses := map[string]bool{
		"Rencana": true, "Berjalan": true, "Dinjau": true, "Selesai": true,
	}
	if !validStatuses[params.Status] {
		return &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "invalid status: must be one of Rencana, Berjalan, Dinjau, Selesai",
		}
	}

	res, err := db.Exec(ctx, "UPDATE prokers SET status = $1 WHERE id = $2", params.Status, id)
	if err != nil {
		return &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	rows := res.RowsAffected()
	if rows == 0 {
		return &errs.Error{
			Code:    errs.NotFound,
			Message: "proker not found",
		}
	}

	return nil
}
