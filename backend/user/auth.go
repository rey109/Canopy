package user

import (
	"context"
	"database/sql"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"
	"github.com/golang-jwt/jwt/v5"
)

var db = sqldb.NewDatabase("user", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})
var jwtSecret = []byte("canopy-super-secret-key-12345") // For development

// UserData dibawa di setiap request yang sudah login.
// Diisi dari tabel KEPENGURUSAN + ROLES + ROLE_GROUPS periode aktif.
type UserData struct {
	// Identitas user
	NIS    string
	Nama   string

	// Keanggotaan aktif (dari KEPENGURUSAN + ROLES + ROLE_GROUPS)
	MembershipID int
	RoleID       int
	RoleName     string  // "Ketua OSIS", "Sekretaris Umum", dll
	GroupID      int
	GroupName    string  // "Trimitra", "Sekretaris", "Bendahara", dll
	Level        int     // 1 = tertinggi dalam group

	// Scope divisi (null = akses semua divisi)
	DivisionID       *int // divisi spesifik user ini (dari KEPENGURUSAN)
	ScopeDivisiAwal  *int // batas bawah akses data (dari ROLES)
	ScopeDivisiAkhir *int // batas atas akses data (dari ROLES)

	// Periode aktif
	PeriodeID   int
	TahunAjaran string
}

// HasScopeAll returns true jika user punya akses semua divisi (scope null).
func (u *UserData) HasScopeAll() bool {
	return u.ScopeDivisiAwal == nil && u.ScopeDivisiAkhir == nil
}

// InScope returns true jika divisionID ada di dalam scope user.
func (u *UserData) InScope(divisionID int) bool {
	if u.HasScopeAll() {
		return true
	}
	if u.ScopeDivisiAwal == nil || u.ScopeDivisiAkhir == nil {
		return false
	}
	return divisionID >= *u.ScopeDivisiAwal && divisionID <= *u.ScopeDivisiAkhir
}

//encore:authhandler
func AuthHandler(ctx context.Context, token string) (auth.UID, *UserData, error) {
	if token == "" {
		return "", nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "missing token",
		}
	}

	claims := &jwt.RegisteredClaims{}
	t, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !t.Valid {
		return "", nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token",
		}
	}

	nis := claims.Subject

	ud, err := loadUserData(ctx, nis)
	if err != nil {
		return "", nil, err
	}

	return auth.UID(nis), ud, nil
}

// loadUserData mengambil data keanggotaan aktif user dari DB.
// Query ini join KEPENGURUSAN → ROLES → ROLE_GROUPS → PERIODE (is_aktif=true).
func loadUserData(ctx context.Context, nis string) (*UserData, error) {
	var ud UserData
	ud.NIS = nis

	var divID, scopeAwal, scopeAkhir sql.NullInt32

	err := db.QueryRow(ctx, `
		SELECT
			u.nama,
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
		WHERE u.nis = $1
		  AND p.is_aktif = TRUE
		  AND k.status = 'Aktif'
		LIMIT 1
	`, nis).Scan(
		&ud.Nama,
		&ud.MembershipID,
		&ud.RoleID,
		&ud.RoleName,
		&ud.GroupID,
		&ud.GroupName,
		&ud.Level,
		&divID,
		&scopeAwal,
		&scopeAkhir,
		&ud.PeriodeID,
		&ud.TahunAjaran,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.Unauthenticated,
				Message: "user not found or has no active membership",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if divID.Valid {
		v := int(divID.Int32)
		ud.DivisionID = &v
	}
	if scopeAwal.Valid {
		v := int(scopeAwal.Int32)
		ud.ScopeDivisiAwal = &v
	}
	if scopeAkhir.Valid {
		v := int(scopeAkhir.Int32)
		ud.ScopeDivisiAkhir = &v
	}

	return &ud, nil
}
