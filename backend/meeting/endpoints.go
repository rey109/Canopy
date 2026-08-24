package meeting

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.NewDatabase("meeting", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// RAPAT
// ============================================================

type RapatDetail struct {
	RapatID    int        `json:"rapat_id"`
	PeriodeID  int        `json:"periode_id"`
	DivisionID *int       `json:"division_id"`
	Judul      string     `json:"judul"`
	Tanggal    time.Time  `json:"tanggal"`
	Lokasi     string     `json:"lokasi"`
	Agenda     string     `json:"agenda"`
	DibuatOleh string     `json:"dibuat_oleh"`
	Status     string     `json:"status"`
	QRCode     *string    `json:"qr_code,omitempty"` // hanya ditampilkan ke pembuat rapat
	CreatedAt  time.Time  `json:"created_at"`
}

type CreateRapatParams struct {
	DivisionID *int      `json:"division_id"`
	Judul      string    `json:"judul"`
	Tanggal    time.Time `json:"tanggal"`
	Lokasi     string    `json:"lokasi"`
	Agenda     string    `json:"agenda"`
}

type ListRapatResponse struct {
	Rapat []RapatDetail `json:"rapat"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/rapat method=POST
func BuatRapat(ctx context.Context, params *CreateRapatParams) (*RapatDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName == "Staf" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Kepala Divisi, Sekretaris, Trimitra, atau Pembina yang dapat membuat rapat",
		}
	}
	if ud.GroupName == "Kepala Divisi" {
		if params.DivisionID == nil || ud.DivisionID == nil || *params.DivisionID != *ud.DivisionID {
			return nil, &errs.Error{
				Code:    errs.PermissionDenied,
				Message: "Kepala Divisi hanya dapat membuat rapat untuk divisinya sendiri",
			}
		}
	}

	// Generate QR code token unik
	qrBytes := make([]byte, 16)
	if _, err := rand.Read(qrBytes); err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "gagal generate QR token"}
	}
	qrToken := hex.EncodeToString(qrBytes)

	var divID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}

	var r RapatDetail
	var retDivID sql.NullInt32
	var retQR sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO rapat
			(periode_id, division_id, judul, tanggal, lokasi, agenda, dibuat_oleh, status, qr_code)
		VALUES (
			(SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1),
			$1, $2, $3, $4, $5, $6, 'Terjadwal', $7
		)
		RETURNING rapat_id, periode_id, division_id, judul, tanggal, lokasi, agenda,
		          dibuat_oleh, status, qr_code, created_at
	`, divID, params.Judul, params.Tanggal, params.Lokasi, params.Agenda, string(nis), qrToken).
		Scan(
			&r.RapatID, &r.PeriodeID, &retDivID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
			&r.DibuatOleh, &r.Status, &retQR, &r.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		r.DivisionID = &v
	}
	if retQR.Valid {
		r.QRCode = &retQR.String
	}

	// Broadcast pengumuman / notifikasi otomatis
	target := "Organisasi"
	if divID.Valid {
		target = "Divisi"
	}
	notifJudul := fmt.Sprintf("📅 Jadwal Rapat Baru: %s", params.Judul)
	notifIsi := fmt.Sprintf("Rapat '%s' telah dijadwalkan pada %s di %s. Agenda: %s",
		params.Judul,
		params.Tanggal.Format("02 Jan 2006 15:04"),
		params.Lokasi,
		params.Agenda,
	)
	_, _ = db.Exec(ctx, `
		INSERT INTO pengumuman (judul, isi, dibuat_oleh, target, division_id)
		VALUES ($1, $2, $3, $4, $5)
	`, notifJudul, notifIsi, string(nis), target, divID)

	return &r, nil
}

