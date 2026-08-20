package proker

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

var db = sqldb.NewDatabase("proker", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

// ============================================================
// PROGRAM KERJA
// ============================================================

type ProkerDetail struct {
	ProkerID           int        `json:"proker_id"`
	DivisionID         *int       `json:"division_id"`
	PeriodeID          int        `json:"periode_id"`
	Nama               string     `json:"nama"`
	Deskripsi          string     `json:"deskripsi"`
	AnggaranDisetujui  float64    `json:"anggaran_disetujui"`
	Status             string     `json:"status"`
	PenanggungJawab    *string    `json:"penanggung_jawab"`
	TanggalMulai       time.Time  `json:"tanggal_mulai"`
	TanggalSelesai     time.Time  `json:"tanggal_selesai"`
	DibuatOleh         string     `json:"dibuat_oleh"`
	CreatedAt          time.Time  `json:"created_at"`
}

type CreateProkerParams struct {
	DivisionID        *int      `json:"division_id"`
	Nama              string    `json:"nama"`
	Deskripsi         string    `json:"deskripsi"`
	AnggaranDisetujui float64   `json:"anggaran_disetujui"`
	PenanggungJawab   *string   `json:"penanggung_jawab"`
	TanggalMulai      time.Time `json:"tanggal_mulai"`
	TanggalSelesai    time.Time `json:"tanggal_selesai"`
}

type ListProkerResponse struct {
	Prokers []ProkerDetail `json:"prokers"`
}

//encore:api auth path=/proker method=POST
func CreateProker(ctx context.Context, params *CreateProkerParams) (*ProkerDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	// Staf dan Pembina tidak boleh membuat proker
	if ud.GroupName == "Staf" || ud.GroupName == "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Kepala Divisi, Trimitra, Sekretaris, atau Bendahara yang dapat membuat proker",
		}
	}

	// Kepala Divisi hanya boleh membuat proker untuk divisinya sendiri
	if ud.GroupName == "Kepala Divisi" {
		if params.DivisionID == nil || ud.DivisionID == nil || *params.DivisionID != *ud.DivisionID {
			return nil, &errs.Error{
				Code:    errs.PermissionDenied,
				Message: "Kepala Divisi hanya dapat membuat proker untuk divisinya sendiri",
			}
		}
	}

	var divID, pj sql.NullInt32
	var pjStr sql.NullString
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}
	if params.PenanggungJawab != nil {
		pjStr.Valid = true
		pjStr.String = *params.PenanggungJawab
	}
	_ = pj

	var p ProkerDetail
	var retDivID sql.NullInt32
	var retPJ sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO program_kerja
			(division_id, periode_id, nama, deskripsi, anggaran_disetujui,
			 status, penanggung_jawab, tanggal_mulai, tanggal_selesai, dibuat_oleh)
		VALUES
			($1,
			 (SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1),
			 $2, $3, $4, 'Belum Mulai', $5, $6, $7, $8)
		RETURNING proker_id, division_id, periode_id, nama, deskripsi,
		          anggaran_disetujui, status, penanggung_jawab,
		          tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
	`, divID, params.Nama, params.Deskripsi, params.AnggaranDisetujui,
		pjStr, params.TanggalMulai, params.TanggalSelesai, string(nis)).
		Scan(
			&p.ProkerID, &retDivID, &p.PeriodeID, &p.Nama, &p.Deskripsi,
			&p.AnggaranDisetujui, &p.Status, &retPJ,
			&p.TanggalMulai, &p.TanggalSelesai, &p.DibuatOleh, &p.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		p.DivisionID = &v
	}
	if retPJ.Valid {
		p.PenanggungJawab = &retPJ.String
	}
	return &p, nil
}

//encore:api auth path=/proker/:id method=GET
func GetProker(ctx context.Context, id int) (*ProkerDetail, error) {
	var p ProkerDetail
	var retDivID sql.NullInt32
	var retPJ sql.NullString
	err := db.QueryRow(ctx, `
		SELECT proker_id, division_id, periode_id, nama, deskripsi,
		       anggaran_disetujui, status, penanggung_jawab,
		       tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
		FROM program_kerja WHERE proker_id = $1
	`, id).Scan(
		&p.ProkerID, &retDivID, &p.PeriodeID, &p.Nama, &p.Deskripsi,
		&p.AnggaranDisetujui, &p.Status, &retPJ,
		&p.TanggalMulai, &p.TanggalSelesai, &p.DibuatOleh, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "proker tidak ditemukan"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retDivID.Valid {
		v := int(retDivID.Int32)
		p.DivisionID = &v
	}
	if retPJ.Valid {
		p.PenanggungJawab = &retPJ.String
	}
	return &p, nil
}

//encore:api auth path=/prokers method=GET
func ListProkers(ctx context.Context) (*ListProkerResponse, error) {
	ud := auth.Data().(*user.UserData)
	nisStr, _ := auth.UserID()

	// Filter berdasarkan role sesuai spec 04-referensi-ui.md
	var rows *sqldb.Rows
	var err error

	switch ud.GroupName {
	case "Staf":
		// Hanya proker yang punya task assigned ke user ini
		rows, err = db.Query(ctx, `
			SELECT DISTINCT pk.proker_id, pk.division_id, pk.periode_id, pk.nama, pk.deskripsi,
			       pk.anggaran_disetujui, pk.status, pk.penanggung_jawab,
			       pk.tanggal_mulai, pk.tanggal_selesai, pk.dibuat_oleh, pk.created_at
			FROM program_kerja pk
			JOIN tasks t ON t.proker_id = pk.proker_id
			WHERE t.assigned_to = $1
			ORDER BY pk.created_at DESC
		`, string(nisStr))
	case "Kepala Divisi":
		// Semua proker divisinya
		rows, err = db.Query(ctx, `
			SELECT proker_id, division_id, periode_id, nama, deskripsi,
			       anggaran_disetujui, status, penanggung_jawab,
			       tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
			FROM program_kerja WHERE division_id = $1
			ORDER BY created_at DESC
		`, ud.DivisionID)
	case "Trimitra":
		if ud.HasScopeAll() {
			// Ketua — semua proker
			rows, err = db.Query(ctx, `
				SELECT proker_id, division_id, periode_id, nama, deskripsi,
				       anggaran_disetujui, status, penanggung_jawab,
				       tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
				FROM program_kerja ORDER BY created_at DESC
			`)
		} else {
			// Wakil Ketua — proker dalam scope divisinya
			rows, err = db.Query(ctx, `
				SELECT proker_id, division_id, periode_id, nama, deskripsi,
				       anggaran_disetujui, status, penanggung_jawab,
				       tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
				FROM program_kerja
				WHERE division_id IS NULL
				   OR division_id BETWEEN $1 AND $2
				ORDER BY created_at DESC
			`, ud.ScopeDivisiAwal, ud.ScopeDivisiAkhir)
		}
	default:
		// Pembina, Sekretaris, Bendahara — semua proker
		rows, err = db.Query(ctx, `
			SELECT proker_id, division_id, periode_id, nama, deskripsi,
			       anggaran_disetujui, status, penanggung_jawab,
			       tanggal_mulai, tanggal_selesai, dibuat_oleh, created_at
			FROM program_kerja ORDER BY created_at DESC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []ProkerDetail
	for rows.Next() {
		var p ProkerDetail
		var retDivID sql.NullInt32
		var retPJ sql.NullString
		if err := rows.Scan(
			&p.ProkerID, &retDivID, &p.PeriodeID, &p.Nama, &p.Deskripsi,
			&p.AnggaranDisetujui, &p.Status, &retPJ,
			&p.TanggalMulai, &p.TanggalSelesai, &p.DibuatOleh, &p.CreatedAt,
		); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if retDivID.Valid {
			v := int(retDivID.Int32)
			p.DivisionID = &v
		}
		if retPJ.Valid {
			p.PenanggungJawab = &retPJ.String
		}
		list = append(list, p)
	}
	return &ListProkerResponse{Prokers: list}, nil
}

