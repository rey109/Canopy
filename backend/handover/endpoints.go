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

var db = sqldb.NewDatabase("handover", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

type HandoverDetail struct {
	ID                  int             `json:"id"`
	PeriodeLama         string          `json:"periode_lama"`
	PeriodeBaru         string          `json:"periode_baru"`
	SaldoAkhir          float64         `json:"saldo_akhir"`
	ProkerBelumSelesai  json.RawMessage `json:"proker_belum_selesai"`
	KontakVendor        json.RawMessage `json:"kontak_vendor"`
	Catatan             string          `json:"catatan"`
	SignatureKetuaLama  string          `json:"signature_ketua_lama"`
	SignatureKetuaBaru  string          `json:"signature_ketua_baru"`
	SignaturePembina    string          `json:"signature_pembina"`
	DibuatOleh          string          `json:"dibuat_oleh"`
	CreatedAt           time.Time       `json:"created_at"`
}

type CreateHandoverParams struct {
	PeriodeLama        string          `json:"periode_lama"`
	PeriodeBaru        string          `json:"periode_baru"`
	SaldoAkhir         float64         `json:"saldo_akhir"`
	ProkerBelumSelesai json.RawMessage `json:"proker_belum_selesai"`
	KontakVendor       json.RawMessage `json:"kontak_vendor"`
	Catatan            string          `json:"catatan"`
}

type SignParams struct {
	SignatureRole string `json:"signature_role"` // 'ketua_lama', 'ketua_baru', 'pembina'
	Signature     string `json:"signature"`      // base64 atau URL
}

type ListResponse struct {
	Handovers []HandoverDetail `json:"handovers"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/handover method=POST
func Create(ctx context.Context, params *CreateHandoverParams) (*HandoverDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Trimitra yang dapat mengelola proses serah terima",
		}
	}

	proker := params.ProkerBelumSelesai
	if proker == nil {
		proker = json.RawMessage("[]")
	}
	vendor := params.KontakVendor
	if vendor == nil {
		vendor = json.RawMessage("[]")
	}

	var h HandoverDetail
	err := db.QueryRow(ctx, `
		INSERT INTO handover_records
			(periode_lama, periode_baru, saldo_akhir, proker_belum_selesai,
			 kontak_vendor, catatan, dibuat_oleh)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, periode_lama, periode_baru, saldo_akhir,
		          proker_belum_selesai, kontak_vendor, catatan,
		          signature_ketua_lama, signature_ketua_baru,
		          signature_pembina, dibuat_oleh, created_at
	`, params.PeriodeLama, params.PeriodeBaru, params.SaldoAkhir,
		string(proker), string(vendor), params.Catatan, string(nis)).
		Scan(
			&h.ID, &h.PeriodeLama, &h.PeriodeBaru, &h.SaldoAkhir,
			&h.ProkerBelumSelesai, &h.KontakVendor, &h.Catatan,
			&h.SignatureKetuaLama, &h.SignatureKetuaBaru,
			&h.SignaturePembina, &h.DibuatOleh, &h.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &h, nil
}

//encore:api auth path=/handovers method=GET
func List(ctx context.Context) (*ListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, periode_lama, periode_baru, saldo_akhir,
		       proker_belum_selesai, kontak_vendor, catatan,
		       signature_ketua_lama, signature_ketua_baru,
		       signature_pembina, dibuat_oleh, created_at
		FROM handover_records ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []HandoverDetail
	for rows.Next() {
		var h HandoverDetail
		if err := rows.Scan(
			&h.ID, &h.PeriodeLama, &h.PeriodeBaru, &h.SaldoAkhir,
			&h.ProkerBelumSelesai, &h.KontakVendor, &h.Catatan,
			&h.SignatureKetuaLama, &h.SignatureKetuaBaru,
			&h.SignaturePembina, &h.DibuatOleh, &h.CreatedAt,
		); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, h)
	}
	return &ListResponse{Handovers: list}, nil
}

//encore:api auth path=/handover/:id method=GET
func Get(ctx context.Context, id int) (*HandoverDetail, error) {
	var h HandoverDetail
	err := db.QueryRow(ctx, `
		SELECT id, periode_lama, periode_baru, saldo_akhir,
		       proker_belum_selesai, kontak_vendor, catatan,
		       signature_ketua_lama, signature_ketua_baru,
		       signature_pembina, dibuat_oleh, created_at
		FROM handover_records WHERE id = $1
	`, id).Scan(
		&h.ID, &h.PeriodeLama, &h.PeriodeBaru, &h.SaldoAkhir,
		&h.ProkerBelumSelesai, &h.KontakVendor, &h.Catatan,
		&h.SignatureKetuaLama, &h.SignatureKetuaBaru,
		&h.SignaturePembina, &h.DibuatOleh, &h.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "catatan serah terima tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &h, nil
}

//encore:api auth path=/handover/:id/sign method=POST
func Sign(ctx context.Context, id int, params *SignParams) (*MessageResponse, error) {
	ud := auth.Data().(*user.UserData)

	var column string
	switch params.SignatureRole {
	case "ketua_lama":
		if ud.GroupName != "Trimitra" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Trimitra (ketua lama) yang dapat menandatangani sebagai ketua_lama"}
		}
		column = "signature_ketua_lama"
	case "ketua_baru":
		if ud.GroupName != "Trimitra" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Trimitra (ketua baru) yang dapat menandatangani sebagai ketua_baru"}
		}
		column = "signature_ketua_baru"
	case "pembina":
		if ud.GroupName != "Pembina" {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Pembina yang dapat menandatangani sebagai pembina"}
		}
		column = "signature_pembina"
	default:
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "signature_role harus 'ketua_lama', 'ketua_baru', atau 'pembina'"}
	}

	res, err := db.Exec(ctx, "UPDATE handover_records SET "+column+" = $1 WHERE id = $2", params.Signature, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "catatan serah terima tidak ditemukan"}
	}
	return &MessageResponse{Message: "Tanda tangan berhasil disimpan"}, nil
}
