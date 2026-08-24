package meeting

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
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
	ProkerID   *int       `json:"proker_id"`
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
	ProkerID   *int      `json:"proker_id"`
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
	var prokerID sql.NullInt32
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	var r RapatDetail
	var retDivID, retProkerID sql.NullInt32
	var retQR sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO rapat
			(periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda, dibuat_oleh, status, qr_code)
		VALUES (
			(SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1),
			$1, $2, $3, $4, $5, $6, $7, 'Terjadwal', $8
		)
		RETURNING rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
		          dibuat_oleh, status, qr_code, created_at
	`, divID, prokerID, params.Judul, params.Tanggal, params.Lokasi, params.Agenda, string(nis), qrToken).
		Scan(
			&r.RapatID, &r.PeriodeID, &retDivID, &retProkerID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
			&r.DibuatOleh, &r.Status, &retQR, &r.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		r.DivisionID = &v
	}
	if retProkerID.Valid {
		v := int(retProkerID.Int32)
		r.ProkerID = &v
	}
	if retQR.Valid {
		r.QRCode = &retQR.String
	}
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
			SELECT rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
			       dibuat_oleh, status, NULL AS qr_code, created_at
			FROM rapat ORDER BY tanggal DESC
		`)
	} else {
		rows, err = db.Query(ctx, `
			SELECT rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
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
		SELECT rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
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

//encore:api auth path=/rapat/:id/status method=PUT
func UpdateStatusRapat(ctx context.Context, id int, params *UpdateStatusRapatParams) (*MessageResponse, error) {
	nisStr, _ := auth.UserID()
	valid := map[string]bool{"Terjadwal": true, "Berlangsung": true, "Selesai": true, "Dibatalkan": true}
	if !valid[params.Status] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status tidak valid"}
	}

	res, err := db.Exec(ctx, `
		UPDATE rapat SET status = $1 WHERE rapat_id = $2 AND dibuat_oleh = $3
	`, params.Status, id, string(nisStr))
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan atau bukan milikmu"}
	}
	return &MessageResponse{Message: "Status rapat diperbarui"}, nil
}

type UpdateRapatParams struct {
	Judul      string `json:"judul"`
	Tanggal    string `json:"tanggal"`
	Lokasi     string `json:"lokasi"`
	Agenda     string `json:"agenda"`
	DivisionID *int   `json:"division_id"`
	ProkerID   *int   `json:"proker_id"`
	Status     string `json:"status"`
}

func canManageRapat(ud *user.UserData, dibuatOleh string) bool {
	if ud.GroupName == "Trimitra" || ud.GroupName == "Pembina" || ud.GroupName == "Sekretaris" {
		return true
	}
	return string(ud.NIS) == dibuatOleh
}

//encore:api auth path=/rapat/:id method=PUT
func UpdateRapat(ctx context.Context, id int, params *UpdateRapatParams) (*RapatDetail, error) {
	nisStr, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	var existingDibuatOleh string
	err := db.QueryRow(ctx, `SELECT dibuat_oleh FROM rapat WHERE rapat_id = $1`, id).Scan(&existingDibuatOleh)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if !canManageRapat(ud, existingDibuatOleh) && existingDibuatOleh != string(nisStr) {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "kamu tidak berhak mengubah rapat ini"}
	}

	var divID, prokerID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	tanggal, err := time.Parse(time.RFC3339, params.Tanggal)
	if err != nil {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "format tanggal tidak valid"}
	}

	status := params.Status
	if status == "" {
		status = "Terjadwal"
	}
	valid := map[string]bool{"Terjadwal": true, "Berlangsung": true, "Selesai": true, "Dibatalkan": true}
	if !valid[status] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "status tidak valid"}
	}

	var r RapatDetail
	var retDivID, retProkerID sql.NullInt32
	var retQR sql.NullString
	err = db.QueryRow(ctx, `
		UPDATE rapat SET judul = $1, tanggal = $2, lokasi = $3, agenda = $4,
		    division_id = $5, proker_id = $6, status = $7
		WHERE rapat_id = $8
		RETURNING rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
		          dibuat_oleh, status, qr_code, created_at
	`, params.Judul, tanggal, params.Lokasi, params.Agenda, divID, prokerID, status, id).
		Scan(&r.RapatID, &r.PeriodeID, &retDivID, &retProkerID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
			&r.DibuatOleh, &r.Status, &retQR, &r.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		r.DivisionID = &v
	}
	if retProkerID.Valid {
		v := int(retProkerID.Int32)
		r.ProkerID = &v
	}
	if retQR.Valid {
		r.QRCode = &retQR.String
	}
	return &r, nil
}

//encore:api auth path=/rapat/:id method=DELETE
func DeleteRapat(ctx context.Context, id int) (*MessageResponse, error) {
	nisStr, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	var dibuatOleh string
	err := db.QueryRow(ctx, `SELECT dibuat_oleh FROM rapat WHERE rapat_id = $1`, id).Scan(&dibuatOleh)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if !canManageRapat(ud, dibuatOleh) && dibuatOleh != string(nisStr) {
		return nil, &errs.Error{Code: errs.PermissionDenied, Message: "kamu tidak berhak menghapus rapat ini"}
	}

	// notulensi & dokumentasi terhapus otomatis via ON DELETE CASCADE
	_, err = db.Exec(ctx, `DELETE FROM presensi WHERE acara_type = 'Rapat' AND acara_id = $1`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	res, err := db.Exec(ctx, `DELETE FROM rapat WHERE rapat_id = $1`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "rapat tidak ditemukan"}
	}
	return &MessageResponse{Message: "Rapat berhasil dihapus"}, nil
}

// ============================================================
// NOTULENSI
// ============================================================

type NotulensiAttachment struct {
	URL   string `json:"url"`
	Nama  string `json:"nama"`
	Tipe  string `json:"tipe"`
}

type NotulensiDetail struct {
	NotulensiID      int                   `json:"notulensi_id"`
	RapatID          int                   `json:"rapat_id"`
	Isi              string                `json:"isi"`
	Tempat           string                `json:"tempat"`
	PimpinanRapat    string                `json:"pimpinan_rapat"`
	Notulis          string                `json:"notulis"`
	Peserta          string                `json:"peserta"`
	AgendaPembahasan string                `json:"agenda_pembahasan"`
	HasilPembahasan  string                `json:"hasil_pembahasan"`
	KeputusanRapat   string                `json:"keputusan_rapat"`
	TindakLanjut     string                `json:"tindak_lanjut"`
	PIC              string                `json:"pic"`
	DeadlineTL       *string               `json:"deadline_tl"`
	CatatanTambahan  string                `json:"catatan_tambahan"`
	Attachments      []NotulensiAttachment `json:"attachments"`
	DifinalisasiOleh *string               `json:"difinalisasi_oleh"`
	Status           string                `json:"status"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

type UpsertNotulensiParams struct {
	Isi              string                `json:"isi"`
	Tempat           string                `json:"tempat"`
	PimpinanRapat    string                `json:"pimpinan_rapat"`
	Notulis          string                `json:"notulis"`
	Peserta          string                `json:"peserta"`
	AgendaPembahasan string                `json:"agenda_pembahasan"`
	HasilPembahasan  string                `json:"hasil_pembahasan"`
	KeputusanRapat   string                `json:"keputusan_rapat"`
	TindakLanjut     string                `json:"tindak_lanjut"`
	PIC              string                `json:"pic"`
	DeadlineTL       *string               `json:"deadline_tl"`
	CatatanTambahan  string                `json:"catatan_tambahan"`
	Attachments      []NotulensiAttachment `json:"attachments"`
}

//encore:api auth path=/rapat/:id/notulensi method=PUT
func UpsertNotulensi(ctx context.Context, id int, params *UpsertNotulensiParams) (*NotulensiDetail, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Sekretaris" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Sekretaris yang dapat mengisi notulensi",
		}
	}

	attachJSON, err := json.Marshal(params.Attachments)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "gagal encode attachments"}
	}
	if len(params.Attachments) == 0 {
		attachJSON = []byte("[]")
	}

	var deadlineTL sql.NullString
	if params.DeadlineTL != nil && *params.DeadlineTL != "" {
		deadlineTL.Valid = true
		deadlineTL.String = *params.DeadlineTL
	}

	var n NotulensiDetail
	var retFinalisasi, retDeadline sql.NullString
	var attachStr string
	err = db.QueryRow(ctx, `
		INSERT INTO notulensi (rapat_id, isi, tempat, pimpinan_rapat, notulis, peserta,
		    agenda_pembahasan, hasil_pembahasan, keputusan_rapat, tindak_lanjut, pic, deadline_tl,
		    catatan_tambahan, attachments, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Draft')
		ON CONFLICT (rapat_id) DO UPDATE SET
		    isi = $2, tempat = $3, pimpinan_rapat = $4, notulis = $5, peserta = $6,
		    agenda_pembahasan = $7, hasil_pembahasan = $8, keputusan_rapat = $9,
		    tindak_lanjut = $10, pic = $11, deadline_tl = $12, catatan_tambahan = $13,
		    attachments = $14, updated_at = NOW()
		RETURNING notulensi_id, rapat_id, isi, tempat, pimpinan_rapat, notulis, peserta,
		    agenda_pembahasan, hasil_pembahasan, keputusan_rapat, tindak_lanjut, pic,
		    deadline_tl, catatan_tambahan, attachments, difinalisasi_oleh, status, updated_at
	`, id, params.Isi, params.Tempat, params.PimpinanRapat, params.Notulis, params.Peserta,
		params.AgendaPembahasan, params.HasilPembahasan, params.KeputusanRapat,
		params.TindakLanjut, params.PIC, deadlineTL, params.CatatanTambahan, string(attachJSON)).
		Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &n.Tempat, &n.PimpinanRapat, &n.Notulis, &n.Peserta,
			&n.AgendaPembahasan, &n.HasilPembahasan, &n.KeputusanRapat, &n.TindakLanjut, &n.PIC,
			&retDeadline, &n.CatatanTambahan, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if retDeadline.Valid {
		n.DeadlineTL = &retDeadline.String
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
	var retFinalisasi, retDeadline sql.NullString
	var attachStr string
	err := db.QueryRow(ctx, `
		UPDATE notulensi SET status = 'Final', difinalisasi_oleh = $1, updated_at = NOW()
		WHERE rapat_id = $2
		RETURNING notulensi_id, rapat_id, isi, tempat, pimpinan_rapat, notulis, peserta,
		    agenda_pembahasan, hasil_pembahasan, keputusan_rapat, tindak_lanjut, pic,
		    deadline_tl, catatan_tambahan, attachments, difinalisasi_oleh, status, updated_at
	`, string(nis), id).
		Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &n.Tempat, &n.PimpinanRapat, &n.Notulis, &n.Peserta,
			&n.AgendaPembahasan, &n.HasilPembahasan, &n.KeputusanRapat, &n.TindakLanjut, &n.PIC,
			&retDeadline, &n.CatatanTambahan, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "notulensi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if retDeadline.Valid {
		n.DeadlineTL = &retDeadline.String
	}
	if err2 := json.Unmarshal([]byte(attachStr), &n.Attachments); err2 != nil {
		n.Attachments = []NotulensiAttachment{}
	}
	return &n, nil
}

