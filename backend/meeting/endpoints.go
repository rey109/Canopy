package meeting

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

var db = sqldb.Named("meeting")

type MeetingDetail struct {
	ID         int       `json:"id"`
	Title      string    `json:"title"`
	Schedule   time.Time `json:"schedule"`
	DivisionID *int      `json:"division_id"`
	ProkerID   *int      `json:"proker_id"`
	Minutes    string    `json:"minutes"`
	QCStatus   string    `json:"qc_status"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

type CreateParams struct {
	Title      string    `json:"title"`
	Schedule   time.Time `json:"schedule"`
	DivisionID *int      `json:"division_id"`
	ProkerID   *int      `json:"proker_id"`
}

type ListResponse struct {
	Meetings []MeetingDetail `json:"meetings"`
}

type UpdateMinutesParams struct {
	Minutes string `json:"minutes"`
}

type AttendanceEntry struct {
	UserNIS string `json:"user_nis"`
	Status  string `json:"status"` // 'hadir', 'izin', 'alfa'
}

type RecordAttendanceParams struct {
	Entries []AttendanceEntry `json:"entries"`
}

type AttendanceDetail struct {
	ID        int    `json:"id"`
	MeetingID int    `json:"meeting_id"`
	UserNIS   string `json:"user_nis"`
	Status    string `json:"status"`
}

type AttendanceListResponse struct {
	Attendance []AttendanceDetail `json:"attendance"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

//encore:api auth path=/meeting method=POST
func Create(ctx context.Context, params *CreateParams) (*MeetingDetail, error) {
	nis, _ := auth.UserID()
	var divID, prokID sql.NullInt32
	if params.DivisionID != nil {
		divID.Valid = true
		divID.Int32 = int32(*params.DivisionID)
	}
	if params.ProkerID != nil {
		prokID.Valid = true
		prokID.Int32 = int32(*params.ProkerID)
	}

	var m MeetingDetail
	var dID, pID sql.NullInt32
	err := db.QueryRow(ctx, `
		INSERT INTO meetings (title, schedule, division_id, proker_id, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, title, schedule, division_id, proker_id, minutes, qc_status, created_by, created_at
	`, params.Title, params.Schedule, divID, prokID, string(nis)).
		Scan(&m.ID, &m.Title, &m.Schedule, &dID, &pID, &m.Minutes, &m.QCStatus, &m.CreatedBy, &m.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if dID.Valid {
		v := int(dID.Int32)
		m.DivisionID = &v
	}
	if pID.Valid {
		v := int(pID.Int32)
		m.ProkerID = &v
	}
	return &m, nil
}

//encore:api auth path=/meetings method=GET
func List(ctx context.Context) (*ListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, title, schedule, division_id, proker_id, minutes, qc_status, created_by, created_at
		FROM meetings ORDER BY schedule DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var meetings []MeetingDetail
	for rows.Next() {
		var m MeetingDetail
		var dID, pID sql.NullInt32
		err := rows.Scan(&m.ID, &m.Title, &m.Schedule, &dID, &pID, &m.Minutes, &m.QCStatus, &m.CreatedBy, &m.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if dID.Valid {
			v := int(dID.Int32)
			m.DivisionID = &v
		}
		if pID.Valid {
			v := int(pID.Int32)
			m.ProkerID = &v
		}
		meetings = append(meetings, m)
	}
	return &ListResponse{Meetings: meetings}, nil
}

//encore:api auth path=/meeting/:id method=GET
func Get(ctx context.Context, id int) (*MeetingDetail, error) {
	var m MeetingDetail
	var dID, pID sql.NullInt32
	err := db.QueryRow(ctx, `
		SELECT id, title, schedule, division_id, proker_id, minutes, qc_status, created_by, created_at
		FROM meetings WHERE id = $1
	`, id).Scan(&m.ID, &m.Title, &m.Schedule, &dID, &pID, &m.Minutes, &m.QCStatus, &m.CreatedBy, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "meeting not found"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if dID.Valid {
		v := int(dID.Int32)
		m.DivisionID = &v
	}
	if pID.Valid {
		v := int(pID.Int32)
		m.ProkerID = &v
	}
	return &m, nil
}

//encore:api auth path=/meeting/:id/minutes method=PUT
func UpdateMinutes(ctx context.Context, id int, params *UpdateMinutesParams) (*MessageResponse, error) {
	res, err := db.Exec(ctx, "UPDATE meetings SET minutes = $1 WHERE id = $2", params.Minutes, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	rows := res.RowsAffected()
	if rows == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "meeting not found"}
	}
	return &MessageResponse{Message: "Minutes updated"}, nil
}

//encore:api auth path=/meeting/:id/qc-approve method=POST
func QCApprove(ctx context.Context, id int) (*MessageResponse, error) {
	userData := auth.Data().(*user.UserData)
	if userData.Role != "Sekretariat" && userData.Role != "Trimitra" && userData.Role != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "only Sekretariat, Trimitra, or Pembina can QC approve minutes",
		}
	}
	res, err := db.Exec(ctx, "UPDATE meetings SET qc_status = 'Approved' WHERE id = $1 AND qc_status = 'Pending'", id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	rows := res.RowsAffected()
	if rows == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "meeting not found or already approved"}
	}
	return &MessageResponse{Message: "Minutes QC approved"}, nil
}

//encore:api auth path=/meeting/:id/attendance method=POST
func RecordAttendance(ctx context.Context, id int, params *RecordAttendanceParams) (*MessageResponse, error) {
	for _, e := range params.Entries {
		if e.Status != "hadir" && e.Status != "izin" && e.Status != "alfa" {
			return nil, &errs.Error{
				Code:    errs.InvalidArgument,
				Message: "status must be 'hadir', 'izin', or 'alfa' for " + e.UserNIS,
			}
		}
		_, err := db.Exec(ctx, `
			INSERT INTO attendance (meeting_id, user_nis, status)
			VALUES ($1, $2, $3)
			ON CONFLICT (meeting_id, user_nis) DO UPDATE SET status = $3
		`, id, e.UserNIS, e.Status)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
	}
	return &MessageResponse{Message: "Attendance recorded"}, nil
}

//encore:api auth path=/meeting/:id/attendance method=GET
func GetAttendance(ctx context.Context, id int) (*AttendanceListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, meeting_id, user_nis, status FROM attendance WHERE meeting_id = $1 ORDER BY id ASC
	`, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var attendance []AttendanceDetail
	for rows.Next() {
		var a AttendanceDetail
		err := rows.Scan(&a.ID, &a.MeetingID, &a.UserNIS, &a.Status)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		attendance = append(attendance, a)
	}
	return &AttendanceListResponse{Attendance: attendance}, nil
}