//encore:api auth path=/rapat method=GET
func ListRapat(ctx context.Context) (*ListRapatResponse, error) {
	ud := auth.Data().(*user.UserData)
	nisStr, _ := auth.UserID()

	var rows *sqldb.Rows
	var err error

	// Trimitra/Sekretaris Umum lihat semua; lainnya hanya rapat divisinya + rapat org
	if ud.HasScopeAll() {
		rows, err = db.Query(ctx, `
			SELECT rapat_id, periode_id, division_id, judul, tanggal, lokasi, agenda,
			       dibuat_oleh, status, NULL AS qr_code, created_at
			FROM rapat ORDER BY tanggal DESC
		`)
	} else {
		rows, err = db.Query(ctx, `
			SELECT rapat_id, periode_id, division_id, judul, tanggal, lokasi, agenda,
			       dibuat_oleh, status,
			       CASE WHEN dibuat_oleh = $1 THEN qr_code ELSE NULL END AS qr_code,
			       created_at
			FROM rapat
			WHERE division_id IS NULL OR division_id = $2
			ORDER BY tanggal DESC
		`, string(nisStr), ud.DivisionID)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []RapatDetail
	for rows.Next() {
		r, err := scanRapat(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *r)
	}
	return &ListRapatResponse{Rapat: list}, nil
}

//encore:api auth path=/rapat/:id method=GET
func GetRapat(ctx context.Context, id int) (*RapatDetail, error) {
	nisStr, _ := auth.UserID()

	row := db.QueryRow(ctx, `
		SELECT rapat_id, periode_id, division_id, judul, tanggal, lokasi, agenda,
		       dibuat_oleh, status,
		       CASE WHEN dibuat_oleh = $1 THEN qr_code ELSE NULL END AS qr_code,
		       created_at
		FROM rapat WHERE rapat_id = $2
	`, string(nisStr), id)
	r, err := scanRapat(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return r, nil
}

type UpdateStatusRapatParams struct {
	Status string `json:"status"`
}

type UpdateRapatParams struct {
	Judul      *string    `json:"judul,omitempty"`
	Tanggal    *time.Time `json:"tanggal,omitempty"`
	Lokasi     *string    `json:"lokasi,omitempty"`
	Agenda     *string    `json:"agenda,omitempty"`
	DivisionID *int       `json:"division_id,omitempty"`
	Status     *string    `json:"status,omitempty"`
}

//encore:api auth path=/rapat/:id method=PUT
func UpdateRapat(ctx context.Context, id int, params *UpdateRapatParams) (*RapatDetail, error) {
	nisStr, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	var dibuatOleh string
	var divID sql.NullInt32
	err := db.QueryRow(ctx, `SELECT dibuat_oleh, division_id FROM rapat WHERE rapat_id = $1`, id).Scan(&dibuatOleh, &divID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	canEdit := false
	if ud.GroupName == "Sekretaris" || ud.GroupName == "Trimitra" || ud.GroupName == "Pembina" {
		canEdit = true
	} else if string(nisStr) == dibuatOleh {
		canEdit = true
	} else if ud.GroupName == "Kepala Divisi" && divID.Valid && ud.DivisionID != nil && int(divID.Int32) == *ud.DivisionID {
		canEdit = true
	}

	if !canEdit {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "anda tidak memiliki izin untuk mengedit jadwal rapat ini",
		}
	}

	if params.Status != nil {
		valid := map[string]bool{"Terjadwal": true, "Berlangsung": true, "Selesai": true}
		if !valid[*params.Status] {
			return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status tidak valid"}
		}
	}

	var newDivID sql.NullInt32
	updateDiv := false
	if params.DivisionID != nil {
		updateDiv = true
		if *params.DivisionID > 0 {
			newDivID = sql.NullInt32{Int32: int32(*params.DivisionID), Valid: true}
		}
	}

	_, err = db.Exec(ctx, `
		UPDATE rapat
		SET judul = COALESCE($1, judul),
		    tanggal = COALESCE($2, tanggal),
		    lokasi = COALESCE($3, lokasi),
		    agenda = COALESCE($4, agenda),
		    division_id = CASE WHEN $5::boolean THEN $6 ELSE division_id END,
		    status = COALESCE($7, status)
		WHERE rapat_id = $8
	`,
		params.Judul,
		params.Tanggal,
		params.Lokasi,
		params.Agenda,
		updateDiv,
		newDivID,
		params.Status,
		id,
	)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	// Broadcast notifikasi pembaruan jadwal
	updatedRapat, _ := GetRapat(ctx, id)
	if updatedRapat != nil {
		target := "Organisasi"
		var dID sql.NullInt32
		if updatedRapat.DivisionID != nil {
			target = "Divisi"
			dID = sql.NullInt32{Int32: int32(*updatedRapat.DivisionID), Valid: true}
		}
		notifJudul := fmt.Sprintf("✏️ Pembaruan Jadwal Rapat: %s", updatedRapat.Judul)
		notifIsi := fmt.Sprintf("Jadwal rapat '%s' telah diperbarui. Waktu: %s, Lokasi: %s, Status: %s. Agenda: %s",
			updatedRapat.Judul,
			updatedRapat.Tanggal.Format("02 Jan 2006 15:04"),
			updatedRapat.Lokasi,
			updatedRapat.Status,
			updatedRapat.Agenda,
		)
		_, _ = db.Exec(ctx, `
			INSERT INTO pengumuman (judul, isi, dibuat_oleh, target, division_id)
			VALUES ($1, $2, $3, $4, $5)
		`, notifJudul, notifIsi, string(nisStr), target, dID)
	}

	return updatedRapat, nil
}

//encore:api auth path=/rapat/:id method=DELETE
func HapusRapat(ctx context.Context, id int) (*MessageResponse, error) {
	nisStr, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	var judul, dibuatOleh string
	var divID sql.NullInt32
	err := db.QueryRow(ctx, `SELECT judul, dibuat_oleh, division_id FROM rapat WHERE rapat_id = $1`, id).Scan(&judul, &dibuatOleh, &divID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	canDelete := false
	if ud.GroupName == "Sekretaris" || ud.GroupName == "Trimitra" || ud.GroupName == "Pembina" {
		canDelete = true
	} else if string(nisStr) == dibuatOleh {
		canDelete = true
	} else if ud.GroupName == "Kepala Divisi" && divID.Valid && ud.DivisionID != nil && int(divID.Int32) == *ud.DivisionID {
		canDelete = true
	}

	if !canDelete {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "anda tidak memiliki izin untuk menghapus jadwal rapat ini",
		}
	}

	// Hapus presensi dan notulensi terkait
	_, _ = db.Exec(ctx, `DELETE FROM presensi WHERE acara_type = 'Rapat' AND acara_id = $1`, id)
	_, _ = db.Exec(ctx, `DELETE FROM notulensi WHERE rapat_id = $1`, id)

	_, err = db.Exec(ctx, `DELETE FROM rapat WHERE rapat_id = $1`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	// Notifikasi pembatalan rapat
	target := "Organisasi"
	if divID.Valid {
		target = "Divisi"
	}
	notifJudul := fmt.Sprintf("❌ Pembatalan Rapat: %s", judul)
	notifIsi := fmt.Sprintf("Rapat '%s' yang sebelumnya dijadwalkan telah dibatalkan / dihapus dari agenda.", judul)
	_, _ = db.Exec(ctx, `
		INSERT INTO pengumuman (judul, isi, dibuat_oleh, target, division_id)
		VALUES ($1, $2, $3, $4, $5)
	`, notifJudul, notifIsi, string(nisStr), target, divID)

	return &MessageResponse{Message: "Jadwal rapat berhasil dihapus"}, nil
}

//encore:api auth path=/rapat/:id/status method=PUT
func UpdateStatusRapat(ctx context.Context, id int, params *UpdateStatusRapatParams) (*MessageResponse, error) {
	nisStr, _ := auth.UserID()
	valid := map[string]bool{"Terjadwal": true, "Berlangsung": true, "Selesai": true}
	if !valid[params.Status] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status tidak valid"}
	}

	res, err := db.Exec(ctx, `
		UPDATE rapat SET status = $1 WHERE rapat_id = $2 AND (dibuat_oleh = $3 OR (SELECT rg.group_name FROM kepengurusan k JOIN roles r ON r.role_id = k.role_id JOIN role_groups rg ON rg.group_id = r.group_id WHERE k.nis = $3 AND k.status = 'Aktif' LIMIT 1) IN ('Sekretaris', 'Trimitra', 'Pembina'))
	`, params.Status, id, string(nisStr))
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan atau bukan milikmu"}
	}
	return &MessageResponse{Message: "Status rapat diperbarui"}, nil
}

// ============================================================
// NOTULENSI
// ============================================================

type NotulensiAttachment struct {
	URL  string `json:"url"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type NotulensiDetail struct {
	NotulensiID      int                   `json:"notulensi_id"`
	RapatID          int                   `json:"rapat_id"`
	Isi              string                `json:"isi"`
	Attachments      []NotulensiAttachment `json:"attachments"`
	DifinalisasiOleh *string               `json:"difinalisasi_oleh"`
	Status           string                `json:"status"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

type UpsertNotulensiParams struct {
	Isi         string                `json:"isi"`
	Attachments []NotulensiAttachment `json:"attachments"`
}

type FinalisasiNotulensiParams struct {
	Finalisasi bool `json:"finalisasi"`
}

//encore:api auth path=/rapat/:id/notulensi method=PUT
func UpsertNotulensi(ctx context.Context, id int, params *UpsertNotulensiParams) (*NotulensiDetail, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Sekretaris atau Trimitra yang dapat mengisi notulensi",
		}
	}

	attachJSON, err := json.Marshal(params.Attachments)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "gagal encode attachments"}
	}

	var n NotulensiDetail
	var retFinalisasi sql.NullString
	var attachStr string
	err = db.QueryRow(ctx, `
		INSERT INTO notulensi (rapat_id, isi, attachments, status)
		VALUES ($1, $2, $3, 'Draft')
		ON CONFLICT (rapat_id) DO UPDATE SET isi = $2, attachments = $3, updated_at = NOW()
		RETURNING notulensi_id, rapat_id, isi, attachments, difinalisasi_oleh, status, updated_at
	`, id, params.Isi, string(attachJSON)).
		Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if err2 := json.Unmarshal([]byte(attachStr), &n.Attachments); err2 != nil {
		n.Attachments = []NotulensiAttachment{}
	}
	return &n, nil
}