//encore:api auth path=/rapat/:id/notulensi method=GET
func GetNotulensi(ctx context.Context, id int) (*NotulensiDetail, error) {
	var n NotulensiDetail
	var retFinalisasi, retDeadline sql.NullString
	var attachStr string
	err := db.QueryRow(ctx, `
		SELECT notulensi_id, rapat_id, isi, tempat, pimpinan_rapat, notulis, peserta,
		    agenda_pembahasan, hasil_pembahasan, keputusan_rapat, tindak_lanjut, pic,
		    deadline_tl, catatan_tambahan, attachments, difinalisasi_oleh, status, updated_at
		FROM notulensi WHERE rapat_id = $1
	`, id).Scan(&n.NotulensiID, &n.RapatID, &n.Isi, &n.Tempat, &n.PimpinanRapat, &n.Notulis, &n.Peserta,
		&n.AgendaPembahasan, &n.HasilPembahasan, &n.KeputusanRapat, &n.TindakLanjut, &n.PIC,
		&retDeadline, &n.CatatanTambahan, &attachStr, &retFinalisasi, &n.Status, &n.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "notulensi belum ada"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFinalisasi.Valid {
		n.DifinalisasiOleh = &retFinalisasi.String
	}
	if retDeadline.Valid {
		n.DeadlineTL = &retDeadline.String
	}
	if err2 := json.Unmarshal([]byte(attachStr), &n.Attachments); err2 != nil {
		n.Attachments = []NotulensiAttachment{}
	}
	return &n, nil
}

// LookupRapatByQR — cari rapat berdasarkan QR token (dipanggil setelah kamera scan)
type LookupQRParams struct {
	QRToken string `query:"qr_token"`
}

//encore:api auth path=/lookup-qr method=GET
func LookupRapatByQR(ctx context.Context, params *LookupQRParams) (*RapatDetail, error) {
	var r RapatDetail
	var retDivID, retProkerID sql.NullInt32
	var retQR sql.NullString
	err := db.QueryRow(ctx, `
		SELECT rapat_id, periode_id, division_id, proker_id, judul, tanggal, lokasi, agenda,
		       dibuat_oleh, status, qr_code, created_at
		FROM rapat WHERE qr_code = $1
	`, params.QRToken).Scan(
		&r.RapatID, &r.PeriodeID, &retDivID, &retProkerID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
		&r.DibuatOleh, &r.Status, &retQR, &r.CreatedAt,
	)
	if err != nil {
		return nil, &errs.Error{Code: errs.NotFound, Message: "QR token tidak cocok dengan rapat manapun"}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		r.DivisionID = &v
	}
	if retProkerID.Valid {
		v := int(retProkerID.Int32)
		r.ProkerID = &v
	}
	if retQR.Valid {
		r.QRCode = &retQR.String
	}
	return &r, nil
}

// ============================================================
// DOKUMENTASI RAPAT
// File disimpan persistent di database, terhubung via rapat_id.
// file_url dapat berupa URL eksternal ATAU data-URL base64.
// ============================================================

type DokumentasiDetail struct {
	DokID        int       `json:"dok_id"`
	RapatID      int       `json:"rapat_id"`
	FileURL      string    `json:"file_url"`
	NamaFile     string    `json:"nama_file"`
	TipeFile     string    `json:"tipe_file"`
	Ukuran       int64     `json:"ukuran"`
	DiunggahOleh string    `json:"diunggah_oleh"`
	Keterangan   string    `json:"keterangan"`
	CreatedAt    time.Time `json:"created_at"`
}

type AddDokumentasiParams struct {
	FileURL    string `json:"file_url"`
	NamaFile   string `json:"nama_file"`
	TipeFile   string `json:"tipe_file"`
	Ukuran     int64  `json:"ukuran"`
	Keterangan string `json:"keterangan"`
}

type BatchDokumentasiParams struct {
	Files []AddDokumentasiParams `json:"files"`
}

type ListDokumentasiResponse struct {
	Dokumentasi []DokumentasiDetail `json:"dokumentasi"`
}

const maxDokumentasiChars = 12 * 1024 * 1024 // ±8MB binary saat di-encode base64

func validateDokumentasi(p AddDokumentasiParams) error {
	if p.FileURL == "" && p.NamaFile == "" {
		return &errs.Error{Code: errs.InvalidArgument, Message: "file kosong"}
	}
	if len(p.FileURL) > maxDokumentasiChars {
		return &errs.Error{Code: errs.InvalidArgument, Message: "ukuran file melebihi batas 8MB"}
	}
	return nil
}

//encore:api auth path=/rapat/:id/dokumentasi method=POST
func AddDokumentasi(ctx context.Context, id int, params *AddDokumentasiParams) (*DokumentasiDetail, error) {
	nis, _ := auth.UserID()
	if err := validateDokumentasi(*params); err != nil {
		return nil, err
	}

	var d DokumentasiDetail
	err := db.QueryRow(ctx, `
		INSERT INTO rapat_dokumentasi (rapat_id, file_url, nama_file, tipe_file, ukuran, diunggah_oleh, keterangan)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING dok_id, rapat_id, file_url, nama_file, tipe_file, ukuran, diunggah_oleh, keterangan, created_at
	`, id, params.FileURL, params.NamaFile, params.TipeFile, params.Ukuran, string(nis), params.Keterangan).
		Scan(&d.DokID, &d.RapatID, &d.FileURL, &d.NamaFile, &d.TipeFile, &d.Ukuran, &d.DiunggahOleh, &d.Keterangan, &d.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &d, nil
}

// BatchAddDokumentasi — simpan banyak file dokumentasi sekaligus secara ATOMIK
// (satu gagal = seluruh batch dibatalkan, tidak ada setengah tersimpan).
//encore:api auth path=/rapat/:id/dokumentasi/batch method=POST
func BatchAddDokumentasi(ctx context.Context, id int, params *BatchDokumentasiParams) (*ListDokumentasiResponse, error) {
	nis, _ := auth.UserID()
	if len(params.Files) == 0 {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "tidak ada file yang dikirim"}
	}
	for _, f := range params.Files {
		if err := validateDokumentasi(f); err != nil {
			return nil, err
		}
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer tx.Rollback()

	list := make([]DokumentasiDetail, 0, len(params.Files))
	for _, f := range params.Files {
		var d DokumentasiDetail
		err := tx.QueryRow(ctx, `
			INSERT INTO rapat_dokumentasi (rapat_id, file_url, nama_file, tipe_file, ukuran, diunggah_oleh, keterangan)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING dok_id, rapat_id, file_url, nama_file, tipe_file, ukuran, diunggah_oleh, keterangan, created_at
		`, id, f.FileURL, f.NamaFile, f.TipeFile, f.Ukuran, string(nis), f.Keterangan).
			Scan(&d.DokID, &d.RapatID, &d.FileURL, &d.NamaFile, &d.TipeFile, &d.Ukuran, &d.DiunggahOleh, &d.Keterangan, &d.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, d)
	}

	if err := tx.Commit(); err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &ListDokumentasiResponse{Dokumentasi: list}, nil
}

//encore:api auth path=/rapat/:id/dokumentasi method=GET
func ListDokumentasi(ctx context.Context, id int) (*ListDokumentasiResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT dok_id, rapat_id, file_url, nama_file, tipe_file, ukuran, diunggah_oleh, keterangan, created_at
		FROM rapat_dokumentasi WHERE rapat_id = $1
		ORDER BY created_at ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	list := []DokumentasiDetail{}
	for rows.Next() {
		var d DokumentasiDetail
		if err := rows.Scan(&d.DokID, &d.RapatID, &d.FileURL, &d.NamaFile, &d.TipeFile, &d.Ukuran, &d.DiunggahOleh, &d.Keterangan, &d.CreatedAt); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, d)
	}
	return &ListDokumentasiResponse{Dokumentasi: list}, nil
}

//encore:api auth path=/rapat/dokumentasi/:dokId method=DELETE
func DeleteDokumentasi(ctx context.Context, dokId int) (*MessageResponse, error) {
	nisStr, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	var res sqldb.Result
	var err error
	if ud.HasScopeAll() || ud.GroupName == "Sekretaris" {
		res, err = db.Exec(ctx, `DELETE FROM rapat_dokumentasi WHERE dok_id = $1`, dokId)
	} else {
		res, err = db.Exec(ctx, `DELETE FROM rapat_dokumentasi WHERE dok_id = $1 AND diunggah_oleh = $2`, dokId, string(nisStr))
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "dokumentasi tidak ditemukan atau bukan milikmu"}
	}
	return &MessageResponse{Message: "Dokumentasi berhasil dihapus"}, nil
}

