package asset

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"
)

var db = sqldb.Named("asset")

type AssetDetail struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type BookingDetail struct {
	ID        int       `json:"id"`
	AssetID   int       `json:"asset_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	ProkerID  *int      `json:"proker_id"`
	BookedBy  string    `json:"booked_by"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateAssetParams struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreateBookingParams struct {
	AssetID   int       `json:"asset_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	ProkerID  *int      `json:"proker_id"`
}

type ListAssetsResponse struct {
	Assets []AssetDetail `json:"assets"`
}

type ListBookingsResponse struct {
	Bookings []BookingDetail `json:"bookings"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/asset method=POST
func CreateAsset(ctx context.Context, params *CreateAssetParams) (*AssetDetail, error) {
	var a AssetDetail
	err := db.QueryRow(ctx, `
		INSERT INTO assets (name, description) VALUES ($1, $2)
		RETURNING id, name, description, status, created_at
	`, params.Name, params.Description).Scan(&a.ID, &a.Name, &a.Description, &a.Status, &a.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &a, nil
}

//encore:api auth path=/assets method=GET
func ListAssets(ctx context.Context) (*ListAssetsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, name, description, status, created_at FROM assets ORDER BY id ASC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var assets []AssetDetail
	for rows.Next() {
		var a AssetDetail
		err := rows.Scan(&a.ID, &a.Name, &a.Description, &a.Status, &a.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		assets = append(assets, a)
	}
	return &ListAssetsResponse{Assets: assets}, nil
}

//encore:api auth path=/asset/:id method=GET
func GetAsset(ctx context.Context, id int) (*AssetDetail, error) {
	var a AssetDetail
	err := db.QueryRow(ctx, "SELECT id, name, description, status, created_at FROM assets WHERE id = $1", id).
		Scan(&a.ID, &a.Name, &a.Description, &a.Status, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "asset not found"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &a, nil
}

//encore:api auth path=/asset/book method=POST
func Book(ctx context.Context, params *CreateBookingParams) (*BookingDetail, error) {
	nis, _ := auth.UserID()

	// Check for booking clash
	var clashCount int
	err := db.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookings
		WHERE asset_id = $1 AND start_time < $3 AND end_time > $2
	`, params.AssetID, params.StartTime, params.EndTime).Scan(&clashCount)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if clashCount > 0 {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "booking clash detected: the asset is already booked for the requested time range",
		}
	}

	var prokerID sql.NullInt32
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	var b BookingDetail
	var pID sql.NullInt32
	err = db.QueryRow(ctx, `
		INSERT INTO bookings (asset_id, start_time, end_time, proker_id, booked_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, asset_id, start_time, end_time, proker_id, booked_by, created_at
	`, params.AssetID, params.StartTime, params.EndTime, prokerID, string(nis)).
		Scan(&b.ID, &b.AssetID, &b.StartTime, &b.EndTime, &pID, &b.BookedBy, &b.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if pID.Valid {
		v := int(pID.Int32)
		b.ProkerID = &v
	}
	return &b, nil
}

//encore:api auth path=/asset/:id/bookings method=GET
func ListBookings(ctx context.Context, id int) (*ListBookingsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, asset_id, start_time, end_time, proker_id, booked_by, created_at
		FROM bookings WHERE asset_id = $1 ORDER BY start_time ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var bookings []BookingDetail
	for rows.Next() {
		var b BookingDetail
		var pID sql.NullInt32
		err := rows.Scan(&b.ID, &b.AssetID, &b.StartTime, &b.EndTime, &pID, &b.BookedBy, &b.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if pID.Valid {
			v := int(pID.Int32)
			b.ProkerID = &v
		}
		bookings = append(bookings, b)
	}
	return &ListBookingsResponse{Bookings: bookings}, nil
}
