package asset

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

var db = sqldb.NewDatabase("asset", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// ASSETS
// ============================================================

type AssetDetail struct {
	AssetID   int       `json:"asset_id"`
	Nama      string    `json:"nama"`
	Deskripsi string    `json:"deskripsi"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateAssetParams struct {
	Nama      string `json:"nama"`
	Deskripsi string `json:"deskripsi"`
}

type ListAssetsResponse struct {
	Assets []AssetDetail `json:"assets"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/asset method=POST
func CreateAsset(ctx context.Context, params *CreateAssetParams) (*AssetDetail, error) {
	ud := auth.Data().(*user.UserData)
	// Hanya Trimitra dan Pembina yang dapat menambah aset
	if ud.GroupName != "Trimitra" && ud.GroupName != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Trimitra atau Pembina yang dapat menambah aset",
		}
	}

	var a AssetDetail
	err := db.QueryRow(ctx, `
		INSERT INTO assets (nama, deskripsi) VALUES ($1, $2)
		RETURNING asset_id, nama, deskripsi, status, created_at
	`, params.Nama, params.Deskripsi).
		Scan(&a.AssetID, &a.Nama, &a.Deskripsi, &a.Status, &a.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &a, nil
}

//encore:api auth path=/assets method=GET
func ListAssets(ctx context.Context) (*ListAssetsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT asset_id, nama, deskripsi, status, created_at
		FROM assets ORDER BY asset_id ASC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []AssetDetail
	for rows.Next() {
		var a AssetDetail
		if err := rows.Scan(&a.AssetID, &a.Nama, &a.Deskripsi, &a.Status, &a.CreatedAt); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, a)
	}
	return &ListAssetsResponse{Assets: list}, nil
}

//encore:api auth path=/asset/:id method=GET
func GetAsset(ctx context.Context, id int) (*AssetDetail, error) {
	var a AssetDetail
	err := db.QueryRow(ctx, `
		SELECT asset_id, nama, deskripsi, status, created_at FROM assets WHERE asset_id = $1
	`, id).Scan(&a.AssetID, &a.Nama, &a.Deskripsi, &a.Status, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "aset tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &a, nil
}

type UpdateAssetStatusParams struct {
	Status string `json:"status"` // 'Tersedia', 'Dipinjam', 'Perawatan'
}

//encore:api auth path=/asset/:id/status method=PUT
func UpdateAssetStatus(ctx context.Context, id int, params *UpdateAssetStatusParams) (*MessageResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Trimitra" && ud.GroupName != "Pembina" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Trimitra atau Pembina yang dapat mengubah status aset"}
	}

	valid := map[string]bool{"Tersedia": true, "Dipinjam": true, "Perawatan": true}
	if !valid[params.Status] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status tidak valid"}
	}

	res, err := db.Exec(ctx, "UPDATE assets SET status = $1 WHERE asset_id = $2", params.Status, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "aset tidak ditemukan"}
	}
	return &MessageResponse{Message: "Status aset diperbarui"}, nil
}

// ============================================================
// PEMINJAMAN (Booking)
// ============================================================

type PeminjamanDetail struct {
	PeminjamanID int       `json:"peminjaman_id"`
	AssetID      int       `json:"asset_id"`
	ProkerID     *int      `json:"proker_id"`
	DipinjamOleh string    `json:"dipinjam_oleh"`
	WaktuMulai   time.Time `json:"waktu_mulai"`
	WaktuSelesai time.Time `json:"waktu_selesai"`
	Keterangan   string    `json:"keterangan"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreatePeminjamanParams struct {
	AssetID      int       `json:"asset_id"`
	ProkerID     *int      `json:"proker_id"`
	WaktuMulai   time.Time `json:"waktu_mulai"`
	WaktuSelesai time.Time `json:"waktu_selesai"`
	Keterangan   string    `json:"keterangan"`
}

type ListPeminjamanResponse struct {
	Peminjaman []PeminjamanDetail `json:"peminjaman"`
}

//encore:api auth path=/asset/pinjam method=POST
func PinjamAsset(ctx context.Context, params *CreatePeminjamanParams) (*PeminjamanDetail, error) {
	nis, _ := auth.UserID()

	// Cek tabrakan jadwal
	var clashCount int
	err := db.QueryRow(ctx, `
		SELECT COUNT(*) FROM peminjaman
		WHERE asset_id = $1 AND waktu_mulai < $3 AND waktu_selesai > $2
	`, params.AssetID, params.WaktuMulai, params.WaktuSelesai).Scan(&clashCount)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if clashCount > 0 {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "aset sudah dipinjam pada waktu yang diminta",
		}
	}

	var prokerID sql.NullInt32
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	var p PeminjamanDetail
	var retProker sql.NullInt32
	err = db.QueryRow(ctx, `
		INSERT INTO peminjaman (asset_id, proker_id, dipinjam_oleh, waktu_mulai, waktu_selesai, keterangan)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING peminjaman_id, asset_id, proker_id, dipinjam_oleh,
		          waktu_mulai, waktu_selesai, keterangan, created_at
	`, params.AssetID, prokerID, string(nis), params.WaktuMulai, params.WaktuSelesai, params.Keterangan).
		Scan(&p.PeminjamanID, &p.AssetID, &retProker, &p.DipinjamOleh,
			&p.WaktuMulai, &p.WaktuSelesai, &p.Keterangan, &p.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retProker.Valid {
		v := int(retProker.Int32)
		p.ProkerID = &v
	}

	// Update status aset jadi Dipinjam
	_, _ = db.Exec(ctx, "UPDATE assets SET status = 'Dipinjam' WHERE asset_id = $1", params.AssetID)

	return &p, nil
}

//encore:api auth path=/asset/:id/peminjaman method=GET
func ListPeminjamanAsset(ctx context.Context, id int) (*ListPeminjamanResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT peminjaman_id, asset_id, proker_id, dipinjam_oleh,
		       waktu_mulai, waktu_selesai, keterangan, created_at
		FROM peminjaman WHERE asset_id = $1 ORDER BY waktu_mulai ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PeminjamanDetail
	for rows.Next() {
		var p PeminjamanDetail
		var retProker sql.NullInt32
		if err := rows.Scan(
			&p.PeminjamanID, &p.AssetID, &retProker, &p.DipinjamOleh,
			&p.WaktuMulai, &p.WaktuSelesai, &p.Keterangan, &p.CreatedAt,
		); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if retProker.Valid {
			v := int(retProker.Int32)
			p.ProkerID = &v
		}
		list = append(list, p)
	}
	return &ListPeminjamanResponse{Peminjaman: list}, nil
}