// ============================================================
// LIST NOTULENSI SEMUA — untuk Modul Manajemen
// ============================================================

type NotulensiListItem struct {
	NotulensiID  int       `json:"notulensi_id"`
	RapatID      int       `json:"rapat_id"`
	JudulRapat   string    `json:"judul_rapat"`
	TanggalRapat time.Time `json:"tanggal_rapat"`
	DivisionID   *int      `json:"division_id"`
	ProkerID     *int      `json:"proker_id"`
	Notulis      string    `json:"notulis"`
	Status       string    `json:"status"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ListAllNotulensiResponse struct {
	Notulensi []NotulensiListItem `json:"notulensi"`
}

//encore:api auth path=/notulensi method=GET
func ListAllNotulensi(ctx context.Context) (*ListAllNotulensiResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT n.notulensi_id, n.rapat_id, r.judul, r.tanggal, r.division_id, r.proker_id,
		       n.notulis, n.status, n.updated_at
		FROM notulensi n
		JOIN rapat r ON r.rapat_id = n.rapat_id
		ORDER BY r.tanggal DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	list := []NotulensiListItem{}
	for rows.Next() {
		var item NotulensiListItem
		var divID, prokerID sql.NullInt32
		if err := rows.Scan(&item.NotulensiID, &item.RapatID, &item.JudulRapat, &item.TanggalRapat,
			&divID, &prokerID, &item.Notulis, &item.Status, &item.UpdatedAt); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if divID.Valid {
			v := int(divID.Int32)
			item.DivisionID = &v
		}
		if prokerID.Valid {
			v := int(prokerID.Int32)
			item.ProkerID = &v
		}
		list = append(list, item)
	}
	return &ListAllNotulensiResponse{Notulensi: list}, nil
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
	var divID, prokerID sql.NullInt32
	var qr sql.NullString
	if err := row.Scan(
		&r.RapatID, &r.PeriodeID, &divID, &prokerID, &r.Judul, &r.Tanggal, &r.Lokasi, &r.Agenda,
		&r.DibuatOleh, &r.Status, &qr, &r.CreatedAt,
	); err != nil {
		return nil, err
	}
	if divID.Valid {
		v := int(divID.Int32)
		r.DivisionID = &v
	}
	if prokerID.Valid {
		v := int(prokerID.Int32)
		r.ProkerID = &v
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
