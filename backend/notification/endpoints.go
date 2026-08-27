package notification

import (
    "context"
    "database/sql"
    "errors"
    "time"

    "encore.dev/beta/auth"
    "encore.dev/beta/errs"
    "encore.dev/storage/sqldb"
)

var db = sqldb.NewDatabase("notification", sqldb.DatabaseConfig{Migrations: "./migrations"})

type Notification struct {
    ID int `json:"notifikasi_id"`
    Category string `json:"kategori"`
    Title string `json:"judul"`
    Message string `json:"pesan"`
    LinkRef string `json:"link_ref"`
    Status string `json:"status"`
    CreatedAt time.Time `json:"dibuat_at"`
}

type ListResponse struct { Notifications []Notification `json:"notifikasi"` }
type MessageResponse struct { Message string `json:"message"` }

//encore:api auth path=/notifications method=GET
func List(ctx context.Context) (*ListResponse, error) {
    nis, ok := auth.UserID()
    if !ok { return nil, &errs.Error{Code: errs.Unauthenticated, Message: "tidak terautentikasi"} }
    rows, err := db.Query(ctx, `SELECT notifikasi_id, kategori, judul, pesan, link_ref, status, dibuat_at FROM notifications WHERE nis = $1 ORDER BY dibuat_at DESC LIMIT 100`, string(nis))
    if err != nil { return nil, &errs.Error{Code: errs.Internal, Message: err.Error()} }
    defer rows.Close()
    result := make([]Notification, 0)
    for rows.Next() {
        var item Notification
        if err := rows.Scan(&item.ID, &item.Category, &item.Title, &item.Message, &item.LinkRef, &item.Status, &item.CreatedAt); err != nil { return nil, &errs.Error{Code: errs.Internal, Message: err.Error()} }
        result = append(result, item)
    }
    return &ListResponse{Notifications: result}, nil
}

//encore:api auth path=/notifications/:id/read method=POST
func MarkRead(ctx context.Context, id int) (*MessageResponse, error) {
    nis, ok := auth.UserID()
    if !ok { return nil, &errs.Error{Code: errs.Unauthenticated, Message: "tidak terautentikasi"} }
    result, err := db.Exec(ctx, `UPDATE notifications SET status = 'Dibaca' WHERE notifikasi_id = $1 AND nis = $2`, id, string(nis))
    if err != nil { return nil, &errs.Error{Code: errs.Internal, Message: err.Error()} }
    if result.RowsAffected() == 0 { return nil, &errs.Error{Code: errs.NotFound, Message: "notifikasi tidak ditemukan"} }
    return &MessageResponse{Message: "notifikasi ditandai sudah dibaca"}, nil
}

func Create(ctx context.Context, nis, category, title, message, link string) error {
    if nis == "" { return errors.New("penerima notifikasi wajib diisi") }
    _, err := db.Exec(ctx, `INSERT INTO notifications (nis, kategori, judul, pesan, link_ref) VALUES ($1, $2, $3, $4, $5)`, nis, category, title, message, link)
    return err
}

func Exists(ctx context.Context, id int) bool {
    var exists bool
    _ = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM notifications WHERE notifikasi_id = $1)`, id).Scan(&exists)
    return exists
}

var _ = sql.ErrNoRows