//encore:api auth path=/rapat/:id/notulensi/finalisasi method=POST
func FinalisasiNotulensi(ctx context.Context, id int) (*NotulensiDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName != "Sekretaris" || ud.Level != 1 {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Sekretaris Umum (level 1) yang dapat memfinalisasi notulensi",
		}
	}

	var n NotulensiDetail
	var retFinalisasi sql.NullString
	var attachStr string
	err := db.QueryRow(ctx, `
		UPDATE notulensi SET status = 'Final', difinalisasi_oleh = $1, updated_at = NOW()
		WHERE rapat_id = $2
		RETURNING notulensi_id, rapat_id, isi, attachments, difinalisasi_oleh, status, updated_at
	`, string(nis), id).
		Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "notulensi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if err2 := json.Unmarshal([]byte(attachStr), &n.Attachments); err2 != nil {
		n.Attachments = []NotulensiAttachment{}
	}
	return &n, nil
}

//encore:api auth path=/rapat/:id/notulensi method=GET
func GetNotulensi(ctx context.Context, id int) (*NotulensiDetail, error) {
	var n NotulensiDetail
	var retFinalisasi sql.NullString
	var attachStr string
	err := db.QueryRow(ctx, `
		SELECT notulensi_id, rapat_id, isi, attachments, difinalisasi_oleh, status, updated_at
		FROM notulensi WHERE rapat_id = $1
	`, id).Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "notulensi belum ada"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if err2 := json.Unmarshal([]byte(attachStr), &n.Attachments); err2 != nil {
		n.Attachments = []NotulensiAttachment{}
	}
	return &n, nil
}

