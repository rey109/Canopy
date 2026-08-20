package user

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ============================================================
// Register
// ============================================================

type RegisterParams struct {
	NIS       string `json:"nis"`
	Nama      string `json:"nama"`
	Jurusan   string `json:"jurusan"`
	TahunMasuk int   `json:"tahun_masuk"`
	Password  string `json:"password"`
}

type RegisterResponse struct {
	Message string `json:"message"`
}

// Register hanya membuat entri di tabel users (tanpa role).
// Penugasan role dilakukan terpisah melalui endpoint AssignMembership.
//encore:api public path=/user/register method=POST
func Register(ctx context.Context, params *RegisterParams) (*RegisterResponse, error) {
	if params.NIS == "" || params.Nama == "" || params.Password == "" {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "NIS, Nama, dan Password wajib diisi",
		}
	}

	var exists bool
	if err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE nis = $1)", params.NIS).Scan(&exists); err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if exists {
		return nil, &errs.Error{Code: errs.AlreadyExists, Message: "NIS sudah terdaftar"}
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "gagal hash password"}
	}

	_, err = db.Exec(ctx, `
		INSERT INTO users (nis, nama, jurusan, tahun_masuk, password_hash)
		VALUES ($1, $2, $3, $4, $5)
	`, params.NIS, params.Nama, params.Jurusan, params.TahunMasuk, string(hashed))
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	return &RegisterResponse{Message: "User berhasil didaftarkan"}, nil
}

// ============================================================
// Login
// ============================================================

