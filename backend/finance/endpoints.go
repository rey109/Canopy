package finance

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

var db = sqldb.NewDatabase("finance", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// KATEGORI TRANSAKSI
// ============================================================

type KategoriDetail struct {
	KategoriID int    `json:"kategori_id"`
	Nama       string `json:"nama"`
}

type ListKategoriResponse struct {
	Kategori []KategoriDetail `json:"kategori"`
}

//encore:api auth path=/finance/kategori method=GET
func ListKategori(ctx context.Context) (*ListKategoriResponse, error) {
	rows, err := db.Query(ctx, `SELECT kategori_id, nama FROM kategori_transaksi ORDER BY kategori_id`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []KategoriDetail
	for rows.Next() {
		var k KategoriDetail
		if err := rows.Scan(&k.KategoriID, &k.Nama); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, k)
	}
	return &ListKategoriResponse{Kategori: list}, nil
}

// ============================================================
// TRANSAKSI
// ============================================================

type TransaksiDetail struct {
	TransaksiID      int        `json:"transaksi_id"`
	ProkerID         *int       `json:"proker_id"`
	KategoriID       *int       `json:"kategori_id"`
	KategoriNama     *string    `json:"kategori_nama"`
	DicatatOleh      string     `json:"dicatat_oleh"`
	Jenis            string     `json:"jenis"`   // 'Masuk', 'Keluar'
	Nominal          float64    `json:"nominal"`
	Deskripsi        string     `json:"deskripsi"`
	BuktiURL         *string    `json:"bukti_url"`
	Sumber           string     `json:"sumber"`   // 'Manual', 'Scan Nota'
	IsBerisiko       bool       `json:"is_berisiko"`
	Status           string     `json:"status"`
	AlasanPenolakan  *string    `json:"alasan_penolakan"`
	Tanggal          time.Time  `json:"tanggal"`
	CreatedAt        time.Time  `json:"created_at"`
}

type CreateTransaksiParams struct {
	ProkerID   *int      `json:"proker_id"`
	KategoriID *int      `json:"kategori_id"`
	Jenis      string    `json:"jenis"`       // 'Masuk', 'Keluar'
	Nominal    float64   `json:"nominal"`
	Deskripsi  string    `json:"deskripsi"`
	BuktiURL   *string   `json:"bukti_url"`
	Sumber     string    `json:"sumber"`      // 'Manual', 'Scan Nota'
	IsBerisiko bool      `json:"is_berisiko"`
	Tanggal    time.Time `json:"tanggal"`
}

type ListTransaksiResponse struct {
	Transaksi   []TransaksiDetail `json:"transaksi"`
	TotalMasuk  float64           `json:"total_masuk"`
	TotalKeluar float64           `json:"total_keluar"`
	Saldo       float64           `json:"saldo"`
}

type SaldoResponse struct {
	TotalMasuk  float64 `json:"total_masuk"`
	TotalKeluar float64 `json:"total_keluar"`
	Saldo       float64 `json:"saldo"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/finance/transaksi method=POST
func CreateTransaksi(ctx context.Context, params *CreateTransaksiParams) (*TransaksiDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	// Validasi jenis
	if params.Jenis != "Masuk" && params.Jenis != "Keluar" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "jenis harus 'Masuk' atau 'Keluar'"}
	}

	// Validasi sumber
	sumber := params.Sumber
	if sumber == "" {
		sumber = "Manual"
	}
	if sumber != "Manual" && sumber != "Scan Nota" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "sumber harus 'Manual' atau 'Scan Nota'"}
	}

	// Input manual hanya untuk Bendahara; scan nota tersedia untuk semua role
	if sumber == "Manual" && ud.GroupName != "Bendahara" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "input manual hanya untuk Bendahara",
		}
	}

	// Tentukan status awal:
	// - Scan Nota → Menunggu Verifikasi (harus dicek Bendahara dulu karena OCR bisa salah)
	// - Manual + berisiko → Menunggu Approval Umum (butuh Bendahara Umum / level 1)
	// - Manual + tidak berisiko → Disetujui langsung
	var statusAwal string
	switch {
	case sumber == "Scan Nota":
		statusAwal = "Menunggu Verifikasi"
	case params.IsBerisiko:
		statusAwal = "Menunggu Approval Umum"
	default:
		statusAwal = "Disetujui"
	}

	var prokerID, kategoriID sql.NullInt32
	var buktiURL sql.NullString
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}
	if params.KategoriID != nil {
		kategoriID.Valid = true
		kategoriID.Int32 = int32(*params.KategoriID)
	}
	if params.BuktiURL != nil {
		buktiURL.Valid = true
		buktiURL.String = *params.BuktiURL
	}

	var t TransaksiDetail
	var retProker, retKategori sql.NullInt32
	var retBukti sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO transaksi
			(proker_id, kategori_id, dicatat_oleh, jenis, nominal, deskripsi,
			 bukti_url, sumber, is_berisiko, status, tanggal)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING transaksi_id, proker_id, kategori_id, dicatat_oleh, jenis, nominal,
		          deskripsi, bukti_url, sumber, is_berisiko, status, alasan_penolakan,
		          tanggal, created_at
	`, prokerID, kategoriID, string(nis), params.Jenis, params.Nominal, params.Deskripsi,
		buktiURL, sumber, params.IsBerisiko, statusAwal, params.Tanggal).
		Scan(
			&t.TransaksiID, &retProker, &retKategori, &t.DicatatOleh, &t.Jenis, &t.Nominal,
			&t.Deskripsi, &retBukti, &t.Sumber, &t.IsBerisiko, &t.Status, new(sql.NullString),
			&t.Tanggal, &t.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retProker.Valid {
		v := int(retProker.Int32)
		t.ProkerID = &v
	}
	if retKategori.Valid {
		v := int(retKategori.Int32)
		t.KategoriID = &v
	}
	if retBukti.Valid {
		t.BuktiURL = &retBukti.String
	}
	return &t, nil
}

//encore:api auth path=/finance/transaksi method=GET
func ListTransaksi(ctx context.Context) (*ListTransaksiResponse, error) {
	ud := auth.Data().(*user.UserData)

	// Filter scope divisi: Bendahara 1 hanya lihat Sekbid 1-5, Bendahara 2 lihat Sekbid 6-10
	var rows *sqldb.Rows
	var err error
	if ud.GroupName == "Bendahara" && !ud.HasScopeAll() {
		rows, err = db.Query(ctx, `
			SELECT t.transaksi_id, t.proker_id, t.kategori_id, k.nama,
			       t.dicatat_oleh, t.jenis, t.nominal, t.deskripsi,
			       t.bukti_url, t.sumber, t.is_berisiko, t.status,
			       t.alasan_penolakan, t.tanggal, t.created_at
			FROM transaksi t
			LEFT JOIN kategori_transaksi k ON k.kategori_id = t.kategori_id
			LEFT JOIN program_kerja pk ON pk.proker_id = t.proker_id
			WHERE pk.division_id IS NULL
			   OR pk.division_id BETWEEN $1 AND $2
			ORDER BY t.tanggal DESC
		`, ud.ScopeDivisiAwal, ud.ScopeDivisiAkhir)
	} else {
		rows, err = db.Query(ctx, `
			SELECT t.transaksi_id, t.proker_id, t.kategori_id, k.nama,
			       t.dicatat_oleh, t.jenis, t.nominal, t.deskripsi,
			       t.bukti_url, t.sumber, t.is_berisiko, t.status,
			       t.alasan_penolakan, t.tanggal, t.created_at
			FROM transaksi t
			LEFT JOIN kategori_transaksi k ON k.kategori_id = t.kategori_id
			ORDER BY t.tanggal DESC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []TransaksiDetail
	var totalMasuk, totalKeluar float64
	for rows.Next() {
		t, err := scanTransaksi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if t.Status == "Disetujui" {
			if t.Jenis == "Masuk" {
				totalMasuk += t.Nominal
			} else {
				totalKeluar += t.Nominal
			}
		}
		list = append(list, *t)
	}
	return &ListTransaksiResponse{
		Transaksi:   list,
		TotalMasuk:  totalMasuk,
		TotalKeluar: totalKeluar,
		Saldo:       totalMasuk - totalKeluar,
	}, nil
}

//encore:api auth path=/finance/transaksi/:id method=GET
func GetTransaksi(ctx context.Context, id int) (*TransaksiDetail, error) {
	row := db.QueryRow(ctx, `
		SELECT t.transaksi_id, t.proker_id, t.kategori_id, k.nama,
		       t.dicatat_oleh, t.jenis, t.nominal, t.deskripsi,
		       t.bukti_url, t.sumber, t.is_berisiko, t.status,
		       t.alasan_penolakan, t.tanggal, t.created_at
		FROM transaksi t
		LEFT JOIN kategori_transaksi k ON k.kategori_id = t.kategori_id
		WHERE t.transaksi_id = $1
	`, id)
	t, err := scanTransaksi(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "transaksi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return t, nil
}

//encore:api auth path=/finance/saldo method=GET
func GetSaldo(ctx context.Context) (*SaldoResponse, error) {
	var masuk, keluar sql.NullFloat64
	err := db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN jenis='Masuk' THEN nominal ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN jenis='Keluar' THEN nominal ELSE 0 END), 0)
		FROM transaksi WHERE status = 'Disetujui'
	`).Scan(&masuk, &keluar)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &SaldoResponse{
		TotalMasuk:  masuk.Float64,
		TotalKeluar: keluar.Float64,
		Saldo:       masuk.Float64 - keluar.Float64,
	}, nil
}

// AnggaranProker: hitung pemakaian anggaran proker tertentu
type AnggaranProkerResponse struct {
	ProkerID          int     `json:"proker_id"`
	AnggaranDisetujui float64 `json:"anggaran_disetujui"`
	TerpakaI          float64 `json:"terpakai"`
	Persentase        float64 `json:"persentase"`
	StatusAlarm       string  `json:"status_alarm"` // "", "mendekati", "melebihi"
}

//encore:api auth path=/finance/anggaran/:proker_id method=GET
func GetAnggaranProker(ctx context.Context, proker_id int) (*AnggaranProkerResponse, error) {
	var anggaran, terpakai sql.NullFloat64
	err := db.QueryRow(ctx, `
		SELECT
			pk.anggaran_disetujui,
			COALESCE(SUM(CASE WHEN t.jenis='Keluar' AND t.status='Disetujui' THEN t.nominal ELSE 0 END), 0)
		FROM program_kerja pk
		LEFT JOIN transaksi t ON t.proker_id = pk.proker_id
		WHERE pk.proker_id = $1
		GROUP BY pk.anggaran_disetujui
	`, proker_id).Scan(&anggaran, &terpakai)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "proker tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	pct := 0.0
	if anggaran.Float64 > 0 {
		pct = terpakai.Float64 / anggaran.Float64 * 100
	}
	alarm := ""
	if pct >= 100 {
		alarm = "melebihi"
	} else if pct >= 80 {
		alarm = "mendekati"
	}

	return &AnggaranProkerResponse{
		ProkerID:          proker_id,
		AnggaranDisetujui: anggaran.Float64,
		TerpakaI:          terpakai.Float64,
		Persentase:        pct,
		StatusAlarm:       alarm,
	}, nil
}

// ============================================================
// VERIFIKASI & APPROVAL BERISIKO
// ============================================================

type VerifikasiParams struct {
	Disetujui       bool    `json:"disetujui"`
	AlasanPenolakan *string `json:"alasan_penolakan"`
}

// VerifikasiScanNota — Bendahara memverifikasi transaksi dari Scan Nota
//encore:api auth path=/finance/transaksi/:id/verifikasi method=POST
func VerifikasiScanNota(ctx context.Context, id int, params *VerifikasiParams) (*TransaksiDetail, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Bendahara" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Bendahara atau Trimitra yang dapat memverifikasi transaksi",
		}
	}

	// Pastikan transaksi dalam status Menunggu Verifikasi
	var currentStatus string
	var isBerisiko bool
	err := db.QueryRow(ctx, `
		SELECT status, is_berisiko FROM transaksi WHERE transaksi_id = $1
	`, id).Scan(&currentStatus, &isBerisiko)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "transaksi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if currentStatus != "Menunggu Verifikasi" {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "transaksi tidak dalam status Menunggu Verifikasi",
		}
	}

	var newStatus string
	var alasan sql.NullString
	if !params.Disetujui {
		newStatus = "Ditolak"
		if params.AlasanPenolakan != nil {
			alasan.Valid = true
			alasan.String = *params.AlasanPenolakan
		}
	} else if isBerisiko {
		newStatus = "Menunggu Approval Umum"
	} else {
		newStatus = "Disetujui"
	}

	_, err = db.Exec(ctx, `
		UPDATE transaksi SET status = $1, alasan_penolakan = $2 WHERE transaksi_id = $3
	`, newStatus, alasan, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return GetTransaksi(ctx, id)
}