type UploadNotulensiFileParams struct {
	FileName    string `json:"file_name"`
	FileType    string `json:"file_type"`
	FileDataB64 string `json:"file_data_b64"`
}

type UploadNotulensiFileResponse struct {
	URL      string `json:"url"`
	Name     string `json:"name"`
	FileType string `json:"file_type"`
}

//encore:api auth path=/rapat/:id/notulensi/upload method=POST
func UploadNotulensiFile(ctx context.Context, id int, params *UploadNotulensiFileParams) (*UploadNotulensiFileResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Sekretaris atau Trimitra yang dapat mengunggah file notulensi",
		}
	}
	if params.FileName == "" || params.FileDataB64 == "" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "file_name dan file_data_b64 wajib diisi"}
	}

	dataURL := fmt.Sprintf("data:%s;base64,%s", params.FileType, params.FileDataB64)

	return &UploadNotulensiFileResponse{
		URL:      dataURL,
		Name:     params.FileName,
		FileType: params.FileType,
	}, nil
}

// ============================================================
// PRESENSI — QR scan, verifikasi izin/sakit, list rekap
// ============================================================

type PresensiDetail struct {
	PresensiID       int        `json:"presensi_id"`
	AcaraType        string     `json:"acara_type"`
	AcaraID          int        `json:"acara_id"`
	NIS              string     `json:"nis"`
	Tipe             string     `json:"tipe"`
	Keterangan       *string    `json:"keterangan"`
	BuktiURL         *string    `json:"bukti_url"`
	FotoURL          *string    `json:"foto_url"`
	StatusVerifikasi string     `json:"status_verifikasi"`
	WaktuSubmit      time.Time  `json:"waktu_submit"`
}

