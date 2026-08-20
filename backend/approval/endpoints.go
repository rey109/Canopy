package approval

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

var db = sqldb.NewDatabase("approval", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// JENIS DOKUMEN
// ============================================================

type JenisDokumenDetail struct {
	JenisID int    `json:"jenis_id"`
	Nama    string `json:"nama"`
}

type ListJenisDokumenResponse struct {
	JenisDokumen []JenisDokumenDetail `json:"jenis_dokumen"`
}

//encore:api auth path=/approval/jenis-dokumen method=GET
func ListJenisDokumen(ctx context.Context) (*ListJenisDokumenResponse, error) {
	rows, err := db.Query(ctx, `SELECT jenis_id, nama FROM jenis_dokumen ORDER BY jenis_id`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []JenisDokumenDetail
	for rows.Next() {
		var j JenisDokumenDetail
		if err := rows.Scan(&j.JenisID, &j.Nama); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, j)
	}
	return &ListJenisDokumenResponse{JenisDokumen: list}, nil
}

// ============================================================
// DOKUMEN
// ============================================================

type DokumenDetail struct {
	DokumenID     int                 `json:"dokumen_id"`
	ProkerID      *int                `json:"proker_id"`
	JenisID       int                 `json:"jenis_id"`
	JenisNama     string              `json:"jenis_nama"`
	DiunggahOleh  string              `json:"diunggah_oleh"`
	DiperiksaOleh *string             `json:"diperiksa_oleh"`
	FileURL       string              `json:"file_url"`
	IsEksternal   bool                `json:"is_eksternal"`
	Status        string              `json:"status"`
	CatatanRevisi *string             `json:"catatan_revisi"`
	Versi         int                 `json:"versi"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
	Persetujuan   []PersetujuanDetail `json:"persetujuan,omitempty"`
}

type PersetujuanDetail struct {
	PersetujuanID      int        `json:"persetujuan_id"`
	DokumenID          int        `json:"dokumen_id"`
	Urutan             int        `json:"urutan"`
	ApproverGroupName  string     `json:"approver_group_name"`
	DisetujuiOleh      *string    `json:"disetujui_oleh"`
	Keputusan          string     `json:"keputusan"`
	Catatan            *string    `json:"catatan"`
	Waktu              *time.Time `json:"waktu"`
}

type CreateDokumenParams struct {
	ProkerID    *int   `json:"proker_id"`
	JenisID     int    `json:"jenis_id"`
	FileURL     string `json:"file_url"`
	IsEksternal bool   `json:"is_eksternal"`
}

type ListDokumenResponse struct {
	Dokumen []DokumenDetail `json:"dokumen"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

// BuatDokumen — upload dokumen dan auto-generate rantai persetujuan dari template
//encore:api auth path=/approval/dokumen method=POST
func BuatDokumen(ctx context.Context, params *CreateDokumenParams) (*DokumenDetail, error) {
	nis, _ := auth.UserID()

	var jenisNama string
	err := db.QueryRow(ctx, `SELECT nama FROM jenis_dokumen WHERE jenis_id = $1`, params.JenisID).Scan(&jenisNama)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.InvalidArgument, Message: "jenis dokumen tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	var prokerID sql.NullInt32
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	var d DokumenDetail
	var retProker sql.NullInt32
	var retPeriksa, retCatatan sql.NullString
	err = db.QueryRow(ctx, `
		INSERT INTO dokumen
			(proker_id, jenis_id, diunggah_oleh, file_url, is_eksternal, status, versi)
		VALUES ($1, $2, $3, $4, $5, 'Menunggu Kelengkapan', 1)
		RETURNING dokumen_id, proker_id, jenis_id, diunggah_oleh, diperiksa_oleh,
		          file_url, is_eksternal, status, catatan_revisi, versi, created_at, updated_at
	`, prokerID, params.JenisID, string(nis), params.FileURL, params.IsEksternal).
		Scan(
			&d.DokumenID, &retProker, &d.JenisID, &d.DiunggahOleh, &retPeriksa,
			&d.FileURL, &d.IsEksternal, &d.Status, &retCatatan, &d.Versi,
			&d.CreatedAt, &d.UpdatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retProker.Valid {
		v := int(retProker.Int32)
		d.ProkerID = &v
	}
	if retPeriksa.Valid {
		d.DiperiksaOleh = &retPeriksa.String
	}
	if retCatatan.Valid {
		d.CatatanRevisi = &retCatatan.String
	}
	d.JenisNama = jenisNama

	// Auto-generate PERSETUJUAN dari ALUR_PERSETUJUAN_TEMPLATE
	templateRows, err := db.Query(ctx, `
		SELECT urutan, approver_group_name
		FROM alur_persetujuan_template
		WHERE jenis_id = $1
		ORDER BY urutan ASC
	`, params.JenisID)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer templateRows.Close()

	type step struct {
		urutan    int
		groupName string
	}
	var steps []step
	for templateRows.Next() {
		var s step
		if err := templateRows.Scan(&s.urutan, &s.groupName); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		steps = append(steps, s)
	}

	for _, s := range steps {
		_, err = db.Exec(ctx, `
			INSERT INTO persetujuan (dokumen_id, urutan, approver_group_name, keputusan)
			VALUES ($1, $2, $3, 'Menunggu')
		`, d.DokumenID, s.urutan, s.groupName)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
	}

	d.Persetujuan, err = loadPersetujuan(ctx, d.DokumenID)
	if err != nil {
		return nil, err
	}

	return &d, nil
}

//encore:api auth path=/approval/dokumen method=GET
func ListDokumen(ctx context.Context) (*ListDokumenResponse, error) {
	ud := auth.Data().(*user.UserData)

	var rows *sqldb.Rows
	var err error

	if ud.GroupName == "Kepala Divisi" && ud.DivisionID != nil {
		// Hanya dokumen milik divisinya (filter by proker_id yang ada di divisinya — approximasi via diunggah_oleh saja untuk sekarang)
		rows, err = db.Query(ctx, `
			SELECT d.dokumen_id, d.proker_id, d.jenis_id, jd.nama,
			       d.diunggah_oleh, d.diperiksa_oleh, d.file_url, d.is_eksternal,
			       d.status, d.catatan_revisi, d.versi, d.created_at, d.updated_at
			FROM dokumen d
			JOIN jenis_dokumen jd ON jd.jenis_id = d.jenis_id
			WHERE d.diunggah_oleh = $1
			ORDER BY d.created_at DESC
		`, ud.NIS)
	} else {
		rows, err = db.Query(ctx, `
			SELECT d.dokumen_id, d.proker_id, d.jenis_id, jd.nama,
			       d.diunggah_oleh, d.diperiksa_oleh, d.file_url, d.is_eksternal,
			       d.status, d.catatan_revisi, d.versi, d.created_at, d.updated_at
			FROM dokumen d
			JOIN jenis_dokumen jd ON jd.jenis_id = d.jenis_id
			ORDER BY d.created_at DESC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []DokumenDetail
	for rows.Next() {
		d, err := scanDokumen(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *d)
	}
	return &ListDokumenResponse{Dokumen: list}, nil
}

//encore:api auth path=/approval/dokumen/:id method=GET
func GetDokumen(ctx context.Context, id int) (*DokumenDetail, error) {
	row := db.QueryRow(ctx, `
		SELECT d.dokumen_id, d.proker_id, d.jenis_id, jd.nama,
		       d.diunggah_oleh, d.diperiksa_oleh, d.file_url, d.is_eksternal,
		       d.status, d.catatan_revisi, d.versi, d.created_at, d.updated_at
		FROM dokumen d
		JOIN jenis_dokumen jd ON jd.jenis_id = d.jenis_id
		WHERE d.dokumen_id = $1
	`, id)
	d, err := scanDokumen(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "dokumen tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	d.Persetujuan, err = loadPersetujuan(ctx, id)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// ============================================================
// PERSETUJUAN — aksi approve/tolak per step
// ============================================================

type ListPendingResponse struct {
	Persetujuan []PersetujuanDetail `json:"persetujuan"`
}

// ListPendingPersetujuan — daftar persetujuan yang menunggu aksi user ini
//encore:api auth path=/approval/pending method=GET
func ListPendingPersetujuan(ctx context.Context) (*ListPendingResponse, error) {
	ud := auth.Data().(*user.UserData)

	rows, err := db.Query(ctx, `
		SELECT p.persetujuan_id, p.dokumen_id, p.urutan, p.approver_group_name,
		       p.disetujui_oleh, p.keputusan, p.catatan, p.waktu
		FROM persetujuan p
		WHERE p.keputusan = 'Menunggu'
		  AND p.approver_group_name = $1
		  AND p.urutan = (
		      SELECT MIN(p2.urutan) FROM persetujuan p2
		      WHERE p2.dokumen_id = p.dokumen_id AND p2.keputusan = 'Menunggu'
		  )
		ORDER BY p.persetujuan_id ASC
	`, ud.GroupName)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PersetujuanDetail
	for rows.Next() {
		p, err := scanPersetujuan(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *p)
	}
	return &ListPendingResponse{Persetujuan: list}, nil
}

type AksiPersetujuanParams struct {
	Keputusan string  `json:"keputusan"` // 'Disetujui', 'Ditolak'
	Catatan   *string `json:"catatan"`
}

// AksiPersetujuan — approve atau tolak satu step
//encore:api auth path=/approval/persetujuan/:id/aksi method=POST
func AksiPersetujuan(ctx context.Context, id int, params *AksiPersetujuanParams) (*MessageResponse, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if params.Keputusan != "Disetujui" && params.Keputusan != "Ditolak" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "keputusan harus 'Disetujui' atau 'Ditolak'"}
	}

	var p PersetujuanDetail
	var disetujuiOleh, catatan sql.NullString
	var waktu sql.NullTime
	err := db.QueryRow(ctx, `
		SELECT persetujuan_id, dokumen_id, urutan, approver_group_name,
		       disetujui_oleh, keputusan, catatan, waktu
		FROM persetujuan WHERE persetujuan_id = $1
	`, id).Scan(
		&p.PersetujuanID, &p.DokumenID, &p.Urutan, &p.ApproverGroupName,
		&disetujuiOleh, &p.Keputusan, &catatan, &waktu,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "persetujuan tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	if p.Keputusan != "Menunggu" {
		return nil, &errs.Error{Code: errs.FailedPrecondition, Message: "persetujuan ini sudah diputuskan"}
	}
	if p.ApproverGroupName != ud.GroupName {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "kamu tidak memiliki wewenang untuk step approval ini (perlu: " + p.ApproverGroupName + ")",
		}
	}

	var catatanVal sql.NullString
	if params.Catatan != nil {
		catatanVal.Valid = true
		catatanVal.String = *params.Catatan
	}

	_, err = db.Exec(ctx, `
		UPDATE persetujuan
		SET keputusan = $1, disetujui_oleh = $2, catatan = $3, waktu = NOW()
		WHERE persetujuan_id = $4
	`, params.Keputusan, string(nis), catatanVal, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	if err = updateDokumenStatus(ctx, p.DokumenID); err != nil {
		return nil, err
	}

	return &MessageResponse{Message: "Keputusan persetujuan berhasil disimpan"}, nil
}

// ============================================================
// Helpers internal
// ============================================================

func loadPersetujuan(ctx context.Context, dokumenID int) ([]PersetujuanDetail, error) {
	rows, err := db.Query(ctx, `
		SELECT persetujuan_id, dokumen_id, urutan, approver_group_name,
		       disetujui_oleh, keputusan, catatan, waktu
		FROM persetujuan
		WHERE dokumen_id = $1
		ORDER BY urutan ASC
	`, dokumenID)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PersetujuanDetail
	for rows.Next() {
		p, err := scanPersetujuan(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *p)
	}
	return list, nil
}

func updateDokumenStatus(ctx context.Context, dokumenID int) error {
	rows, err := db.Query(ctx, `
		SELECT keputusan FROM persetujuan WHERE dokumen_id = $1 ORDER BY urutan ASC
	`, dokumenID)
	if err != nil {
		return &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var keputusanList []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		keputusanList = append(keputusanList, k)
	}

	newStatus := "Menunggu Approval Berjenjang"
	for _, k := range keputusanList {
		if k == "Ditolak" {
			newStatus = "Perlu Revisi"
			break
		}
	}
	if newStatus == "Menunggu Approval Berjenjang" && len(keputusanList) > 0 {
		allDisetujui := true
		for _, k := range keputusanList {
			if k != "Disetujui" {
				allDisetujui = false
				break
			}
		}
		if allDisetujui {
			newStatus = "Disetujui"
		}
	}

	_, err = db.Exec(ctx, `
		UPDATE dokumen SET status = $1, updated_at = NOW() WHERE dokumen_id = $2
	`, newStatus, dokumenID)
	return err
}

func scanDokumen(row interface{ Scan(...interface{}) error }) (*DokumenDetail, error) {
	var d DokumenDetail
	var prokerID sql.NullInt32
	var diperiksaOleh, catatan sql.NullString
	if err := row.Scan(
		&d.DokumenID, &prokerID, &d.JenisID, &d.JenisNama,
		&d.DiunggahOleh, &diperiksaOleh, &d.FileURL, &d.IsEksternal,
		&d.Status, &catatan, &d.Versi, &d.CreatedAt, &d.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if prokerID.Valid {
		v := int(prokerID.Int32)
		d.ProkerID = &v
	}
	if diperiksaOleh.Valid {
		d.DiperiksaOleh = &diperiksaOleh.String
	}
	if catatan.Valid {
		d.CatatanRevisi = &catatan.String
	}
	return &d, nil
}

func scanPersetujuan(row interface{ Scan(...interface{}) error }) (*PersetujuanDetail, error) {
	var p PersetujuanDetail
	var disetujuiOleh, catatan sql.NullString
	var waktu sql.NullTime
	if err := row.Scan(
		&p.PersetujuanID, &p.DokumenID, &p.Urutan, &p.ApproverGroupName,
		&disetujuiOleh, &p.Keputusan, &catatan, &waktu,
	); err != nil {
		return nil, err
	}
	if disetujuiOleh.Valid {
		p.DisetujuiOleh = &disetujuiOleh.String
	}
	if catatan.Valid {
		p.Catatan = &catatan.String
	}
	if waktu.Valid {
		p.Waktu = &waktu.Time
	}
	return &p, nil
}
