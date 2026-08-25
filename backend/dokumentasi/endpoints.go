package dokumentasi

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.NewDatabase("dokumentasi", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

const maxDocFileBytes = 10 << 20 // 10 MB

type DokumentasiAttachment struct {
	ID        int       `json:"id"`
	FileName  string    `json:"file_name"`
	FileType  string    `json:"file_type"`
	FileSize  int64     `json:"file_size"`
	FileURL   *string   `json:"file_url"`
	DriveURL  *string   `json:"drive_url"`
	CreatedAt time.Time `json:"created_at"`
}

type DokumentasiDetail struct {
	ID              int                      `json:"id"`
	Judul           string                   `json:"judul"`
	Deskripsi       string                   `json:"deskripsi"`
	Kegiatan        string                   `json:"kegiatan"`
	TanggalKegiatan time.Time                `json:"tanggal_kegiatan"`
	Lokasi          string                   `json:"lokasi"`
	SekbidAsal      *int                     `json:"sekbid_asal"`
	ProkerID        *int                     `json:"proker_id"`
	FileURL         *string                  `json:"file_url"`
	FileName        *string                  `json:"file_name"`
	FileType        *string                  `json:"file_type"`
	FileSize        *int64                   `json:"file_size"`
	DriveURL        *string                  `json:"drive_url"`
	FolderName      *string                  `json:"folder_name"`
	Attachments     []DokumentasiAttachment  `json:"attachments"`
	DibuatOleh      string                   `json:"dibuat_oleh"`
	CreatedAt       time.Time                `json:"created_at"`
}

type CreateDokumentasiParams struct {
	Judul           string  `json:"judul"`
	Deskripsi       string  `json:"deskripsi"`
	Kegiatan        string  `json:"kegiatan"`
	TanggalKegiatan time.Time `json:"tanggal_kegiatan"`
	Lokasi          string  `json:"lokasi"`
	SekbidAsal      *int    `json:"sekbid_asal"`
	ProkerID        *int    `json:"proker_id"`
	FolderName      *string `json:"folder_name"`
	FileName        *string `json:"file_name"`
	FileType        *string `json:"file_type"`
	FileDataB64     *string `json:"file_data_b64"`
	DriveURL        *string `json:"drive_url"`
}

type ListDokumentasiResponse struct {
	Dokumentasi []DokumentasiDetail `json:"dokumentasi"`
}

type ListDokumentasiParams struct {
	SekbidAsal int `query:"sekbid_asal"`
}

// Helper: semua user boleh lihat, tapi PDD (Sekbid 9) dan Trimitra/Pembina bisa kelola
func canManagePDD(ud *user.UserData) bool {
	if ud.GroupName == "Trimitra" || ud.GroupName == "Pembina" {
		return true
	}
	if ud.GroupName == "Kepala Divisi" && ud.DivisionID != nil && *ud.DivisionID == 9 {
		return true
	}
	if ud.DivisionID != nil && *ud.DivisionID == 9 {
		return true
	}
	// Staf PDD juga boleh
	return false
}

//encore:api auth path=/dokumentasi/pdd method=GET
func ListDokumentasi(ctx context.Context, params *ListDokumentasiParams) (*ListDokumentasiResponse, error) {
	query := `SELECT id, judul, deskripsi, kegiatan, tanggal_kegiatan, lokasi, sekbid_asal, proker_id, file_url, file_name, file_type, file_size, drive_url, folder_name, dibuat_oleh, created_at FROM dokumentasi_pdd`
	var args []interface{}
	if params != nil && params.SekbidAsal != 0 {
		query += ` WHERE sekbid_asal = $1`
		args = append(args, params.SekbidAsal)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()
	var list []DokumentasiDetail
	for rows.Next() {
		d, err := scanDokumentasi(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, *d)
	}
	if list == nil {
		list = []DokumentasiDetail{}
	}
	return &ListDokumentasiResponse{Dokumentasi: list}, nil
}

//encore:api auth path=/dokumentasi/pdd/:id method=GET
func GetDokumentasi(ctx context.Context, id int) (*DokumentasiDetail, error) {
	row := db.QueryRow(ctx, `SELECT id, judul, deskripsi, kegiatan, tanggal_kegiatan, lokasi, sekbid_asal, proker_id, file_url, file_name, file_type, file_size, drive_url, folder_name, dibuat_oleh, created_at FROM dokumentasi_pdd WHERE id = $1`, id)
	d, err := scanDokumentasi(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "dokumentasi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return d, nil
}

//encore:api auth path=/dokumentasi/pdd method=POST
func CreateDokumentasi(ctx context.Context, params *CreateDokumentasiParams) (*DokumentasiDetail, error) {
	nis, _ := auth.UserID()
	// Semua user boleh setor dokumentasi ke PDD (tiap Sekbid bisa setor), hanya validasi
	if params.Judul == "" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "judul wajib diisi"}
	}
	if params.Kegiatan == "" {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "kegiatan wajib diisi"}
	}
	if params.TanggalKegiatan.IsZero() {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "tanggal_kegiatan wajib diisi"}
	}
	if params.SekbidAsal != nil && (*params.SekbidAsal < 1 || *params.SekbidAsal > 10) {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "sekbid_asal harus 1-10 atau null untuk Semua"}
	}
	var sekbid sql.NullInt32
	var proker sql.NullInt32
	if params.SekbidAsal != nil {
		sekbid.Valid = true
		sekbid.Int32 = int32(*params.SekbidAsal)
	}
	if params.ProkerID != nil {
		proker.Valid = true
		proker.Int32 = int32(*params.ProkerID)
	}
	// Handle file upload inline base64
	var token sql.NullString
	var fileName sql.NullString
	var fileType sql.NullString
	var fileSize sql.NullInt64
	var content []byte
	if params.FileDataB64 != nil && *params.FileDataB64 != "" {
		b64 := *params.FileDataB64
		if idx := strings.Index(b64, ","); idx >= 0 && strings.HasPrefix(b64, "data:") {
			b64 = b64[idx+1:]
		}
		data, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			if data2, err2 := base64.RawStdEncoding.DecodeString(strings.TrimRight(b64, "=")); err2 == nil {
				data = data2
			} else {
				return nil, &errs.Error{Code: errs.InvalidArgument, Message: "file_data_b64 bukan base64 valid"}
			}
		}
		if len(data) > maxDocFileBytes {
			return nil, &errs.Error{Code: errs.InvalidArgument, Message: "ukuran file maksimal 10 MB"}
		}
		lowType := ""
		if params.FileType != nil {
			lowType = strings.ToLower(*params.FileType)
		}
		if !(strings.HasPrefix(lowType, "image/") || strings.HasPrefix(lowType, "application/pdf") || strings.HasPrefix(lowType, "video/")) {
			// allow all for dokumentasi (foto kegiatan, pdf, video)
		}
		content = data
		tb := make([]byte, 16)
		if _, err := rand.Read(tb); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: "gagal generate token"}
		}
		tok := hex.EncodeToString(tb)
		token.Valid = true
		token.String = tok
		if params.FileName != nil {
			fileName.Valid = true
			fileName.String = *params.FileName
		}
		if params.FileType != nil {
			fileType.Valid = true
			fileType.String = *params.FileType
		}
		fileSize.Valid = true
		fileSize.Int64 = int64(len(data))
	}
	var fileURL sql.NullString
	if token.Valid {
		u := fmt.Sprintf("/dokumentasi-files/%s", token.String)
		fileURL.Valid = true
		fileURL.String = u
	}
	var driveURL sql.NullString
	if params.DriveURL != nil && *params.DriveURL != "" {
		driveURL.Valid = true
		driveURL.String = *params.DriveURL
	}
	var folderName sql.NullString
	if params.FolderName != nil && *params.FolderName != "" {
		folderName.Valid = true
		folderName.String = *params.FolderName
	}
	var d DokumentasiDetail
	var retSekbid, retProker sql.NullInt32
	var retFileURL, retFileName, retFileType, retDriveURL, retFolderName sql.NullString
	var retFileSize sql.NullInt64
	err := db.QueryRow(ctx, `
		INSERT INTO dokumentasi_pdd (judul, deskripsi, kegiatan, tanggal_kegiatan, lokasi, sekbid_asal, proker_id, file_url, file_name, file_type, file_size, drive_url, folder_name, content, token, dibuat_oleh)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id, judul, deskripsi, kegiatan, tanggal_kegiatan, lokasi, sekbid_asal, proker_id, file_url, file_name, file_type, file_size, drive_url, folder_name, dibuat_oleh, created_at
	`, params.Judul, params.Deskripsi, params.Kegiatan, params.TanggalKegiatan, params.Lokasi, sekbid, proker, fileURL, fileName, fileType, fileSize, driveURL, folderName, content, token, string(nis)).Scan(
		&d.ID, &d.Judul, &d.Deskripsi, &d.Kegiatan, &d.TanggalKegiatan, &d.Lokasi, &retSekbid, &retProker, &retFileURL, &retFileName, &retFileType, &retFileSize, &retDriveURL, &retFolderName, &d.DibuatOleh, &d.CreatedAt,
	)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retSekbid.Valid {
		v := int(retSekbid.Int32)
		d.SekbidAsal = &v
	}
	if retProker.Valid {
		v := int(retProker.Int32)
		d.ProkerID = &v
	}
	if retFileURL.Valid {
		d.FileURL = &retFileURL.String
	}
	if retFileName.Valid {
		d.FileName = &retFileName.String
	}
	if retFileType.Valid {
		d.FileType = &retFileType.String
	}
	if retFileSize.Valid {
		d.FileSize = &retFileSize.Int64
	}
	if retDriveURL.Valid {
		d.DriveURL = &retDriveURL.String
	}
	if retFolderName.Valid {
		d.FolderName = &retFolderName.String
	}
	// Load attachments (multi-foto folder)
	d.Attachments = []DokumentasiAttachment{}
	rows, _ := db.Query(ctx, `SELECT id, file_name, file_type, file_size, file_url, drive_url, created_at FROM dokumentasi_files WHERE dokumentasi_id = $1 ORDER BY created_at ASC`, d.ID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var att DokumentasiAttachment
			var fu, du sql.NullString
			if err := rows.Scan(&att.ID, &att.FileName, &att.FileType, &att.FileSize, &fu, &du, &att.CreatedAt); err == nil {
				if fu.Valid {
					att.FileURL = &fu.String
				}
				if du.Valid {
					att.DriveURL = &du.String
				}
				d.Attachments = append(d.Attachments, att)
			}
		}
	}
	return &d, nil
}