type ScanQRParams struct {
	QRToken  string  `json:"qr_token"`
	AcaraID  int     `json:"acara_id"`
	FotoURL  *string `json:"foto_url"`  // selfie untuk QR Masuk
	Tipe     string  `json:"tipe"`      // 'Hadir' (QR Masuk) atau 'Izin'/'Sakit' (QR Izin)
	Keterangan *string `json:"keterangan"`
	BuktiURL *string `json:"bukti_url"` // upload surat untuk Izin/Sakit
}

type ListPresensiResponse struct {
	Presensi []PresensiDetail `json:"presensi"`
}

// ScanPresensi — endpoint utama saat user scan QR (masuk atau izin/sakit)
//encore:api auth path=/presensi/scan method=POST
func ScanPresensi(ctx context.Context, params *ScanQRParams) (*PresensiDetail, error) {
	nis, _ := auth.UserID()

	if params.Tipe != "Hadir" && params.Tipe != "Izin" && params.Tipe != "Sakit" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "tipe harus 'Hadir', 'Izin', atau 'Sakit'"}
	}

	// Validasi QR token sesuai rapat/kegiatan
	var qrDB sql.NullString
	err := db.QueryRow(ctx, `SELECT qr_code FROM rapat WHERE rapat_id = $1`, params.AcaraID).Scan(&qrDB)
	if err != nil {
		return nil, &errs.Error{Code: errs.NotFound, Message: "acara tidak ditemukan"}
	}
	if !qrDB.Valid || qrDB.String != params.QRToken {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "QR code tidak valid"}
	}

	// Status verifikasi: Hadir langsung Disetujui; Izin/Sakit menunggu
	statusVerifikasi := "Menunggu"
	if params.Tipe == "Hadir" {
		statusVerifikasi = "Disetujui"
	}

	var keterangan, buktiURL, fotoURL sql.NullString
	if params.Keterangan != nil {
		keterangan.Valid = true
		keterangan.String = *params.Keterangan
	}
	if params.BuktiURL != nil {
		buktiURL.Valid = true
		buktiURL.String = *params.BuktiURL
	}
	if params.FotoURL != nil {
		fotoURL.Valid = true
		fotoURL.String = *params.FotoURL
	}

	var p PresensiDetail
	var retKet, retBukti, retFoto sql.NullString
	err = db.QueryRow(ctx, `
		INSERT INTO presensi
			(acara_type, acara_id, nis, tipe, keterangan, bukti_url, foto_url, status_verifikasi)
		VALUES ('Rapat', $1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (acara_type, acara_id, nis)
		DO UPDATE SET tipe = $3, keterangan = $4, bukti_url = $5, foto_url = $6,
		              status_verifikasi = $7, waktu_submit = NOW()
		RETURNING presensi_id, acara_type, acara_id, nis, tipe, keterangan,
		          bukti_url, foto_url, status_verifikasi, waktu_submit
	`, params.AcaraID, string(nis), params.Tipe, keterangan, buktiURL, fotoURL, statusVerifikasi).
		Scan(
			&p.PresensiID, &p.AcaraType, &p.AcaraID, &p.NIS, &p.Tipe,
			&retKet, &retBukti, &retFoto, &p.StatusVerifikasi, &p.WaktuSubmit,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retKet.Valid {
		p.Keterangan = &retKet.String
	}
	if retBukti.Valid {
		p.BuktiURL = &retBukti.String
	}
	if retFoto.Valid {
		p.FotoURL = &retFoto.String
	}
	return &p, nil
}