type LoginParams struct {
	NIS      string `json:"nis"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string     `json:"token"`
	User  UserDetail `json:"user"`
}

// UserDetail adalah profil lengkap yang dikirim ke frontend saat login/getProfile.
type UserDetail struct {
	NIS          string  `json:"nis"`
	Nama         string  `json:"nama"`
	Jurusan      string  `json:"jurusan"`
	TahunMasuk   int     `json:"tahun_masuk"`
	FotoURL      *string `json:"foto_url"`

	// Keanggotaan aktif
	MembershipID int     `json:"membership_id"`
	RoleID       int     `json:"role_id"`
	RoleName     string  `json:"role_name"`
	GroupID      int     `json:"group_id"`
	GroupName    string  `json:"group_name"`
	Level        int     `json:"level"`

	// Scope divisi
	DivisionID       *int `json:"division_id"`
	ScopeDivisiAwal  *int `json:"scope_divisi_awal"`
	ScopeDivisiAkhir *int `json:"scope_divisi_akhir"`

	// Periode aktif
	PeriodeID   int    `json:"periode_id"`
	TahunAjaran string `json:"tahun_ajaran"`
}

//encore:api public path=/user/login method=POST
func Login(ctx context.Context, params *LoginParams) (*LoginResponse, error) {
	var passHash string
	err := db.QueryRow(ctx, "SELECT password_hash FROM users WHERE nis = $1", params.NIS).Scan(&passHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.Unauthenticated, Message: "NIS atau password salah"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	if err = bcrypt.CompareHashAndPassword([]byte(passHash), []byte(params.Password)); err != nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "NIS atau password salah"}
	}

	ud, err := loadUserData(ctx, params.NIS)
	if err != nil {
		return nil, err
	}

	detail, err := buildUserDetail(ctx, params.NIS, ud)
	if err != nil {
		return nil, err
	}

	claims := &jwt.RegisteredClaims{
		Subject:   params.NIS,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "gagal membuat token"}
	}

	return &LoginResponse{Token: tokenString, User: *detail}, nil
}

// ============================================================
// GetProfile
// ============================================================

//encore:api auth path=/user/profile method=GET
func GetProfile(ctx context.Context) (*UserDetail, error) {
	nis, ok := auth.UserID()
	if !ok {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "tidak terautentikasi"}
	}

	ud := auth.Data().(*UserData)
	return buildUserDetail(ctx, string(nis), ud)
}

// ============================================================
// ListUsers — untuk menampilkan daftar anggota
// ============================================================

type ListUsersParams struct {
	DivisionID int    `query:"division_id"`
	GroupName  string `query:"group_name"`
	PeriodeID  int    `query:"periode_id"`
}

type ListUsersResponse struct {
	Users []UserDetail `json:"users"`
}

//encore:api auth path=/users method=GET
func ListUsers(ctx context.Context, params *ListUsersParams) (*ListUsersResponse, error) {
	// Default ke periode aktif jika tidak dispesifikkan
	var periodeID *int
	if params.PeriodeID > 0 {
		pid := params.PeriodeID
		periodeID = &pid
	} else {
		var pid int
		if err := db.QueryRow(ctx, "SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1").Scan(&pid); err == nil {
			periodeID = &pid
		}
	}

	var divisionID *int
	if params.DivisionID > 0 {
		divID := params.DivisionID
		divisionID = &divID
	}

	var groupName *string
	if params.GroupName != "" {
		gName := params.GroupName
		groupName = &gName
	}

	rows, err := db.Query(ctx, `
		SELECT
			u.nis,
			u.nama,
			u.jurusan,
			u.tahun_masuk,
			u.foto_url,
			k.membership_id,
			k.role_id,
			r.role_name,
			rg.group_id,
			rg.group_name,
			r.level,
			k.division_id,
			r.scope_divisi_awal,
			r.scope_divisi_akhir,
			p.periode_id,
			p.tahun_ajaran
		FROM users u
		JOIN kepengurusan k ON k.nis = u.nis
		JOIN roles r ON r.role_id = k.role_id
		JOIN role_groups rg ON rg.group_id = r.group_id
		JOIN periode p ON p.periode_id = k.periode_id
		WHERE k.status = 'Aktif'
		  AND ($1::INT IS NULL OR k.periode_id = $1)
		  AND ($2::INT IS NULL OR k.division_id = $2)
		  AND ($3::TEXT IS NULL OR rg.group_name = $3)
		ORDER BY rg.group_id, r.level, u.nama
	`, periodeID, divisionID, groupName)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var users []UserDetail
	for rows.Next() {
		d, err := scanUserDetail(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		users = append(users, *d)
	}

	return &ListUsersResponse{Users: users}, nil
}

// ============================================================
// GetUser — ambil satu user berdasarkan NIS
// ============================================================

//encore:api auth path=/users/:nis method=GET
func GetUser(ctx context.Context, nis string) (*UserDetail, error) {
	ud, err := loadUserData(ctx, nis)
	if err != nil {
		return nil, err
	}
	return buildUserDetail(ctx, nis, ud)
}

// ============================================================
// AssignMembership — Trimitra menugaskan role ke user di periode tertentu
// ============================================================

type AssignMembershipParams struct {
	NIS        string `json:"nis"`
	RoleID     int    `json:"role_id"`
	DivisionID *int   `json:"division_id"`
	PeriodeID  int    `json:"periode_id"`
}

type AssignMembershipResponse struct {
	MembershipID int    `json:"membership_id"`
	Message      string `json:"message"`
}

//encore:api auth path=/user/membership method=POST
func AssignMembership(ctx context.Context, params *AssignMembershipParams) (*AssignMembershipResponse, error) {
	userData := auth.Data().(*UserData)
	if userData.GroupName != "Trimitra" && userData.GroupName != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Trimitra atau Pembina yang dapat menugaskan keanggotaan",
		}
	}

	// Nonaktifkan keanggotaan lama di periode yang sama (jika ada)
	_, err := db.Exec(ctx, `
		UPDATE kepengurusan SET status = 'Nonaktif'
		WHERE nis = $1 AND periode_id = $2 AND status = 'Aktif'
	`, params.NIS, params.PeriodeID)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	var divID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}

	var mid int
	err = db.QueryRow(ctx, `
		INSERT INTO kepengurusan (nis, role_id, division_id, periode_id, status)
		VALUES ($1, $2, $3, $4, 'Aktif')
		RETURNING membership_id
	`, params.NIS, params.RoleID, divID, params.PeriodeID).Scan(&mid)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	return &AssignMembershipResponse{
		MembershipID: mid,
		Message:      "Keanggotaan berhasil ditugaskan",
	}, nil
}

// ============================================================
// GetRiwayatJabatan — riwayat jabatan semua periode untuk satu user
// ============================================================

type JabatanEntry struct {
	MembershipID int    `json:"membership_id"`
	RoleID       int    `json:"role_id"`
	RoleName     string `json:"role_name"`
	GroupName    string `json:"group_name"`
	DivisionID   *int   `json:"division_id"`
	PeriodeID    int    `json:"periode_id"`
	TahunAjaran  string `json:"tahun_ajaran"`
	Status       string `json:"status"`
}

type RiwayatJabatanResponse struct {
	Riwayat []JabatanEntry `json:"riwayat"`
}

//encore:api auth path=/users/:nis/riwayat method=GET
func GetRiwayatJabatan(ctx context.Context, nis string) (*RiwayatJabatanResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT
			k.membership_id,
			k.role_id,
			r.role_name,
			rg.group_name,
			k.division_id,
			p.periode_id,
			p.tahun_ajaran,
			k.status
		FROM kepengurusan k
		JOIN roles r ON r.role_id = k.role_id
		JOIN role_groups rg ON rg.group_id = r.group_id
		JOIN periode p ON p.periode_id = k.periode_id
		WHERE k.nis = $1
		ORDER BY p.tahun_ajaran DESC
	`, nis)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var riwayat []JabatanEntry
	for rows.Next() {
		var e JabatanEntry
		var divID sql.NullInt32
		if err := rows.Scan(
			&e.MembershipID, &e.RoleID, &e.RoleName, &e.GroupName,
			&divID, &e.PeriodeID, &e.TahunAjaran, &e.Status,
		); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if divID.Valid {
			v := int(divID.Int32)
			e.DivisionID = &v
		}
		riwayat = append(riwayat, e)
	}
	return &RiwayatJabatanResponse{Riwayat: riwayat}, nil
}