//encore:api auth path=/dokumentasi/pdd/:id method=PUT
func UpdateDokumentasi(ctx context.Context, id int, params *CreateDokumentasiParams) (*DokumentasiDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)
	var existing DibuatOlehCheck
	_ = ud
	_ = nis
	_ = existing
	var sekbid sql.NullInt32
	var proker sql.NullInt32
	if params.SekbidAsal != nil {
		sekbid.Valid = true
		sekbid.Int32 = int32(*params.SekbidAsal)
	}
	if params.ProkerID != nil {
		proker.Valid = true
		proker.Int32 = int32(*params.ProkerID)
	}
	var driveURL sql.NullString
	if params.DriveURL != nil {
		driveURL.Valid = true
		driveURL.String = *params.DriveURL
	}
	var folderName sql.NullString
	if params.FolderName != nil {
		folderName.Valid = true
		folderName.String = *params.FolderName
	}
	_, err := db.Exec(ctx, `UPDATE dokumentasi_pdd SET judul=$1, deskripsi=$2, kegiatan=$3, tanggal_kegiatan=$4, lokasi=$5, sekbid_asal=$6, proker_id=$7, drive_url=$8, folder_name=$9 WHERE id=$10`, params.Judul, params.Deskripsi, params.Kegiatan, params.TanggalKegiatan, params.Lokasi, sekbid, proker, driveURL, folderName, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return GetDokumentasi(ctx, id)
}