// ApprovalBerisiko — khusus Bendahara Umum (level 1) untuk transaksi berisiko
//encore:api auth path=/finance/transaksi/:id/approval-berisiko method=POST
func ApprovalBerisiko(ctx context.Context, id int, params *VerifikasiParams) (*TransaksiDetail, error) {
	ud := auth.Data().(*user.UserData)

	// Hanya Bendahara level 1 (Bendahara Umum) atau Trimitra yang boleh
	if ud.GroupName != "Bendahara" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Bendahara atau Trimitra"}
	}
	if ud.GroupName == "Bendahara" && ud.Level != 1 {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Bendahara Umum (level 1) yang dapat menyetujui transaksi berisiko",
		}
	}

	var currentStatus string
	err := db.QueryRow(ctx, `SELECT status FROM transaksi WHERE transaksi_id = $1`, id).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "transaksi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if currentStatus != "Menunggu Approval Umum" {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "transaksi tidak dalam status Menunggu Approval Umum",
		}
	}

	newStatus := "Disetujui"
	var alasan sql.NullString
	if !params.Disetujui {
		newStatus = "Ditolak"
		if params.AlasanPenolakan != nil {
			alasan.Valid = true
			alasan.String = *params.AlasanPenolakan
		}
	}

	_, err = db.Exec(ctx, `
		UPDATE transaksi SET status = $1, alasan_penolakan = $2 WHERE transaksi_id = $3
	`, newStatus, alasan, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return GetTransaksi(ctx, id)
}