// ============================================================
// ListRoles — untuk dropdown saat assign membership
// ============================================================

type RoleEntry struct {
	RoleID           int    `json:"role_id"`
	GroupID          int    `json:"group_id"`
	GroupName        string `json:"group_name"`
	RoleName         string `json:"role_name"`
	Level            int    `json:"level"`
	ScopeDivisiAwal  *int   `json:"scope_divisi_awal"`
	ScopeDivisiAkhir *int   `json:"scope_divisi_akhir"`
}

type ListRolesResponse struct {
	Roles []RoleEntry `json:"roles"`
}

//encore:api auth path=/roles method=GET
func ListRoles(ctx context.Context) (*ListRolesResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT r.role_id, rg.group_id, rg.group_name, r.role_name, r.level,
		       r.scope_divisi_awal, r.scope_divisi_akhir
		FROM roles r
		JOIN role_groups rg ON rg.group_id = r.group_id
		ORDER BY rg.group_id, r.level, r.role_id
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var roles []RoleEntry
	for rows.Next() {
		var e RoleEntry
		var awal, akhir sql.NullInt32
		if err := rows.Scan(&e.RoleID, &e.GroupID, &e.GroupName, &e.RoleName, &e.Level, &awal, &akhir); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if awal.Valid {
			v := int(awal.Int32)
			e.ScopeDivisiAwal = &v
		}
		if akhir.Valid {
			v := int(akhir.Int32)
			e.ScopeDivisiAkhir = &v
		}
		roles = append(roles, e)
	}
	return &ListRolesResponse{Roles: roles}, nil
}

// ============================================================
// ListPeriode — untuk dropdown filter periode
// ============================================================

type PeriodeEntry struct {
	PeriodeID   int     `json:"periode_id"`
	TahunAjaran string  `json:"tahun_ajaran"`
	SaldoAwal   float64 `json:"saldo_awal"`
	IsAktif     bool    `json:"is_aktif"`
}

