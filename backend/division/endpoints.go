package division

import (
	"context"
	"database/sql"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.Named("division")

type DivisionDetail struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	ChairNIS    *string `json:"chair_nis"`
}

type ListDivisionsResponse struct {
	Divisions []DivisionDetail `json:"divisions"`
}

type AssignChairParams struct {
	DivisionID int    `json:"division_id"`
	ChairNIS   string `json:"chair_nis"`
}

type AssignChairResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/division method=GET
func ListDivisions(ctx context.Context) (*ListDivisionsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, name, description, chair_nis FROM divisions ORDER BY id ASC")
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	var divisions []DivisionDetail
	for rows.Next() {
		var d DivisionDetail
		var chair sql.NullString
		err := rows.Scan(&d.ID, &d.Name, &d.Description, &chair)
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: err.Error(),
			}
		}
		if chair.Valid {
			d.ChairNIS = &chair.String
		}
		divisions = append(divisions, d)
	}

	return &ListDivisionsResponse{Divisions: divisions}, nil
}

//encore:api auth path=/division/:id method=GET
func GetDivision(ctx context.Context, id int) (*DivisionDetail, error) {
	var d DivisionDetail
	var chair sql.NullString
	err := db.QueryRow(ctx, "SELECT id, name, description, chair_nis FROM divisions WHERE id = $1", id).
		Scan(&d.ID, &d.Name, &d.Description, &chair)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "division not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	if chair.Valid {
		d.ChairNIS = &chair.String
	}
	return &d, nil
}

//encore:api auth path=/division/assign-chair method=POST
func AssignChair(ctx context.Context, params *AssignChairParams) (*AssignChairResponse, error) {
	// Access calling user's role
	userData, ok := auth.Data().(*user.UserData)
	if !ok || (userData.Role != "Trimitra" && userData.Role != "Pembina") {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "only Trimitra or Pembina can assign division chairperson",
		}
	}

	// Verify division exists and get current chairperson
	var currentChair sql.NullString
	err := db.QueryRow(ctx, "SELECT chair_nis FROM divisions WHERE id = $1", params.DivisionID).Scan(&currentChair)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "division not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	// Verify new chairperson exists in user service
	u, err := user.GetUser(ctx, params.ChairNIS)
	if err != nil {
		return nil, err
	}

	// Reset previous chairperson's division_id to null (if there was one and it is different)
	if currentChair.Valid && currentChair.String != params.ChairNIS {
		err = user.UpdateUserDivision(ctx, currentChair.String, &user.UpdateDivisionParams{DivisionID: nil})
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: "failed to clear previous chairperson's division: " + err.Error(),
			}
		}
	}

	// Update new chairperson's division_id to this division
	err = user.UpdateUserDivision(ctx, params.ChairNIS, &user.UpdateDivisionParams{DivisionID: &params.DivisionID})
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "failed to set new chairperson's division: " + err.Error(),
		}
	}

	// Update division's chair_nis in division database
	_, err = db.Exec(ctx, "UPDATE divisions SET chair_nis = $1 WHERE id = $2", params.ChairNIS, params.DivisionID)
	if err != nil {
		// Attempt rollback of user's division_id update
		_ = user.UpdateUserDivision(ctx, params.ChairNIS, &user.UpdateDivisionParams{DivisionID: u.DivisionID})
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "failed to update division chairperson: " + err.Error(),
		}
	}

	return &AssignChairResponse{Message: "Chairperson assigned successfully"}, nil
}
