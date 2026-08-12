package finance

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

var db = sqldb.Named("finance")

type TransactionDetail struct {
	ID          int       `json:"id"`
	Date        time.Time `json:"date"`
	Type        string    `json:"type"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	ProkerID    *int      `json:"proker_id"`
	ProofURL    *string   `json:"proof_url"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateParams struct {
	Date        time.Time `json:"date"`
	Type        string    `json:"type"` // 'debit' / 'credit'
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	ProkerID    *int      `json:"proker_id"`
	ProofURL    *string   `json:"proof_url"`
}

type ListResponse struct {
	Transactions []TransactionDetail `json:"transactions"`
	TotalDebit   float64             `json:"total_debit"`
	TotalCredit  float64             `json:"total_credit"`
	Balance      float64             `json:"balance"`
}

type BalanceResponse struct {
	TotalDebit  float64 `json:"total_debit"`
	TotalCredit float64 `json:"total_credit"`
	Balance     float64 `json:"balance"`
}

//encore:api auth path=/finance/transaction method=POST
func CreateTransaction(ctx context.Context, params *CreateParams) (*TransactionDetail, error) {
	userData := auth.Data().(*user.UserData)
	if userData.Role != "Bendahara" && userData.Role != "Trimitra" && userData.Role != "Pembina" {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "only Bendahara, Trimitra, or Pembina can create transactions",
		}
	}

	if params.Type != "debit" && params.Type != "credit" {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "type must be 'debit' or 'credit'",
		}
	}

	nis, _ := auth.UserID()

	var prokerID sql.NullInt32
	if params.ProkerID != nil {
		prokerID.Valid = true
		prokerID.Int32 = int32(*params.ProkerID)
	}

	var proofURL sql.NullString
	if params.ProofURL != nil {
		proofURL.Valid = true
		proofURL.String = *params.ProofURL
	}

	var t TransactionDetail
	err := db.QueryRow(ctx, `
		INSERT INTO transactions (date, type, amount, description, proker_id, proof_url, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, date, type, amount, description, proker_id, proof_url, created_by, created_at
	`, params.Date, params.Type, params.Amount, params.Description, prokerID, proofURL, string(nis)).
		Scan(&t.ID, &t.Date, &t.Type, &t.Amount, &t.Description, &prokerID, &proofURL, &t.CreatedBy, &t.CreatedAt)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if prokerID.Valid {
		v := int(prokerID.Int32)
		t.ProkerID = &v
	}
	if proofURL.Valid {
		t.ProofURL = &proofURL.String
	}
	return &t, nil
}

//encore:api auth path=/finance/transactions method=GET
func ListTransactions(ctx context.Context) (*ListResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, date, type, amount, description, proker_id, proof_url, created_by, created_at
		FROM transactions ORDER BY date DESC
	`)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	defer rows.Close()

	var txns []TransactionDetail
	var totalDebit, totalCredit float64
	for rows.Next() {
		var t TransactionDetail
		var prokerID sql.NullInt32
		var proofURL sql.NullString
		err := rows.Scan(&t.ID, &t.Date, &t.Type, &t.Amount, &t.Description, &prokerID, &proofURL, &t.CreatedBy, &t.CreatedAt)
		if err != nil {
			return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
		}
		if prokerID.Valid {
			v := int(prokerID.Int32)
			t.ProkerID = &v
		}
		if proofURL.Valid {
			t.ProofURL = &proofURL.String
		}
		if t.Type == "debit" {
			totalDebit += t.Amount
		} else {
			totalCredit += t.Amount
		}
		txns = append(txns, t)
	}

	return &ListResponse{
		Transactions: txns,
		TotalDebit:   totalDebit,
		TotalCredit:  totalCredit,
		Balance:      totalCredit - totalDebit,
	}, nil
}

//encore:api auth path=/finance/transaction/:id method=GET
func GetTransaction(ctx context.Context, id int) (*TransactionDetail, error) {
	var t TransactionDetail
	var prokerID sql.NullInt32
	var proofURL sql.NullString
	err := db.QueryRow(ctx, `
		SELECT id, date, type, amount, description, proker_id, proof_url, created_by, created_at
		FROM transactions WHERE id = $1
	`, id).Scan(&t.ID, &t.Date, &t.Type, &t.Amount, &t.Description, &prokerID, &proofURL, &t.CreatedBy, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{Code: errs.NotFound, Message: "transaction not found"}
		}
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	if prokerID.Valid {
		v := int(prokerID.Int32)
		t.ProkerID = &v
	}
	if proofURL.Valid {
		t.ProofURL = &proofURL.String
	}
	return &t, nil
}

//encore:api auth path=/finance/balance method=GET
func GetBalance(ctx context.Context) (*BalanceResponse, error) {
	var totalDebit, totalCredit sql.NullFloat64
	err := db.QueryRow(ctx, "SELECT COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0), COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) FROM transactions").
		Scan(&totalDebit, &totalCredit)
	if err != nil {
		return nil, &errs.Error{Code: errs.Internal, Message: err.Error()}
	}
	return &BalanceResponse{
		TotalDebit:  totalDebit.Float64,
		TotalCredit: totalCredit.Float64,
		Balance:     totalCredit.Float64 - totalDebit.Float64,
	}, nil
}
