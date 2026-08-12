package approval

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"

	"encore.app/proker"
	"encore.app/user"
)

var db = sqldb.Named("approval")

type SubmitProposalParams struct {
	ProkerID int `json:"proker_id"`
}

type SubmitResponse struct {
	Message string `json:"message"`
}

type ApprovalDetail struct {
	ID            int       `json:"id"`
	DocumentType  string    `json:"document_type"`
	DocumentID    int       `json:"document_id"`
	Step          int       `json:"step"`
	Status        string    `json:"status"`
	ApproverRole  string    `json:"approver_role"`
	ApprovedBy    *string   `json:"approved_by"`
	RevisionNotes *string   `json:"revision_notes"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ListPendingResponse struct {
	Approvals []ApprovalDetail `json:"approvals"`
}

type HistoryResponse struct {
	Approvals []ApprovalDetail `json:"approvals"`
}

type ActionParams struct {
	Status        string `json:"status"` // 'Approved', 'Rejected', 'Revision'
	RevisionNotes string `json:"revision_notes"`
}

//encore:api auth path=/approvals/submit-proposal method=POST
func SubmitProposal(ctx context.Context, params *SubmitProposalParams) (*SubmitResponse, error) {
	p, err := proker.Get(ctx, params.ProkerID)
	if err != nil {
		return nil, err
	}
	if p.Status != "Rencana" {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "proker is not in 'Rencana' (draft) status",
		}
	}

	_, err = db.Exec(ctx, `
		INSERT INTO approvals (document_type, document_id, step, status, approver_role)
		VALUES ('proposal', $1, 1, 'Pending', 'Bendahara')
	`, params.ProkerID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	_, err = db.Exec(ctx, `
		INSERT INTO approvals (document_type, document_id, step, status, approver_role)
		VALUES ('proposal', $1, 1, 'Pending', 'Pembina')
	`, params.ProkerID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	err = proker.UpdateStatus(ctx, params.ProkerID, &proker.UpdateStatusParams{Status: "Dinjau"})
	if err != nil {
		return nil, err
	}

	return &SubmitResponse{Message: "Proposal submitted for approval"}, nil
}

//encore:api auth path=/approvals/submit-lpj method=POST
func SubmitLPJ(ctx context.Context, params *SubmitProposalParams) (*SubmitResponse, error) {
	p, err := proker.Get(ctx, params.ProkerID)
	if err != nil {
		return nil, err
	}
	if p.Status != "Berjalan" {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "proker is not in 'Berjalan' (Running) status",
		}
	}

	_, err = db.Exec(ctx, `
		INSERT INTO approvals (document_type, document_id, step, status, approver_role)
		VALUES ('lpj', $1, 1, 'Pending', 'Sekretariat')
	`, params.ProkerID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	err = proker.UpdateStatus(ctx, params.ProkerID, &proker.UpdateStatusParams{Status: "Dinjau"})
	if err != nil {
		return nil, err
	}

	return &SubmitResponse{Message: "LPJ submitted for approval"}, nil
}

//encore:api auth path=/approvals/list-pending method=GET
func ListPending(ctx context.Context) (*ListPendingResponse, error) {
	userData := auth.Data().(*user.UserData)

	rows, err := db.Query(ctx, `
		SELECT id, document_type, document_id, step, status, approver_role, approved_by, revision_notes, created_at, updated_at
		FROM approvals
		WHERE status = 'Pending' AND approver_role = $1
		ORDER BY id ASC
	`, userData.Role)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	var approvals []ApprovalDetail
	for rows.Next() {
		var a ApprovalDetail
		var appBy, notes sql.NullString
		err := rows.Scan(&a.ID, &a.DocumentType, &a.DocumentID, &a.Step, &a.Status, &a.ApproverRole, &appBy, &notes, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: err.Error(),
			}
		}
		if appBy.Valid {
			a.ApprovedBy = &appBy.String
		}
		if notes.Valid {
			a.RevisionNotes = &notes.String
		}
		approvals = append(approvals, a)
	}

	return &ListPendingResponse{Approvals: approvals}, nil
}

//encore:api auth path=/approvals/history/:docType/:docID method=GET
func GetHistory(ctx context.Context, docType string, docID int) (*HistoryResponse, error) {
	rows, err := db.Query(ctx, `
		SELECT id, document_type, document_id, step, status, approver_role, approved_by, revision_notes, created_at, updated_at
		FROM approvals
		WHERE document_type = $1 AND document_id = $2
		ORDER BY step ASC, id ASC
	`, docType, docID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	var approvals []ApprovalDetail
	for rows.Next() {
		var a ApprovalDetail
		var appBy, notes sql.NullString
		err := rows.Scan(&a.ID, &a.DocumentType, &a.DocumentID, &a.Step, &a.Status, &a.ApproverRole, &appBy, &notes, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			return nil, &errs.Error{
				Code:    errs.Internal,
				Message: err.Error(),
			}
		}
		if appBy.Valid {
			a.ApprovedBy = &appBy.String
		}
		if notes.Valid {
			a.RevisionNotes = &notes.String
		}
		approvals = append(approvals, a)
	}

	return &HistoryResponse{Approvals: approvals}, nil
}

//encore:api auth path=/approvals/action/:id method=POST
func Action(ctx context.Context, id int, params *ActionParams) (*SubmitResponse, error) {
	nis, ok := auth.UserID()
	if !ok {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "not authenticated",
		}
	}

	userData := auth.Data().(*user.UserData)

	var a ApprovalDetail
	var appBy, notes sql.NullString
	err := db.QueryRow(ctx, `
		SELECT id, document_type, document_id, step, status, approver_role, approved_by, revision_notes
		FROM approvals WHERE id = $1
	`, id).Scan(&a.ID, &a.DocumentType, &a.DocumentID, &a.Step, &a.Status, &a.ApproverRole, &appBy, &notes)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &errs.Error{
				Code:    errs.NotFound,
				Message: "approval record not found",
			}
		}
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if a.Status != "Pending" {
		return nil, &errs.Error{
			Code:    errs.FailedPrecondition,
			Message: "this approval record has already been actioned",
		}
	}

	if userData.Role != a.ApproverRole {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "you do not have the required role to perform this action",
		}
	}

	_, err = db.Exec(ctx, `
		UPDATE approvals
		SET status = $1, approved_by = $2, revision_notes = $3, updated_at = NOW()
		WHERE id = $4
	`, params.Status, string(nis), params.RevisionNotes, id)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: err.Error(),
		}
	}

	if params.Status == "Approved" {
		if a.DocumentType == "proposal" {
			var pendingCount int
			err = db.QueryRow(ctx, `
				SELECT COUNT(*) FROM approvals
				WHERE document_type = 'proposal' AND document_id = $1 AND step = 1 AND status = 'Pending'
			`, a.DocumentID).Scan(&pendingCount)
			if err != nil {
				return nil, &errs.Error{
					Code:    errs.Internal,
					Message: err.Error(),
				}
			}

			if pendingCount == 0 {
				err = proker.UpdateStatus(ctx, a.DocumentID, &proker.UpdateStatusParams{Status: "Berjalan"})
				if err != nil {
					return nil, err
				}
			}
		} else if a.DocumentType == "lpj" {
			if a.Step == 1 {
				_, err = db.Exec(ctx, `
					INSERT INTO approvals (document_type, document_id, step, status, approver_role)
					VALUES ('lpj', $1, 2, 'Pending', 'Trimitra')
				`, a.DocumentID)
				if err != nil {
					return nil, &errs.Error{
						Code:    errs.Internal,
						Message: err.Error(),
					}
				}
			} else if a.Step == 2 {
				err = proker.UpdateStatus(ctx, a.DocumentID, &proker.UpdateStatusParams{Status: "Selesai"})
				if err != nil {
					return nil, err
				}
			}
		}
	} else {
		if a.DocumentType == "proposal" || a.DocumentType == "lpj" {
			err = proker.UpdateStatus(ctx, a.DocumentID, &proker.UpdateStatusParams{Status: "Rencana"})
			if err != nil {
				return nil, err
			}
		}
	}

	return &SubmitResponse{Message: "Approval action processed successfully"}, nil
}
