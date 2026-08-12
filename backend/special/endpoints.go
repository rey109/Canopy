package special

import (
	"context"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/user"
)

var db = sqldb.Named("special")

type MessageResponse struct {
	Message string `json:"message"`
}

func checkPermission(userData *user.UserData, targetDivisionID int) error {
	if userData.Role == "Trimitra" || userData.Role == "Pembina" {
		return nil
	}
	if userData.Role == "Ketua Bidang" && userData.DivisionID != nil && *userData.DivisionID == targetDivisionID {
		return nil
	}
	return &errs.Error{
		Code:    errs.PermissionDenied,
		Message: "you do not have permission to manage this division's special module",
	}
}

// ==========================================
// 1. Keagamaan (Bidang 1)
// ==========================================

type B1Event struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
}

type CreateB1Params struct {
	Title       string    `json:"title"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
}

type B1EventsResponse struct {
	Events []B1Event `json:"events"`
}

//encore:api auth path=/special/b1 method=GET
func GetB1Events(ctx context.Context) (*B1EventsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, title, date, description FROM special_b1_events ORDER BY date ASC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var events []B1Event
	for rows.Next() {
		var e B1Event
		if err := rows.Scan(&e.ID, &e.Title, &e.Date, &e.Description); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		events = append(events, e)
	}
	return &B1EventsResponse{Events: events}, nil
}

//encore:api auth path=/special/b1 method=POST
func CreateB1Event(ctx context.Context, params *CreateB1Params) (*B1Event, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 1); err != nil {
		return nil, err
	}

	var e B1Event
	err := db.QueryRow(ctx, `
		INSERT INTO special_b1_events (title, date, description) VALUES ($1, $2, $3)
		RETURNING id, title, date, description
	`, params.Title, params.Date, params.Description).Scan(&e.ID, &e.Title, &e.Date, &e.Description)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &e, nil
}

// ==========================================
// 2. Budi Pekerti (Bidang 2)
// ==========================================

type B2Record struct {
	ID           int    `json:"id"`
	StudentName  string `json:"student_name"`
	StudentClass string `json:"student_class"`
	RecordType   string `json:"record_type"`
	Points       int    `json:"points"`
	Description  string `json:"description"`
}

type CreateB2Params struct {
	StudentName  string `json:"student_name"`
	StudentClass string `json:"student_class"`
	RecordType   string `json:"record_type"`
	Points       int    `json:"points"`
	Description  string `json:"description"`
}

type B2RecordsResponse struct {
	Records []B2Record `json:"records"`
}

//encore:api auth path=/special/b2 method=GET
func GetB2Records(ctx context.Context) (*B2RecordsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, student_name, student_class, record_type, points, description FROM special_b2_records ORDER BY id DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var records []B2Record
	for rows.Next() {
		var r B2Record
		if err := rows.Scan(&r.ID, &r.StudentName, &r.StudentClass, &r.RecordType, &r.Points, &r.Description); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		records = append(records, r)
	}
	return &B2RecordsResponse{Records: records}, nil
}

//encore:api auth path=/special/b2 method=POST
func CreateB2Record(ctx context.Context, params *CreateB2Params) (*B2Record, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 2); err != nil {
		return nil, err
	}

	var r B2Record
	err := db.QueryRow(ctx, `
		INSERT INTO special_b2_records (student_name, student_class, record_type, points, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, student_name, student_class, record_type, points, description
	`, params.StudentName, params.StudentClass, params.RecordType, params.Points, params.Description).
		Scan(&r.ID, &r.StudentName, &r.StudentClass, &r.RecordType, &r.Points, &r.Description)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &r, nil
}

// ==========================================
// 3. Bela Negara (Bidang 3)
// ==========================================

type B3Roster struct {
	ID          int       `json:"id"`
	Date        time.Time `json:"date"`
	LeaderName  string    `json:"leader_name"`
	MCName      string    `json:"mc_name"`
	FlagBearers string    `json:"flag_bearers"`
}

type CreateB3Params struct {
	Date        time.Time `json:"date"`
	LeaderName  string    `json:"leader_name"`
	MCName      string    `json:"mc_name"`
	FlagBearers string    `json:"flag_bearers"`
}

type B3RostersResponse struct {
	Rosters []B3Roster `json:"rosters"`
}

//encore:api auth path=/special/b3 method=GET
func GetB3Rosters(ctx context.Context) (*B3RostersResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, date, leader_name, mc_name, flag_bearers FROM special_b3_rosters ORDER BY date ASC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var rosters []B3Roster
	for rows.Next() {
		var r B3Roster
		if err := rows.Scan(&r.ID, &r.Date, &r.LeaderName, &r.MCName, &r.FlagBearers); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		rosters = append(rosters, r)
	}
	return &B3RostersResponse{Rosters: rosters}, nil
}

//encore:api auth path=/special/b3 method=POST
func CreateB3Roster(ctx context.Context, params *CreateB3Params) (*B3Roster, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 3); err != nil {
		return nil, err
	}

	var r B3Roster
	err := db.QueryRow(ctx, `
		INSERT INTO special_b3_rosters (date, leader_name, mc_name, flag_bearers)
		VALUES ($1, $2, $3, $4)
		RETURNING id, date, leader_name, mc_name, flag_bearers
	`, params.Date, params.LeaderName, params.MCName, params.FlagBearers).
		Scan(&r.ID, &r.Date, &r.LeaderName, &r.MCName, &r.FlagBearers)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &r, nil
}

// ==========================================
// 4. Prestasi & Seni (Bidang 4)
// ==========================================

type B4Competition struct {
	ID              int    `json:"id"`
	StudentName     string `json:"student_name"`
	CompetitionName string `json:"competition_name"`
	Achievement     string `json:"achievement"`
	Type            string `json:"type"`
}

type CreateB4Params struct {
	StudentName     string `json:"student_name"`
	CompetitionName string `json:"competition_name"`
	Achievement     string `json:"achievement"`
	Type            string `json:"type"`
}

type B4CompetitionsResponse struct {
	Competitions []B4Competition `json:"competitions"`
}

//encore:api auth path=/special/b4 method=GET
func GetB4Competitions(ctx context.Context) (*B4CompetitionsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, student_name, competition_name, achievement, type FROM special_b4_competitions ORDER BY id DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var competitions []B4Competition
	for rows.Next() {
		var c B4Competition
		if err := rows.Scan(&c.ID, &c.StudentName, &c.CompetitionName, &c.Achievement, &c.Type); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		competitions = append(competitions, c)
	}
	return &B4CompetitionsResponse{Competitions: competitions}, nil
}

//encore:api auth path=/special/b4 method=POST
func CreateB4Competition(ctx context.Context, params *CreateB4Params) (*B4Competition, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 4); err != nil {
		return nil, err
	}

	var c B4Competition
	err := db.QueryRow(ctx, `
		INSERT INTO special_b4_competitions (student_name, competition_name, achievement, type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, student_name, competition_name, achievement, type
	`, params.StudentName, params.CompetitionName, params.Achievement, params.Type).
		Scan(&c.ID, &c.StudentName, &c.CompetitionName, &c.Achievement, &c.Type)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &c, nil
}

// ==========================================
// 5. Demokrasi & Lingkungan (Bidang 5)
// ==========================================

type B5Survey struct {
	ID       int    `json:"id"`
	Topic    string `json:"topic"`
	YesVotes int    `json:"yes_votes"`
	NoVotes  int    `json:"no_votes"`
}

type CreateB5Params struct {
	Topic string `json:"topic"`
}

type VoteParams struct {
	Vote string `json:"vote"`
}

type B5SurveysResponse struct {
	Surveys []B5Survey `json:"surveys"`
}

//encore:api auth path=/special/b5 method=GET
func GetB5Surveys(ctx context.Context) (*B5SurveysResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, topic, yes_votes, no_votes FROM special_b5_surveys ORDER BY id DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var surveys []B5Survey
	for rows.Next() {
		var s B5Survey
		if err := rows.Scan(&s.ID, &s.Topic, &s.YesVotes, &s.NoVotes); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		surveys = append(surveys, s)
	}
	return &B5SurveysResponse{Surveys: surveys}, nil
}

//encore:api auth path=/special/b5 method=POST
func CreateB5Survey(ctx context.Context, params *CreateB5Params) (*B5Survey, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 5); err != nil {
		return nil, err
	}

	var s B5Survey
	err := db.QueryRow(ctx, `
		INSERT INTO special_b5_surveys (topic) VALUES ($1)
		RETURNING id, topic, yes_votes, no_votes
	`, params.Topic).Scan(&s.ID, &s.Topic, &s.YesVotes, &s.NoVotes)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &s, nil
}

//encore:api auth path=/special/b5/:id/vote method=POST
func VoteB5Survey(ctx context.Context, id int, params *VoteParams) (*MessageResponse, error) {
	var query string
	if params.Vote == "yes" {
		query = "UPDATE special_b5_surveys SET yes_votes = yes_votes + 1 WHERE id = $1"
	} else if params.Vote == "no" {
		query = "UPDATE special_b5_surveys SET no_votes = no_votes + 1 WHERE id = $1"
	} else {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: "vote must be 'yes' or 'no'"}
	}

	res, err := db.Exec(ctx, query, id)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if res.RowsAffected() == 0 {
		return nil, &errs.Error{Code: errs.NotFound, Message: "survey not found"}
	}
	return &MessageResponse{Message: "Vote recorded successfully"}, nil
}

// ==========================================
// 6. Kewirausahaan (Bidang 6)
// ==========================================

type B6Sale struct {
	ID       int     `json:"id"`
	ItemName string  `json:"item_name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
	Type     string  `json:"type"`
}

type CreateB6Params struct {
	ItemName string  `json:"item_name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
	Type     string  `json:"type"`
}

type B6SalesResponse struct {
	Sales []B6Sale `json:"sales"`
}

//encore:api auth path=/special/b6 method=GET
func GetB6Sales(ctx context.Context) (*B6SalesResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, item_name, quantity, price, type FROM special_b6_sales ORDER BY id DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var sales []B6Sale
	for rows.Next() {
		var s B6Sale
		if err := rows.Scan(&s.ID, &s.ItemName, &s.Quantity, &s.Price, &s.Type); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		sales = append(sales, s)
	}
	return &B6SalesResponse{Sales: sales}, nil
}

//encore:api auth path=/special/b6 method=POST
func CreateB6Sale(ctx context.Context, params *CreateB6Params) (*B6Sale, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 6); err != nil {
		return nil, err
	}

	var s B6Sale
	err := db.QueryRow(ctx, `
		INSERT INTO special_b6_sales (item_name, quantity, price, type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, item_name, quantity, price, type
	`, params.ItemName, params.Quantity, params.Price, params.Type).
		Scan(&s.ID, &s.ItemName, &s.Quantity, &s.Price, &s.Type)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &s, nil
}

// ==========================================
// 7. Kesehatan & UKS (Bidang 7)
// ==========================================

type B7Visit struct {
	ID          int       `json:"id"`
	StudentName string    `json:"student_name"`
	Complaint   string    `json:"complaint"`
	Treatment   string    `json:"treatment"`
	VisitDate   time.Time `json:"visit_date"`
}

type CreateB7Params struct {
	StudentName string `json:"student_name"`
	Complaint   string `json:"complaint"`
	Treatment   string `json:"treatment"`
}

type B7VisitsResponse struct {
	Visits []B7Visit `json:"visits"`
}

//encore:api auth path=/special/b7 method=GET
func GetB7Visits(ctx context.Context) (*B7VisitsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, student_name, complaint, treatment, visit_date FROM special_b7_clinic ORDER BY visit_date DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var visits []B7Visit
	for rows.Next() {
		var v B7Visit
		if err := rows.Scan(&v.ID, &v.StudentName, &v.Complaint, &v.Treatment, &v.VisitDate); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		visits = append(visits, v)
	}
	return &B7VisitsResponse{Visits: visits}, nil
}

//encore:api auth path=/special/b7 method=POST
func CreateB7Visit(ctx context.Context, params *CreateB7Params) (*B7Visit, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 7); err != nil {
		return nil, err
	}

	var v B7Visit
	err := db.QueryRow(ctx, `
		INSERT INTO special_b7_clinic (student_name, complaint, treatment)
		VALUES ($1, $2, $3)
		RETURNING id, student_name, complaint, treatment, visit_date
	`, params.StudentName, params.Complaint, params.Treatment).
		Scan(&v.ID, &v.StudentName, &v.Complaint, &v.Treatment, &v.VisitDate)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &v, nil
}

// ==========================================
// 8. Sastra & Budaya (Bidang 8)
// ==========================================

type B8Mading struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateB8Params struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Author  string `json:"author"`
}

type B8MadingResponse struct {
	Mading []B8Mading `json:"mading"`
}

//encore:api auth path=/special/b8 method=GET
func GetB8Mading(ctx context.Context) (*B8MadingResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, title, content, author, created_at FROM special_b8_mading ORDER BY created_at DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var mading []B8Mading
	for rows.Next() {
		var m B8Mading
		if err := rows.Scan(&m.ID, &m.Title, &m.Content, &m.Author, &m.CreatedAt); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		mading = append(mading, m)
	}
	return &B8MadingResponse{Mading: mading}, nil
}

//encore:api auth path=/special/b8 method=POST
func CreateB8Mading(ctx context.Context, params *CreateB8Params) (*B8Mading, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 8); err != nil {
		return nil, err
	}

	var m B8Mading
	err := db.QueryRow(ctx, `
		INSERT INTO special_b8_mading (title, content, author) VALUES ($1, $2, $3)
		RETURNING id, title, content, author, created_at
	`, params.Title, params.Content, params.Author).Scan(&m.ID, &m.Title, &m.Content, &m.Author, &m.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &m, nil
}

// ==========================================
// 9. Teknologi & Informasi (Bidang 9)
// ==========================================

type B9Link struct {
	ID       int    `json:"id"`
	Platform string `json:"platform"`
	Label    string `json:"label"`
	URL      string `json:"url"`
}

type CreateB9Params struct {
	Platform string `json:"platform"`
	Label    string `json:"label"`
	URL      string `json:"url"`
}

type B9LinksResponse struct {
	Links []B9Link `json:"links"`
}

//encore:api auth path=/special/b9 method=GET
func GetB9Links(ctx context.Context) (*B9LinksResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, platform, label, url FROM special_b9_links ORDER BY id ASC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var links []B9Link
	for rows.Next() {
		var l B9Link
		if err := rows.Scan(&l.ID, &l.Platform, &l.Label, &l.URL); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		links = append(links, l)
	}
	return &B9LinksResponse{Links: links}, nil
}

//encore:api auth path=/special/b9 method=POST
func CreateB9Link(ctx context.Context, params *CreateB9Params) (*B9Link, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 9); err != nil {
		return nil, err
	}

	var l B9Link
	err := db.QueryRow(ctx, `
		INSERT INTO special_b9_links (platform, label, url) VALUES ($1, $2, $3)
		RETURNING id, platform, label, url
	`, params.Platform, params.Label, params.URL).Scan(&l.ID, &l.Platform, &l.Label, &l.URL)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &l, nil
}

// ==========================================
// 10. Bahasa Asing (Bidang 10)
// ==========================================

type B10Word struct {
	ID       int    `json:"id"`
	Word     string `json:"word"`
	Language string `json:"language"`
	Meaning  string `json:"meaning"`
	Example  string `json:"example"`
}

type CreateB10Params struct {
	Word     string `json:"word"`
	Language string `json:"language"`
	Meaning  string `json:"meaning"`
	Example  string `json:"example"`
}

type B10WordsResponse struct {
	Words []B10Word `json:"words"`
}

//encore:api auth path=/special/b10 method=GET
func GetB10Words(ctx context.Context) (*B10WordsResponse, error) {
	rows, err := db.Query(ctx, "SELECT id, word, language, meaning, example FROM special_b10_words ORDER BY id DESC")
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var words []B10Word
	for rows.Next() {
		var w B10Word
		if err := rows.Scan(&w.ID, &w.Word, &w.Language, &w.Meaning, &w.Example); err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		words = append(words, w)
	}
	return &B10WordsResponse{Words: words}, nil
}

//encore:api auth path=/special/b10 method=POST
func CreateB10Word(ctx context.Context, params *CreateB10Params) (*B10Word, error) {
	userData := auth.Data().(*user.UserData)
	if err := checkPermission(userData, 10); err != nil {
		return nil, err
	}

	var w B10Word
	err := db.QueryRow(ctx, `
		INSERT INTO special_b10_words (word, language, meaning, example) VALUES ($1, $2, $3, $4)
		RETURNING id, word, language, meaning, example
	`, params.Word, params.Language, params.Meaning, params.Example).Scan(&w.ID, &w.Word, &w.Language, &w.Meaning, &w.Example)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &w, nil
}