type UpdateProkerStatusParams struct {
	Status string `json:"status"`
}

//encore:api private path=/proker/:id/status method=PUT
func UpdateProkerStatus(ctx context.Context, id int, params *UpdateProkerStatusParams) error {
	valid := map[string]bool{
		"Belum Mulai": true, "Berjalan": true, "Selesai": true, "Dibatalkan": true,
	}
	if !valid[params.Status] {
		return &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "status tidak valid: harus salah satu dari Belum Mulai, Berjalan, Selesai, Dibatalkan",
		}
	}
	res, err := db.Exec(ctx, "UPDATE program_kerja SET status = $1 WHERE proker_id = $2", params.Status, id)
	if err != nil {
		return &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return &errs.Error{Code: errs.NotFound, Message: "proker tidak ditemukan"}
	}
	return nil
}

// Get is a private alias dipakai oleh service approval
//encore:api private path=/proker-private/:id method=GET
func Get(ctx context.Context, id int) (*ProkerDetail, error) {
	return GetProker(ctx, id)
}

// UpdateStatus is a private alias dipakai oleh service approval
//encore:api private path=/proker-private/:id/update-status method=PUT
func UpdateStatus(ctx context.Context, id int, params *UpdateProkerStatusParams) error {
	return UpdateProkerStatus(ctx, id, params)
}

