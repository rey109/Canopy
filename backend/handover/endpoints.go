package handover

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.Named("handover")

type HandoverDetail struct {
	ID                int             `json:"id"`
	Period            string          `json:"period"`
	FinalBalance      float64         `json:"final_balance"`
	UnfinishedProker  json.RawMessage `json:"unfinished_proker"`
	VendorContacts    json.RawMessage `json:"vendor_contacts"`
	SignatureOldKetua string          `json:"signature_old_ketua"`
	SignatureNewKetua string          `json:"signature_new_ketua"`
	SignaturePembina  string          `json:"signature_pembina"`
	CreatedAt         time.Time       `json:"created_at"`
}

type CreateHandoverParams struct {
	Period           string          `json:"period"`
	FinalBalance     float64         `json:"final_balance"`
	UnfinishedProker json.RawMessage `json:"unfinished_proker"`
	VendorContacts   json.RawMessage `json:"vendor_contacts"`
}

type SignParams struct {
	SignatureRole string `json:"signature_role"` // 'old_ketua', 'new_ketua', 'pembina'
	Signature     string `json:"signature"`      // base64 or URL
}

type ListResponse struct {
	Handovers []HandoverDetail `json:"handovers"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/handover method=POST
func Create(ctx context.Context, params *CreateHandoverParams) (*HandoverDetail, error) {
	userData := auth.Data().(*user.UserData)
	if userData.Role != "Trimitra" && userData.Role != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "only Trimitra or Pembina can create handover records",
		}
	}

	unfinished := params.UnfinishedProker
	if unfinished == nil {
		unfinished = json.RawMessage("[]")
	}
	vendors := params.VendorContacts
	if vendors == nil {
		vendors = json.RawMessage("[]")
	}

	var h HandoverDetail
	err := db.QueryRow(ctx, `
		INSERT INTO handover_records (period, final_balance, unfinished_proker, vendor_contacts)
		VALUES ($1, $2, $3, $4)
		RETURNING id, period, final_balance, unfinished_proker, vendor_contacts,
		          signature_old_ketua, signature_new_ketua, signature_pembina, created_at
	`, params.Period, params.FinalBalance, string(unfinished), string(vendors)).
		Scan(&h.ID, &h.Period, &h.FinalBalance, &h.UnfinishedProker, &h.VendorContacts,
			&h.SignatureOldKetua, &h.SignatureNewKetua, &h.SignaturePembina, &h.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &h, nil
}

//encore:api auth path=/handovers method=GET
func List(ctx context.Context) (*ListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, period, final_balance, unfinished_proker, vendor_contacts,
		       signature_old_ketua, signature_new_ketua, signature_pembina, created_at
		FROM handover_records ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var handovers []HandoverDetail
	for rows.Next() {
		var h HandoverDetail
		err := rows.Scan(&h.ID, &h.Period, &h.FinalBalance, &h.UnfinishedProker, &h.VendorContacts,
			&h.SignatureOldKetua, &h.SignatureNewKetua, &h.SignaturePembina, &h.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		handovers = append(handovers, h)
	}
	return &ListResponse{Handovers: handovers}, nil
}

//encore:api auth path=/handover/:id method=GET
func Get(ctx context.Context, id int) (*HandoverDetail, error) {
	var h HandoverDetail
	err := db.QueryRow(ctx, `
		SELECT id, period, final_balance, unfinished_proker, vendor_contacts,
		       signature_old_ketua, signature_new_ketua, signature_pembina, created_at
		FROM handover_records WHERE id = $1
	`, id).Scan(&h.ID, &h.Period, &h.FinalBalance, &h.UnfinishedProker, &h.VendorContacts,
		&h.SignatureOldKetua, &h.SignatureNewKetua, &h.SignaturePembina, &h.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "handover record not found"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &h, nil
}

//encore:api auth path=/handover/:id/sign method=POST
func Sign(ctx context.Context, id int, params *SignParams) (*MessageResponse, error) {
	userData := auth.Data().(*user.UserData)

	var column string
	switch params.SignatureRole {
	case "old_ketua":
		if userData.Role != "Trimitra" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "only Trimitra (old ketua) can sign as old_ketua"}
		}
		column = "signature_old_ketua"
	case "new_ketua":
		if userData.Role != "Trimitra" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "only Trimitra (new ketua) can sign as new_ketua"}
		}
		column = "signature_new_ketua"
	case "pembina":
		if userData.Role != "Pembina" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "only Pembina can sign as pembina"}
		}
		column = "signature_pembina"
	default:
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "signature_role must be 'old_ketua', 'new_ketua', or 'pembina'"}
	}

	res, err := db.Exec(ctx, "UPDATE handover_records SET "+column+" = $1 WHERE id = $2", params.Signature, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	rows := res.RowsAffected()
	if rows == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "handover record not found"}
	}
	return &MessageResponse{Message: "Handover signed successfully"}, nil
}