type ListPeriodeResponse struct {
	Periode []PeriodeEntry `json:"periode"`
}

//encore:api auth path=/periode method=GET
func ListPeriode(ctx context.Context) (*ListPeriodeResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT periode_id, tahun_ajaran, saldo_awal, is_aktif
		FROM periode ORDER BY tahun_ajaran DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []PeriodeEntry
	for rows.Next() {
		var e PeriodeEntry
		if err := rows.Scan(&e.PeriodeID, &e.TahunAjaran, &e.SaldoAwal, &e.IsAktif); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, e)
	}
	return &ListPeriodeResponse{Periode: list}, nil
}

// ============================================================
// Internal helpers (private, tidak di-expose sebagai HTTP)
// ============================================================

// buildUserDetail menggabungkan data user dari DB dengan UserData yang sudah diload.
func buildUserDetail(ctx context.Context, nis string, ud *UserData) (*UserDetail, error) {
	var d UserDetail
	var fotoURL sql.NullString

	err := db.QueryRow(ctx, `
		SELECT nis, nama, jurusan, tahun_masuk, foto_url FROM users WHERE nis = $1
	`, nis).Scan(&d.NIS, &d.Nama, &d.Jurusan, &d.TahunMasuk, &fotoURL)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "user tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	if fotoURL.Valid {
		d.FotoURL = &fotoURL.String
	}

	d.MembershipID     = ud.MembershipID
	d.RoleID           = ud.RoleID
	d.RoleName         = ud.RoleName
	d.GroupID          = ud.GroupID
	d.GroupName        = ud.GroupName
	d.Level            = ud.Level
	d.DivisionID       = ud.DivisionID
	d.ScopeDivisiAwal  = ud.ScopeDivisiAwal
	d.ScopeDivisiAkhir = ud.ScopeDivisiAkhir
	d.PeriodeID        = ud.PeriodeID
	d.TahunAjaran      = ud.TahunAjaran

	return &d, nil
}

// scanUserDetail dipakai oleh ListUsers untuk scan satu baris.
func scanUserDetail(rows interface {
	Scan(...interface{}) error
}) (*UserDetail, error) {
	var d UserDetail
	var fotoURL sql.NullString
	var divID, scopeAwal, scopeAkhir sql.NullInt32

	if err := rows.Scan(
		&d.NIS, &d.Nama, &d.Jurusan, &d.TahunMasuk, &fotoURL,
		&d.MembershipID, &d.RoleID, &d.RoleName, &d.GroupID, &d.GroupName,
		&d.Level, &divID, &scopeAwal, &scopeAkhir,
		&d.PeriodeID, &d.TahunAjaran,
	); err != nil {
		return nil, err
	}

	if fotoURL.Valid {
		d.FotoURL = &fotoURL.String
	}
	if divID.Valid {
		v := int(divID.Int32)
		d.DivisionID = &v
	}
	if scopeAwal.Valid {
		v := int(scopeAwal.Int32)
		d.ScopeDivisiAwal = &v
	}
	if scopeAkhir.Valid {
		v := int(scopeAkhir.Int32)
		d.ScopeDivisiAkhir = &v
	}
	return &d, nil
}

// UpdateUserDivision dipakai oleh service lain (private internal call).
// Tidak lagi dipakai — keanggotaan dikelola lewat AssignMembership.
// Dibiarkan sementara agar tidak break import dari service lain.
type UpdateDivisionParams struct {
	DivisionID *int `json:"division_id"`
}

//encore:api private path=/users/:nis/division method=PUT
func UpdateUserDivision(ctx context.Context, nis string, params *UpdateDivisionParams) error {
	// Update division_id di kepengurusan aktif user
	var divID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}
	_, err := db.Exec(ctx, `
		UPDATE kepengurusan SET division_id = $1
		WHERE nis = $2
		  AND status = 'Aktif'
		  AND periode_id = (SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1)
	`, divID, nis)
	return err
}