// ============================================================
// TASK TEMPLATE
// ============================================================

type TemplateField struct {
	FieldID       int     `json:"field_id"`
	TemplateID    int     `json:"template_id"`
	Label         string  `json:"label"`
	TipeInput     string  `json:"tipe_input"`
	OpsiDropdown  *string `json:"opsi_dropdown"`
	Wajib         bool    `json:"wajib"`
	Urutan        int     `json:"urutan"`
}

type TaskTemplateDetail struct {
	TemplateID   int             `json:"template_id"`
	DivisionID   int             `json:"division_id"`
	NamaTemplate string          `json:"nama_template"`
	DibuatOleh   string          `json:"dibuat_oleh"`
	CreatedAt    time.Time       `json:"created_at"`
	Fields       []TemplateField `json:"fields"`
}

type CreateTemplateParams struct {
	NamaTemplate string          `json:"nama_template"`
	Fields       []CreateFieldParams `json:"fields"`
}

type CreateFieldParams struct {
	Label        string  `json:"label"`
	TipeInput    string  `json:"tipe_input"`
	OpsiDropdown *string `json:"opsi_dropdown"`
	Wajib        bool    `json:"wajib"`
	Urutan       int     `json:"urutan"`
}

type ListTemplatesResponse struct {
	Templates []TaskTemplateDetail `json:"templates"`
}

//encore:api auth path=/task-template method=POST
func CreateTaskTemplate(ctx context.Context, params *CreateTemplateParams) (*TaskTemplateDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName != "Kepala Divisi" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Kepala Divisi yang dapat membuat task template",
		}
	}
	if ud.DivisionID == nil {
		return nil, &errs.Error{Code: errs.Internal, Message: "user tidak memiliki division_id"}
	}

	var tpl TaskTemplateDetail
	err := db.QueryRow(ctx, `
		INSERT INTO task_template (division_id, nama_template, dibuat_oleh)
		VALUES ($1, $2, $3)
		RETURNING template_id, division_id, nama_template, dibuat_oleh, created_at
	`, *ud.DivisionID, params.NamaTemplate, string(nis)).
		Scan(&tpl.TemplateID, &tpl.DivisionID, &tpl.NamaTemplate, &tpl.DibuatOleh, &tpl.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}

	for _, f := range params.Fields {
		var opsi sql.NullString
		if f.OpsiDropdown != nil {
			opsi.Valid = true
			opsi.String = *f.OpsiDropdown
		}
		var field TemplateField
		var retOpsi sql.NullString
		err := db.QueryRow(ctx, `
			INSERT INTO template_field (template_id, label, tipe_input, opsi_dropdown, wajib, urutan)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING field_id, template_id, label, tipe_input, opsi_dropdown, wajib, urutan
		`, tpl.TemplateID, f.Label, f.TipeInput, opsi, f.Wajib, f.Urutan).
			Scan(&field.FieldID, &field.TemplateID, &field.Label, &field.TipeInput, &retOpsi, &field.Wajib, &field.Urutan)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if retOpsi.Valid {
			field.OpsiDropdown = &retOpsi.String
		}
		tpl.Fields = append(tpl.Fields, field)
	}
	return &tpl, nil
}