// ListPresensiRapat — rekap presensi satu rapat
//encore:api auth path=/rapat/:id/presensi method=GET
func ListPresensiRapat(ctx context.Context, id int) (*ListPresensiResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT presensi_id, acara_type, acara_id, nis, tipe, keterangan,
		       bukti_url, foto_url, status_verifikasi, waktu_submit
		FROM presensi WHERE acara_type = 'Rapat' AND acara_id = $1
		ORDER BY waktu_submit ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PresensiDetail
	for rows.Next() {
		p, err := scanPresensi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *p)
	}
	return &ListPresensiResponse{Presensi: list}, nil
}

type AttendanceEntry struct {
	UserNIS string `json:"user_nis"`
	Status  string `json:"status"` // 'hadir', 'izin', 'sakit', 'alpa'
}

type RecordAttendanceParams struct {
	Entries []AttendanceEntry `json:"entries"`
}

type RapatMessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/rapat/:id/presensi method=POST
func RecordAttendance(ctx context.Context, id int, params *RecordAttendanceParams) (*RapatMessageResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" && ud.GroupName != "Trimitra" && ud.GroupName != "Pembina" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Sekretaris, Trimitra atau Pembina"}
	}

	for _, entry := range params.Entries {
		status := "Alpa"
		switch entry.Status {
		case "hadir":
			status = "Hadir"
		case "izin":
			status = "Izin"
		case "sakit":
			status = "Sakit"
		}

		_, err := db.Exec(ctx, `
			INSERT INTO presensi (acara_type, acara_id, nis, tipe, status_verifikasi)
			VALUES ('Rapat', $1, $2, $3, 'Disetujui')
			ON CONFLICT (acara_type, acara_id, nis)
			DO UPDATE SET tipe = $3, status_verifikasi = 'Disetujui', waktu_submit = NOW()
		`, id, entry.UserNIS, status)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
	}

	return &RapatMessageResponse{Message: "Absensi berhasil direkam"}, nil
}

// VerifikasiPresensi — Sekretaris menyetujui/menolak entri Izin/Sakit
type VerifikasiPresensiParams struct {
	StatusVerifikasi string  `json:"status_verifikasi"` // 'Disetujui', 'Ditolak'
	Catatan          *string `json:"catatan"`
}