type DibuatOlehCheck struct {
	DibuatOleh string
}

//encore:api auth path=/dokumentasi/pdd/:id method=DELETE
func DeleteDokumentasi(ctx context.Context, id int) (*MessageResponse, error) {
	_, err := db.Exec(ctx, `DELETE FROM dokumentasi_pdd WHERE id = $1`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &MessageResponse{Message: "Dokumentasi berhasil dihapus"}, nil
}

type MessageResponse struct {
	Message string `json:"message"`
}

type AddFileParams struct {
	FileName    string  `json:"file_name"`
	FileType    string  `json:"file_type"`
	FileDataB64 *string `json:"file_data_b64"`
	DriveURL    *string `json:"drive_url"`
}

//encore:api auth path=/dokumentasi/pdd/:id/files method=POST
func AddDokumentasiFile(ctx context.Context, id int, params *AddFileParams) (*DokumentasiAttachment, error) {
	nis, _ := auth.UserID()
	if params.FileName == "" && (params.DriveURL == nil || *params.DriveURL == "") {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "file_name atau drive_url wajib diisi"}
	}
	var token sql.NullString
	var fileURL sql.NullString
	var driveURL sql.NullString
	var content []byte
	var fileSize int64
	if params.DriveURL != nil && *params.DriveURL != "" {
		driveURL.Valid = true
		driveURL.String = *params.DriveURL
		fileURL.Valid = true
		fileURL.String = *params.DriveURL
	} else if params.FileDataB64 != nil && *params.FileDataB64 != "" {
		b64 := *params.FileDataB64
		if idx := strings.Index(b64, ","); idx >= 0 && strings.HasPrefix(b64, "data:") {
			b64 = b64[idx+1:]
		}
		data, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			if data2, err2 := base64.RawStdEncoding.DecodeString(strings.TrimRight(b64, "=")); err2 == nil {
				data = data2
			} else {
				return nil, &errs.Error{Code: errs.InvalidArgument, Message: "file_data_b64 bukan base64 valid"}
			}
		}
		if len(data) > maxDocFileBytes {
			return nil, &errs.Error{Code: errs.InvalidArgument, Message: "ukuran file maksimal 10 MB"}
		}
		content = data
		fileSize = int64(len(data))
		tb := make([]byte, 16)
		if _, err := rand.Read(tb); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: "gagal generate token"}
		}
		tok := hex.EncodeToString(tb)
		token.Valid = true
		token.String = tok
		fileURL.Valid = true
		fileURL.String = fmt.Sprintf("/dokumentasi-files/%s", tok)
	}
	var att DokumentasiAttachment
	var retFileURL, retDriveURL sql.NullString
	err := db.QueryRow(ctx, `INSERT INTO dokumentasi_files (dokumentasi_id, file_name, file_type, file_size, file_url, drive_url, content, token, dibuat_oleh) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, file_name, file_type, file_size, file_url, drive_url, created_at`, id, params.FileName, params.FileType, fileSize, fileURL, driveURL, content, token, string(nis)).Scan(&att.ID, &att.FileName, &att.FileType, &att.FileSize, &retFileURL, &retDriveURL, &att.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retFileURL.Valid {
		att.FileURL = &retFileURL.String
	}
	if retDriveURL.Valid {
		att.DriveURL = &retDriveURL.String
	}
	return &att, nil
}