//encore:api auth path=/task-templates method=GET
func ListTaskTemplates(ctx context.Context) (*ListTemplatesResponse, error) {
	ud := auth.Data().(*user.UserData)

	var rows *sqldb.Rows
	var err error
	if ud.GroupName == "Kepala Divisi" && ud.DivisionID != nil {
		rows, err = db.Query(ctx, `
			SELECT template_id, division_id, nama_template, dibuat_oleh, created_at
			FROM task_template WHERE division_id = $1 ORDER BY created_at DESC
		`, *ud.DivisionID)
	} else {
		rows, err = db.Query(ctx, `
			SELECT template_id, division_id, nama_template, dibuat_oleh, created_at
			FROM task_template ORDER BY created_at DESC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var templates []TaskTemplateDetail
	for rows.Next() {
		var tpl TaskTemplateDetail
		if err := rows.Scan(&tpl.TemplateID, &tpl.DivisionID, &tpl.NamaTemplate, &tpl.DibuatOleh, &tpl.CreatedAt); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		// Load fields
		fieldRows, err := db.Query(ctx, `
			SELECT field_id, template_id, label, tipe_input, opsi_dropdown, wajib, urutan
			FROM template_field WHERE template_id = $1 ORDER BY urutan
		`, tpl.TemplateID)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		for fieldRows.Next() {
			var f TemplateField
			var opsi sql.NullString
			if err := fieldRows.Scan(&f.FieldID, &f.TemplateID, &f.Label, &f.TipeInput, &opsi, &f.Wajib, &f.Urutan); err != nil {
				fieldRows.Close()
				return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
			}
			if opsi.Valid {
				f.OpsiDropdown = &opsi.String
			}
			tpl.Fields = append(tpl.Fields, f)
		}
		fieldRows.Close()
		templates = append(templates, tpl)
	}
	return &ListTemplatesResponse{Templates: templates}, nil
}

// ============================================================
// TASKS
// ============================================================

type TaskDetail struct {
	TaskID           int        `json:"task_id"`
	ProkerID         int        `json:"proker_id"`
	TemplateID       *int       `json:"template_id"`
	Scope            string     `json:"scope"`
	AssignedTo       *string    `json:"assigned_to"`
	OfferedBy        *string    `json:"offered_by"`
	DibuatOleh       string     `json:"dibuat_oleh"`
	Judul            string     `json:"judul"`
	Deskripsi        string     `json:"deskripsi"`
	Deadline         time.Time  `json:"deadline"`
	Status           string     `json:"status"`
	CustomData       *string    `json:"custom_data"` // JSON string
	EskalasiTerkirim bool       `json:"eskalasi_terkirim"`
	CreatedAt        time.Time  `json:"created_at"`
}

type CreateTaskParams struct {
	ProkerID   int       `json:"proker_id"`
	TemplateID *int      `json:"template_id"`
	Scope      string    `json:"scope"`
	AssignedTo *string   `json:"assigned_to"`
	Judul      string    `json:"judul"`
	Deskripsi  string    `json:"deskripsi"`
	Deadline   time.Time `json:"deadline"`
	CustomData *string   `json:"custom_data"`
}

type ListTasksResponse struct {
	Tasks []TaskDetail `json:"tasks"`
}

//encore:api auth path=/task method=POST
func CreateTask(ctx context.Context, params *CreateTaskParams) (*TaskDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName == "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "Pembina tidak dapat membuat task",
		}
	}

	validScope := map[string]bool{"Individual": true, "General": true}
	if !validScope[params.Scope] {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "scope harus 'Individual' atau 'General'"}
	}

	var templateID, assignedTo sql.NullInt32
	var assignedToStr, customData sql.NullString
	if params.TemplateID != nil {
		templateID.Valid = true
		templateID.Int32 = int32(*params.TemplateID)
	}
	if params.AssignedTo != nil {
		assignedToStr.Valid = true
		assignedToStr.String = *params.AssignedTo
	}
	if params.CustomData != nil {
		customData.Valid = true
		customData.String = *params.CustomData
	}
	_ = assignedTo

	initialStatus := "Tersedia"
	if params.Scope == "Individual" && params.AssignedTo != nil {
		initialStatus = "Ditugaskan"
	}

	var t TaskDetail
	var retTemplID, retAssign sql.NullInt32
	var retAssignStr, retOffered, retCustom sql.NullString
	err := db.QueryRow(ctx, `
		INSERT INTO tasks
			(proker_id, template_id, scope, assigned_to, dibuat_oleh,
			 judul, deskripsi, deadline, status, custom_data)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING task_id, proker_id, template_id, scope, assigned_to, offered_by,
		          dibuat_oleh, judul, deskripsi, deadline, status, custom_data,
		          eskalasi_terkirim, created_at
	`, params.ProkerID, templateID, params.Scope, assignedToStr, string(nis),
		params.Judul, params.Deskripsi, params.Deadline, initialStatus, customData).
		Scan(
			&t.TaskID, &t.ProkerID, &retTemplID, &t.Scope,
			&retAssignStr, &retOffered, &t.DibuatOleh,
			&t.Judul, &t.Deskripsi, &t.Deadline, &t.Status,
			&retCustom, &t.EskalasiTerkirim, &t.CreatedAt,
		)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	_ = retTemplID
	_ = retAssign
	if retAssignStr.Valid {
		t.AssignedTo = &retAssignStr.String
	}
	if retOffered.Valid {
		t.OfferedBy = &retOffered.String
	}
	if retCustom.Valid {
		t.CustomData = &retCustom.String
	}
	return &t, nil
}

//encore:api auth path=/tasks method=GET
func ListTasks(ctx context.Context) (*ListTasksResponse, error) {
	ud := auth.Data().(*user.UserData)
	nisStr, _ := auth.UserID()

	var rows *sqldb.Rows
	var err error

	switch ud.GroupName {
	case "Staf":
		// Task yang assigned ke diri sendiri + General tasks di divisinya
		rows, err = db.Query(ctx, `
			SELECT t.task_id, t.proker_id, t.template_id, t.scope, t.assigned_to,
			       t.offered_by, t.dibuat_oleh, t.judul, t.deskripsi, t.deadline,
			       t.status, t.custom_data, t.eskalasi_terkirim, t.created_at
			FROM tasks t
			JOIN program_kerja pk ON pk.proker_id = t.proker_id
			WHERE (t.assigned_to = $1 OR (t.scope = 'General' AND t.status = 'Tersedia'))
			  AND (pk.division_id = $2 OR pk.division_id IS NULL)
			ORDER BY t.deadline ASC
		`, string(nisStr), ud.DivisionID)
	case "Kepala Divisi":
		// Semua task dalam proker divisinya
		rows, err = db.Query(ctx, `
			SELECT t.task_id, t.proker_id, t.template_id, t.scope, t.assigned_to,
			       t.offered_by, t.dibuat_oleh, t.judul, t.deskripsi, t.deadline,
			       t.status, t.custom_data, t.eskalasi_terkirim, t.created_at
			FROM tasks t
			JOIN program_kerja pk ON pk.proker_id = t.proker_id
			WHERE pk.division_id = $1
			ORDER BY t.deadline ASC
		`, ud.DivisionID)
	default:
		// Trimitra, Sekretaris, Bendahara, Pembina — semua task
		rows, err = db.Query(ctx, `
			SELECT task_id, proker_id, template_id, scope, assigned_to,
			       offered_by, dibuat_oleh, judul, deskripsi, deadline,
			       status, custom_data, eskalasi_terkirim, created_at
			FROM tasks ORDER BY deadline ASC
		`)
	}
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var tasks []TaskDetail
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		tasks = append(tasks, *t)
	}
	return &ListTasksResponse{Tasks: tasks}, nil
}

// TawarkanTask — user yang memegang task menawarkan ke orang lain
//encore:api auth path=/task/:id/tawarkan method=POST
func TawarkanTask(ctx context.Context, id int) (*TaskDetail, error) {
	nis, _ := auth.UserID()

	var t TaskDetail
	var retAssign, retOffered sql.NullString
	err := db.QueryRow(ctx, `
		UPDATE tasks
		SET offered_by = $1, assigned_to = NULL, status = 'Ditawarkan'
		WHERE task_id = $2 AND assigned_to = $1 AND status = 'Ditugaskan'
		RETURNING task_id, proker_id, template_id, scope, assigned_to,
		          offered_by, dibuat_oleh, judul, deskripsi, deadline,
		          status, custom_data, eskalasi_terkirim, created_at
	`, string(nis), id).
		Scan(
			&t.TaskID, &t.ProkerID, new(sql.NullInt32), &t.Scope,
			&retAssign, &retOffered, &t.DibuatOleh,
			&t.Judul, &t.Deskripsi, &t.Deadline, &t.Status,
			new(sql.NullString), &t.EskalasiTerkirim, &t.CreatedAt,
		)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "task tidak dapat ditawarkan atau bukan milikmu"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retOffered.Valid {
		t.OfferedBy = &retOffered.String
	}
	return &t, nil
}

// AmbilTask — user mengambil task yang ditawarkan atau General
//encore:api auth path=/task/:id/ambil method=POST
func AmbilTask(ctx context.Context, id int) (*TaskDetail, error) {
	nis, _ := auth.UserID()

	var t TaskDetail
	var retAssign, retOffered sql.NullString
	err := db.QueryRow(ctx, `
		UPDATE tasks
		SET assigned_to = $1, status = 'Ditugaskan'
		WHERE task_id = $2 AND status IN ('Ditawarkan', 'Tersedia')
		RETURNING task_id, proker_id, template_id, scope, assigned_to,
		          offered_by, dibuat_oleh, judul, deskripsi, deadline,
		          status, custom_data, eskalasi_terkirim, created_at
	`, string(nis), id).
		Scan(
			&t.TaskID, &t.ProkerID, new(sql.NullInt32), &t.Scope,
			&retAssign, &retOffered, &t.DibuatOleh,
			&t.Judul, &t.Deskripsi, &t.Deadline, &t.Status,
			new(sql.NullString), &t.EskalasiTerkirim, &t.CreatedAt,
		)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "task tidak tersedia atau sudah diambil"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retAssign.Valid {
		t.AssignedTo = &retAssign.String
	}
	if retOffered.Valid {
		t.OfferedBy = &retOffered.String
	}
	return &t, nil
}

// SelesaikanTask — user menandai task sebagai selesai
//encore:api auth path=/task/:id/selesai method=POST
func SelesaikanTask(ctx context.Context, id int) (*TaskDetail, error) {
	nis, _ := auth.UserID()

	var t TaskDetail
	var retAssign, retOffered sql.NullString
	err := db.QueryRow(ctx, `
		UPDATE tasks
		SET status = 'Selesai'
		WHERE task_id = $1 AND assigned_to = $2 AND status = 'Ditugaskan'
		RETURNING task_id, proker_id, template_id, scope, assigned_to,
		          offered_by, dibuat_oleh, judul, deskripsi, deadline,
		          status, custom_data, eskalasi_terkirim, created_at
	`, id, string(nis)).
		Scan(
			&t.TaskID, &t.ProkerID, new(sql.NullInt32), &t.Scope,
			&retAssign, &retOffered, &t.DibuatOleh,
			&t.Judul, &t.Deskripsi, &t.Deadline, &t.Status,
			new(sql.NullString), &t.EskalasiTerkirim, &t.CreatedAt,
		)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.PermissionDenied, Message: "task tidak dapat diselesaikan atau bukan milikmu"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if retAssign.Valid {
		t.AssignedTo = &retAssign.String
	}
	return &t, nil
}

// ============================================================
// CATATAN PEMBINAAN
// ============================================================

type CatatanPembinaanDetail struct {
	CatatanID  int       `json:"catatan_id"`
	ProkerID   int       `json:"proker_id"`
	DibuatOleh string    `json:"dibuat_oleh"`
	Isi        string    `json:"isi"`
	Tanggal    time.Time `json:"tanggal"`
}

type CreateCatatanParams struct {
	ProkerID int    `json:"proker_id"`
	Isi      string `json:"isi"`
}

type ListCatatanResponse struct {
	Catatan []CatatanPembinaanDetail `json:"catatan"`
}

//encore:api auth path=/catatan-pembinaan method=POST
func CreateCatatanPembinaan(ctx context.Context, params *CreateCatatanParams) (*CatatanPembinaanDetail, error) {
	nis, _ := auth.UserID()
	ud := auth.Data().(*user.UserData)

	if ud.GroupName != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "hanya Pembina yang dapat membuat catatan pembinaan",
		}
	}

	var c CatatanPembinaanDetail
	err := db.QueryRow(ctx, `
		INSERT INTO catatan_pembinaan (proker_id, dibuat_oleh, isi)
		VALUES ($1, $2, $3)
		RETURNING catatan_id, proker_id, dibuat_oleh, isi, tanggal
	`, params.ProkerID, string(nis), params.Isi).
		Scan(&c.CatatanID, &c.ProkerID, &c.DibuatOleh, &c.Isi, &c.Tanggal)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &c, nil
}

//encore:api auth path=/catatan-pembinaan/:proker_id method=GET
func ListCatatanPembinaan(ctx context.Context, proker_id int) (*ListCatatanResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT catatan_id, proker_id, dibuat_oleh, isi, tanggal
		FROM catatan_pembinaan WHERE proker_id = $1 ORDER BY tanggal DESC
	`, proker_id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var list []CatatanPembinaanDetail
	for rows.Next() {
		var c CatatanPembinaanDetail
		if err := rows.Scan(&c.CatatanID, &c.ProkerID, &c.DibuatOleh, &c.Isi, &c.Tanggal); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		list = append(list, c)
	}
	return &ListCatatanResponse{Catatan: list}, nil
}

// ============================================================
// Helpers
// ============================================================

func scanTask(rows interface{ Scan(...interface{}) error }) (*TaskDetail, error) {
	var t TaskDetail
	var templateID sql.NullInt32
	var assignedTo, offeredBy, customData sql.NullString
	if err := rows.Scan(
		&t.TaskID, &t.ProkerID, &templateID, &t.Scope,
		&assignedTo, &offeredBy, &t.DibuatOleh,
		&t.Judul, &t.Deskripsi, &t.Deadline, &t.Status,
		&customData, &t.EskalasiTerkirim, &t.CreatedAt,
	); err != nil {
		return nil, err
	}
	if templateID.Valid {
		v := int(templateID.Int32)
		t.TemplateID = &v
	}
	if assignedTo.Valid {
		t.AssignedTo = &assignedTo.String
	}
	if offeredBy.Valid {
		t.OfferedBy = &offeredBy.String
	}
	if customData.Valid {
		t.CustomData = &customData.String
	}
	return &t, nil
}