//encore:api auth path=/presensi/verifikasi/:id method=POST
func VerifikasiPresensi(ctx context.Context, id int, params *VerifikasiPresensiParams) (*PresensiDetail, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Sekretaris atau Trimitra yang dapat memverifikasi presensi",
		}
	}
	if params.StatusVerifikasi != "Disetujui" && params.StatusVerifikasi != "Ditolak" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status_verifikasi harus 'Disetujui' atau 'Ditolak'"}
	}

	res, err := db.Exec(ctx, `
		UPDATE presensi SET status_verifikasi = $1
		WHERE presensi_id = $2 AND status_verifikasi = 'Menunggu'
	`, params.StatusVerifikasi, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "presensi tidak ditemukan atau sudah diverifikasi"}
	}

	var p PresensiDetail
	var retKet, retBukti, retFoto sql.NullString
	err = db.QueryRow(ctx, `
		SELECT presensi_id, acara_type, acara_id, nis, tipe, keterangan,
		       bukti_url, foto_url, status_verifikasi, waktu_submit
		FROM presensi WHERE presensi_id = $1
	`, id).Scan(
		&p.PresensiID, &p.AcaraType, &p.AcaraID, &p.NIS, &p.Tipe,
		&retKet, &retBukti, &retFoto, &p.StatusVerifikasi, &p.WaktuSubmit,
	)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retKet.Valid {
		p.Keterangan = &retKet.String
	}
	if retBukti.Valid {
		p.BuktiURL = &retBukti.String
	}
	if retFoto.Valid {
		p.FotoURL = &retFoto.String
	}
	return &p, nil
}

// ListPresensiMenunggu — antrian Izin/Sakit yang belum diverifikasi
//encore:api auth path=/presensi/menunggu method=GET
func ListPresensiMenunggu(ctx context.Context) (*ListPresensiResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" && ud.GroupName != "Trimitra" {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "hanya Sekretaris atau Trimitra"}
	}

	rows, err := db.Query(ctx, `
		SELECT presensi_id, acara_type, acara_id, nis, tipe, keterangan,
		       bukti_url, foto_url, status_verifikasi, waktu_submit
		FROM presensi
		WHERE status_verifikasi = 'Menunggu'
		ORDER BY waktu_submit ASC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PresensiDetail
	for rows.Next() {
		p, err := scanPresensi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *p)
	}
	return &ListPresensiResponse{Presensi: list}, nil
}

// ============================================================
// PENGUMUMAN
// ============================================================

type PengumumanDetail struct {
	PengumumanID int       `json:"pengumuman_id"`
	Judul        string    `json:"judul"`
	Isi          string    `json:"isi"`
	DibuatOleh   string    `json:"dibuat_oleh"`
	Target       string    `json:"target"`
	DivisionID   *int      `json:"division_id"`
	Tanggal      time.Time `json:"tanggal"`
}

type CreatePengumumanParams struct {
	Judul      string `json:"judul"`
	Isi        string `json:"isi"`
	Target     string `json:"target"`     // 'Organisasi', 'Divisi'
	DivisionID *int   `json:"division_id"` // wajib jika target='Divisi'
}

type ListPengumumanResponse struct {
	Pengumuman []PengumumanDetail `json:"pengumuman"`
}

//encore:api auth path=/pengumuman method=GET
func ListPengumuman(ctx context.Context) (*ListPengumumanResponse, error) {
	ud := auth.Data().(*user.UserData)

	var rows *sqldb.Rows
	var err error

	if ud.HasScopeAll() {
		// Trimitra, Pembina, Sekretaris Umum, Bendahara Umum — lihat semua
		rows, err = db.Query(ctx, `
			SELECT pengumuman_id, judul, isi, dibuat_oleh, target, division_id, tanggal
			FROM pengumuman ORDER BY tanggal DESC
		`)
	} else if ud.DivisionID != nil {
		// Kepala Divisi & Staf — org + divisinya
		rows, err = db.Query(ctx, `
			SELECT pengumuman_id, judul, isi, dibuat_oleh, target, division_id, tanggal
			FROM pengumuman
			WHERE target = 'Organisasi' OR (target = 'Divisi' AND division_id = $1)
			ORDER BY tanggal DESC
		`, *ud.DivisionID)
	} else {
		rows, err = db.Query(ctx, `
			SELECT pengumuman_id, judul, isi, dibuat_oleh, target, division_id, tanggal
			FROM pengumuman WHERE target = 'Organisasi' ORDER BY tanggal DESC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PengumumanDetail
	for rows.Next() {
		p, err := scanPengumuman(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *p)
	}
	return &ListPengumumanResponse{Pengumuman: list}, nil
}

