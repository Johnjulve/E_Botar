import React, { useEffect, useMemo, useState } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Modal } from '../../../components/common';
import { electionService, votingService } from '../../../services';
import '../admin.css';

const Icon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const STATUS_LABELS = {
  verified: 'Verified',
  missing_ballot: 'Missing Ballot',
  hash_mismatch: 'Hash Mismatch',
};

const MASKED_VALUE = '******';

const ReceiptAuditPage = () => {
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 1,
    totalCount: 0,
  });
  const [filters, setFilters] = useState({
    election_id: '',
    search: '',
    vote_status: '',
  });
  const [revealModal, setRevealModal] = useState({
    show: false,
    title: '',
    value: '',
  });
  const [revealingReceiptId, setRevealingReceiptId] = useState(null);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.election_id, filters.vote_status, pagination.page, pagination.pageSize]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters.election_id, filters.vote_status, pagination.pageSize]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await electionService.getAll();
      setElections(Array.isArray(res.data) ? res.data : []);
    } catch {
      setElections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.election_id) params.election_id = filters.election_id;
      if (filters.vote_status) params.vote_status = filters.vote_status;
      if (filters.search.trim()) params.search = filters.search.trim();
      params.page = pagination.page;
      params.page_size = pagination.pageSize;

      const res = await votingService.getReceiptAudit(params);
      setRows(Array.isArray(res.data?.results) ? res.data.results : []);
      setPagination((prev) => ({
        ...prev,
        totalCount: Number(res.data?.count) || 0,
        totalPages: Math.max(1, Number(res.data?.total_pages) || 1),
      }));
    } catch {
      setRows([]);
      setPagination((prev) => ({
        ...prev,
        totalCount: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  const pageStart = useMemo(() => {
    if (pagination.totalCount === 0) return 0;
    return (pagination.page - 1) * pagination.pageSize + 1;
  }, [pagination.totalCount, pagination.page, pagination.pageSize]);

  const pageEnd = useMemo(() => {
    if (pagination.totalCount === 0) return 0;
    return Math.min(pagination.page * pagination.pageSize, pagination.totalCount);
  }, [pagination.totalCount, pagination.page, pagination.pageSize]);

  const openRevealModal = (title, value) => {
    setRevealModal({
      show: true,
      title,
      value: value || 'N/A',
    });
  };

  const openReceiptModal = async (row) => {
    try {
      setRevealingReceiptId(row.id);
      const response = await votingService.revealReceiptCode(row.id);
      openRevealModal('Receipt Code', response.data?.receipt_code || 'N/A');
    } catch {
      // Fallback for environments without updated backend endpoint
      openRevealModal('Receipt Code', row.full_receipt_code || row.masked_receipt_code || 'N/A');
    } finally {
      setRevealingReceiptId(null);
    }
  };

  return (
    <Container>
      <div className="admin-header">
        <h1>
          <Icon size={28} />
          Receipt Audit
        </h1>
        <p>Read-only receipt audit trail for staff/admin confirmation and dispute handling.</p>
      </div>

      <div className="admin-form-section" style={{ marginBottom: '1rem' }}>
        <h5 className="admin-section-header">Filters</h5>
        <div className="admin-form-grid">
          <div>
            <label className="admin-form-label">Election</label>
            <select
              className="admin-form-input"
              value={filters.election_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, election_id: e.target.value }))}
            >
              <option value="">All elections</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-form-label">Vote status</label>
            <select
              className="admin-form-input"
              value={filters.vote_status}
              onChange={(e) => setFilters((prev) => ({ ...prev, vote_status: e.target.value }))}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="missing_ballot">Missing Ballot</option>
              <option value="hash_mismatch">Hash Mismatch</option>
            </select>
          </div>
          <div>
            <label className="admin-form-label">Search</label>
            <div className="d-flex gap-2 align-items-center">
              <input
                className="admin-form-input"
                placeholder="Name, username, student ID, receipt, hash..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
              <button className="admin-btn secondary" type="button" onClick={fetchRows}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading receipt audit data..." />
      ) : rows.length > 0 ? (
        <div className="admin-table-container">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Election</th>
                  <th>Receipt</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Block Hash</th>
                  <th>Previous Hash</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-list-item-title">{row.user_full_name || row.user_username || '—'}</div>
                      <div className="admin-user-id">{row.student_id || row.user_username || '—'}</div>
                    </td>
                    <td>{row.election_title || '—'}</td>
                    <td>
                      {row.masked_receipt_code ? (
                        <div className="d-flex gap-2 align-items-center">
                          <code>{MASKED_VALUE}</code>
                          <button
                            type="button"
                            className="admin-btn admin-btn-small secondary"
                            onClick={() => openReceiptModal(row)}
                            disabled={revealingReceiptId === row.id}
                          >
                            {revealingReceiptId === row.id ? 'Loading...' : 'Show'}
                          </button>
                        </div>
                      ) : (
                        <code>N/A</code>
                      )}
                    </td>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                    <td>{STATUS_LABELS[row.vote_status] || row.vote_status || '—'}</td>
                    <td>
                      {row.block_hash ? (
                        <div className="d-flex gap-2 align-items-center">
                          <code>{MASKED_VALUE}</code>
                          <button
                            type="button"
                            className="admin-btn admin-btn-small secondary"
                            onClick={() => openRevealModal('Block Hash', row.block_hash)}
                          >
                            Show
                          </button>
                        </div>
                      ) : (
                        <code>N/A</code>
                      )}
                    </td>
                    <td>
                      {row.previous_hash ? (
                        <div className="d-flex gap-2 align-items-center">
                          <code>{MASKED_VALUE}</code>
                          <button
                            type="button"
                            className="admin-btn admin-btn-small secondary"
                            onClick={() => openRevealModal('Previous Hash', row.previous_hash)}
                          >
                            Show
                          </button>
                        </div>
                      ) : (
                        <code>N/A</code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <div className="admin-pagination-left">
              <span className="admin-pagination-title">Page {pagination.page} of {pagination.totalPages}</span>
              <span className="admin-pagination-range">({pageStart}-{pageEnd} of {pagination.totalCount})</span>
            </div>
            <div className="admin-pagination-right">
              <button
                type="button"
                className="admin-btn admin-btn-small"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                Prev
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-small"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
              <div className="admin-pagination-view">
                <label className="admin-pagination-view-label">View</label>
                <select
                  className="admin-pagination-view-select"
                  value={String(pagination.pageSize)}
                  onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value) }))}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-empty-state">
          <h5 className="admin-empty-state-title">No audit records found</h5>
          <p className="admin-empty-state-message">Try changing filters or search text.</p>
        </div>
      )}

      <Modal
        show={revealModal.show}
        onHide={() => setRevealModal({ show: false, title: '', value: '' })}
        title={revealModal.title}
        confirmText="Close"
        hideCancel
        onConfirm={() => setRevealModal({ show: false, title: '', value: '' })}
      >
        <div className="admin-form-section">
          <p className="admin-form-label" style={{ marginBottom: '0.5rem' }}>
            Sensitive value
          </p>
          <code className="admin-user-id" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {revealModal.value}
          </code>
        </div>
      </Modal>
    </Container>
  );
};

export default ReceiptAuditPage;
