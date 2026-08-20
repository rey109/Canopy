package division

import (
	"context"
	"database/sql"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.NewDatabase("division", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// Division
// ============================================================

type DivisionDetail struct {
	DivisionID   int    `json:"division_id"`
	DivisionName string `json:"division_name"`
	Deskripsi    string `json:"deskripsi"`
}

type ListDivisionsResponse struct {
	Divisions []DivisionDetail `json:"divisions"`
}

//encore:api auth path=/divisions method=GET
func ListDivisions(ctx context.Context) (*ListDivisionsResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT division_id, division_name, deskripsi
		FROM divisions ORDER BY division_id ASC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []DivisionDetail
	for rows.Next() {
		var d DivisionDetail
		if err := rows.Scan(&d.DivisionID, &d.DivisionName, &d.Deskripsi); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, d)
	}
	return &ListDivisionsResponse{Divisions: list}, nil
}

//encore:api auth path=/divisions/:id method=GET
func GetDivision(ctx context.Context, id int) (*DivisionDetail, error) {
	var d DivisionDetail
	err := db.QueryRow(ctx, `
		SELECT division_id, division_name, deskripsi FROM divisions WHERE division_id = $1
	`, id).Scan(&d.DivisionID, &d.DivisionName, &d.Deskripsi)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "divisi tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &d, nil
}

// ============================================================
// Modules — navigasi dinamis
// ============================================================

type ModuleEntry struct {
	ModuleID   int    `json:"module_id"`
	ModuleName string `json:"module_name"`
	IsCore     bool   `json:"is_core"`
}

type NavModulesResponse struct {
	CoreModules   []ModuleEntry `json:"core_modules"`
	RoleModules   []ModuleEntry `json:"role_modules"`
	DivisiModules []ModuleEntry `json:"divisi_modules"`
}

// GetNavModules mengembalikan modul navigasi yang relevan untuk user yang sedang login.
// Frontend menggunakan respons ini untuk membangun sidebar/bottom-nav dinamis.
//encore:api auth path=/nav/modules method=GET
func GetNavModules(ctx context.Context) (*NavModulesResponse, error) {
	ud := auth.Data().(*user.UserData)

	// 1. Core modules (tampil untuk semua role)
	coreRows, err := db.Query(ctx, `
		SELECT module_id, module_name, is_core FROM modules WHERE is_core = TRUE ORDER BY module_id
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer coreRows.Close()

	var core []ModuleEntry
	for coreRows.Next() {
		var m ModuleEntry
		if err := coreRows.Scan(&m.ModuleID, &m.ModuleName, &m.IsCore); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		core = append(core, m)
	}

	// 2. Role group modules (slot dinamis berdasarkan group_name user)
	roleRows, err := db.Query(ctx, `
		SELECT m.module_id, m.module_name, m.is_core
		FROM modules m
		JOIN role_group_modules rgm ON rgm.module_id = m.module_id
		WHERE rgm.group_name = $1
		ORDER BY m.module_id
	`, ud.GroupName)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer roleRows.Close()

	var roleModules []ModuleEntry
	for roleRows.Next() {
		var m ModuleEntry
		if err := roleRows.Scan(&m.ModuleID, &m.ModuleName, &m.IsCore); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		roleModules = append(roleModules, m)
	}

	// 3. Divisi-specific modules (jika user punya division_id)
	var divisiModules []ModuleEntry
	if ud.DivisionID != nil {
		divRows, err := db.Query(ctx, `
			SELECT m.module_id, m.module_name, m.is_core
			FROM modules m
			JOIN divisi_modules dm ON dm.module_id = m.module_id
			WHERE dm.division_id = $1
			ORDER BY m.module_id
		`, *ud.DivisionID)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		defer divRows.Close()

		for divRows.Next() {
			var m ModuleEntry
			if err := divRows.Scan(&m.ModuleID, &m.ModuleName, &m.IsCore); err != nil {
				return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
			}
			divisiModules = append(divisiModules, m)
		}
	}

	return &NavModulesResponse{
		CoreModules:   core,
		RoleModules:   roleModules,
		DivisiModules: divisiModules,
	}, nil
}

// ============================================================
// AssignDivisiModule — Trimitra menambah modul custom ke divisi
// ============================================================

type AssignDivisiModuleParams struct {
	DivisionID int `json:"division_id"`
	ModuleID   int `json:"module_id"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/divisions/module method=POST
func AssignDivisiModule(ctx context.Context, params *AssignDivisiModuleParams) (*MessageResponse, error) {
	ud := auth.Data().(*user.UserData)
	if ud.GroupName != "Trimitra" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Trimitra yang dapat menambah modul divisi",
		}
	}

	_, err := db.Exec(ctx, `
		INSERT INTO divisi_modules (division_id, module_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, params.DivisionID, params.ModuleID)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &MessageResponse{Message: "Modul berhasil ditambahkan ke divisi"}, nil
}

// ============================================================
// ListModules — daftar semua modul yang tersedia (untuk admin)
// ============================================================

type ListModulesResponse struct {
	Modules []ModuleEntry `json:"modules"`
}

//encore:api auth path=/modules method=GET
func ListModules(ctx context.Context) (*ListModulesResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT module_id, module_name, is_core FROM modules ORDER BY module_id
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []ModuleEntry
	for rows.Next() {
		var m ModuleEntry
		if err := rows.Scan(&m.ModuleID, &m.ModuleName, &m.IsCore); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, m)
	}
	return &ListModulesResponse{Modules: list}, nil
}