//encore:api auth path=/pengumuman method=POST
func BuatPengumuman(ctx context.Context, params *CreatePengumumanParams) (*PengumumanDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if params.Target != "Organisasi" && params.Target != "Divisi" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "target harus 'Organisasi' atau 'Divisi'"}
	}
	if params.Target == "Organisasi" {
		if ud.GroupName != "Trimitra" && ud.GroupName != "Sekretaris" && ud.GroupName != "Pembina" {
			return nil, &errs.Error{
				Code:    errs.PermissionDenied,
				Message: "hanya Trimitra, Sekretaris, atau Pembina yang dapat membuat pengumuman organisasi",
			}
		}
	} else {
		if ud.GroupName != "Kepala Divisi" && ud.GroupName != "Trimitra" {
			return nil, &errs.Error{
				Code:    errs.PermissionDenied,
				Message: "hanya Kepala Divisi atau Trimitra yang dapat membuat pengumuman divisi",
			}
		}
	}

	divID := sql.NullInt32{}
	if params.Target == "Divisi" {
		if params.DivisionID != nil {
			divID.Valid = true
			divID.Int32 = int32(*params.DivisionID)
		} else if ud.DivisionID != nil {
			divID.Valid = true
			divID.Int32 = int32(*ud.DivisionID)
		}
	}

	var p PengumumanDetail
	var retDivID sql.NullInt32
	err := db.QueryRow(ctx, `
		INSERT INTO pengumuman (judul, isi, dibuat_oleh, target, division_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING pengumuman_id, judul, isi, dibuat_oleh, target, division_id, tanggal
	`, params.Judul, params.Isi, string(nis), params.Target, divID).
		Scan(&p.PengumumanID, &p.Judul, &p.Isi, &p.DibuatOleh, &p.Target, &retDivID, &p.Tanggal)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		p.DivisionID = &v
	}
	return &p, nil
}

// ============================================================
// Helpers
// ============================================================

func scanRapat(row interface{ Scan(...interface{}) error }) (*RapatDetail, error) {
	var r RapatDetail
	var divID sql.NullInt32
	var qr sql.NullString
	if err := row.Scan(
		&r.RapatID, &r.PeriodeID, &divID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
		&r.DibuatOleh, &r.Status, &qr, &r.CreatedAt,
	); err != nil {
		return nil, err
	}
	if divID.Valid {
		v := int(divID.Int32)
		r.DivisionID = &v
	}
	if qr.Valid {
		r.QRCode = &qr.String
	}
	return &r, nil
}

func scanPresensi(row interface{ Scan(...interface{}) error }) (*PresensiDetail, error) {
	var p PresensiDetail
	var ket, bukti, foto sql.NullString
	if err := row.Scan(
		&p.PresensiID, &p.AcaraType, &p.AcaraID, &p.NIS, &p.Tipe,
		&ket, &bukti, &foto, &p.StatusVerifikasi, &p.WaktuSubmit,
	); err != nil {
		return nil, err
	}
	if ket.Valid {
		p.Keterangan = &ket.String
	}
	if bukti.Valid {
		p.BuktiURL = &bukti.String
	}
	if foto.Valid {
		p.FotoURL = &foto.String
	}
	return &p, nil
}

func scanPengumuman(row interface{ Scan(...interface{}) error }) (*PengumumanDetail, error) {
	var p PengumumanDetail
	var divID sql.NullInt32
	if err := row.Scan(
		&p.PengumumanID, &p.Judul, &p.Isi, &p.DibuatOleh, &p.Target, &divID, &p.Tanggal,
	); err != nil {
		return nil, err
	}
	if divID.Valid {
		v := int(divID.Int32)
		p.DivisionID = &v
	}
	return &p, nil
}