// ListMenungguVerifikasi — antrian Scan Nota yang belum diverifikasi
//encore:api auth path=/finance/antrian-verifikasi method=GET
func ListMenungguVerifikasi(ctx context.Context) (*ListTransaksiResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Bendahara" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Bendahara atau Trimitra"}
	}

	rows, err := db.Query(ctx, `
		SELECT t.transaksi_id, t.proker_id, t.kategori_id, k.nama,
		       t.dicatat_oleh, t.jenis, t.nominal, t.deskripsi,
		       t.bukti_url, t.sumber, t.is_berisiko, t.status,
		       t.alasan_penolakan, t.tanggal, t.created_at
		FROM transaksi t
		LEFT JOIN kategori_transaksi k ON k.kategori_id = t.kategori_id
		WHERE t.status = 'Menunggu Verifikasi'
		ORDER BY t.created_at ASC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []TransaksiDetail
	for rows.Next() {
		t, err := scanTransaksi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *t)
	}
	return &ListTransaksiResponse{Transaksi: list}, nil
}

// ListMenungguApprovalBerisiko — antrian transaksi berisiko untuk Bendahara Umum
//encore:api auth path=/finance/antrian-berisiko method=GET
func ListMenungguApprovalBerisiko(ctx context.Context) (*ListTransaksiResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Bendahara" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Bendahara atau Trimitra"}
	}

	rows, err := db.Query(ctx, `
		SELECT t.transaksi_id, t.proker_id, t.kategori_id, k.nama,
		       t.dicatat_oleh, t.jenis, t.nominal, t.deskripsi,
		       t.bukti_url, t.sumber, t.is_berisiko, t.status,
		       t.alasan_penolakan, t.tanggal, t.created_at
		FROM transaksi t
		LEFT JOIN kategori_transaksi k ON k.kategori_id = t.kategori_id
		WHERE t.status = 'Menunggu Approval Umum'
		ORDER BY t.created_at ASC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []TransaksiDetail
	for rows.Next() {
		t, err := scanTransaksi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *t)
	}
	return &ListTransaksiResponse{Transaksi: list}, nil
}

// ============================================================
// Helper
// ============================================================

func scanTransaksi(row interface{ Scan(...interface{}) error }) (*TransaksiDetail, error) {
	var t TransaksiDetail
	var prokerID, kategoriID sql.NullInt32
	var kategoriNama, buktiURL, alasan sql.NullString
	if err := row.Scan(
		&t.TransaksiID, &prokerID, &kategoriID, &kategoriNama,
		&t.DicatatOleh, &t.Jenis, &t.Nominal, &t.Deskripsi,
		&buktiURL, &t.Sumber, &t.IsBerisiko, &t.Status,
		&alasan, &t.Tanggal, &t.CreatedAt,
	); err != nil {
		return nil, err
	}
	if prokerID.Valid {
		v := int(prokerID.Int32)
		t.ProkerID = &v
	}
	if kategoriID.Valid {
		v := int(kategoriID.Int32)
		t.KategoriID = &v
	}
	if kategoriNama.Valid {
		t.KategoriNama = &kategoriNama.String
	}
	if buktiURL.Valid {
		t.BuktiURL = &buktiURL.String
	}
	if alasan.Valid {
		t.AlasanPenolakan = &alasan.String
	}
	return &t, nil
}