//encore:api auth path=/dokumentasi/pdd/:id/files/:fileId method=DELETE
func DeleteDokumentasiFile(ctx context.Context, id int, fileId int) (*MessageResponse, error) {
	_, err := db.Exec(ctx, `DELETE FROM dokumentasi_files WHERE id = $1 AND dokumentasi_id = $2`, fileId, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &MessageResponse{Message: "File berhasil dihapus"}, nil
}

//encore:api public raw method=GET path=/dokumentasi-files/*token
func ServeDokumentasiFile(w http.ResponseWriter, req *http.Request) {
	token := strings.TrimPrefix(req.URL.Path, "/dokumentasi-files/")
	token = strings.Trim(token, "/")
	if token == "" {
		http.Error(w, "token tidak valid", http.StatusBadRequest)
		return
	}
	var fileName, fileType string
	var content []byte
	err := db.QueryRow(req.Context(), `SELECT file_name, file_type, content FROM dokumentasi_pdd WHERE token = $1`, token).Scan(&fileName, &fileType, &content)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "file tidak ditemukan", http.StatusNotFound)
			return
		}
		http.Error(w, "gagal mengambil file", http.StatusInternalServerError)
		return
	}
	if fileType == "" {
		fileType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", fileType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(content)))
	w.Header().Set("Cache-Control", "private, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	disposition := "attachment"
	if strings.HasPrefix(fileType, "image/") || fileType == "application/pdf" || strings.HasPrefix(fileType, "video/") {
		disposition = "inline"
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf("%s; filename*=UTF-8''%s", disposition, url.PathEscape(fileName)))
	_, _ = w.Write(content)
}

func scanDokumentasi(row interface{ Scan(...interface{}) error }) (*DokumentasiDetail, error) {
	var d DokumentasiDetail
	var sekbid, proker sql.NullInt32
	var fileURL, fileName, fileType sql.NullString
	var fileSize sql.NullInt64
	if err := row.Scan(&d.ID, &d.Judul, &d.Deskripsi, &d.Kegiatan, &d.TanggalKegiatan, &d.Lokasi, &sekbid, &proker, &fileURL, &fileName, &fileType, &fileSize, &d.DibuatOleh, &d.CreatedAt); err != nil {
		return nil, err
	}
	if sekbid.Valid {
		v := int(sekbid.Int32)
		d.SekbidAsal = &v
	}
	if proker.Valid {
		v := int(proker.Int32)
		d.ProkerID = &v
	}
	if fileURL.Valid {
		d.FileURL = &fileURL.String
	}
	if fileName.Valid {
		d.FileName = &fileName.String
	}
	if fileType.Valid {
		d.FileType = &fileType.String
	}
	if fileSize.Valid {
		d.FileSize = &fileSize.Int64
	}
	return &d, nil
}
