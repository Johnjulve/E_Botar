import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Modal, Icon } from '../../../components/common';
import { electionService, votingService } from '../../../services';
import { getInitials } from '../../../utils/helpers';
import { formatDate } from '../../../utils/formatters';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/common/SortableHeader';
import '../admin.css';

const STATUS_LABELS = {
  verified: 'Verified',
  missing_ballot: 'Missing Ballot',
  hash_mismatch: 'Hash Mismatch',
};

const MASKED_VALUE = '••••••••';

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
  const [activeDropdown, setActiveDropdown] = useState(null); // 'election' | 'status' | null
  const [revealModal, setRevealModal] = useState({
    show: false,
    title: '',
    value: '',
  });
  const [revealingReceiptId, setRevealingReceiptId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      openRevealModal('Receipt Code', row.full_receipt_code || row.masked_receipt_code || 'N/A');
    } finally {
      setRevealingReceiptId(null);
    }
  };

  const selectedElectionTitle = useMemo(() => {
    if (!filters.election_id) return 'All Elections';
    const found = elections.find((e) => String(e.id) === String(filters.election_id));
    return found ? found.title : 'All Elections';
  }, [filters.election_id, elections]);

  const selectedStatusLabel = useMemo(() => {
    if (!filters.vote_status) return 'All Statuses';
    return STATUS_LABELS[filters.vote_status] || filters.vote_status;
  }, [filters.vote_status]);

  // Pagination pages array
  const paginationPages = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= Math.min(pagination.totalPages, 5); i++) {
      pages.push(i);
    }
    return pages;
  }, [pagination.totalPages]);


  const getAuditSortValue = (row, key) => {

    switch (key) {
      case 'student':
        return (row.user_full_name || row.user_username || '').toLowerCase();
      case 'election':
        return (row.election_title || '').toLowerCase();
      case 'receipt':
        return (row.masked_receipt_code || row.receipt_code || '').toLowerCase();
      case 'created_at': {
        const t = row.created_at ? new Date(row.created_at).getTime() : 0;
        return Number.isFinite(t) ? t : 0;
      }
      case 'status':
        return (row.verification_status || '').toLowerCase();
      default:
        return '';
    }
  };

  const { sortedRows, sortConfig, handleSort } = useTableSort(
    rows,
    getAuditSortValue
  );

  return (

    <Container>
      {/* Header */}
      <div className="admin-header">
        <h1>
          <Icon name="fileText" size={28} className="admin-icon-primary" />
          Receipt Audit
        </h1>
        <p>Read-only receipt audit trail for staff and administrator verification and dispute handling.</p>
      </div>

      {/* Modern Filter & Action Toolbar */}
      <div className="admin-users-toolbar-card" ref={dropdownRef}>
        <div className="admin-users-toolbar-left">
          {/* Search Pill */}
          <div className="admin-users-search-pill">
            <Icon name="search" size={16} className="admin-users-search-icon" />
            <input
              type="text"
              className="admin-users-search-input"
              placeholder="Search student, ID, receipt, hash..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  fetchRows();
                }
              }}
            />
            {filters.search && (
              <button
                type="button"
                className="admin-users-search-clear"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, search: '' }));
                  setTimeout(fetchRows, 0);
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Election Dropdown Pill */}
          <div className="admin-filter-dropdown-wrapper">
            <button
              type="button"
              className={`admin-filter-dropdown-btn ${filters.election_id ? 'active' : ''}`}
              onClick={() => setActiveDropdown((prev) => (prev === 'election' ? null : 'election'))}
            >
              <div className="admin-filter-dropdown-title">
                <span>Election</span>
                <Icon name="chevronDown" size={12} />
              </div>
              <div className="admin-filter-dropdown-sub">{selectedElectionTitle}</div>
            </button>
            {activeDropdown === 'election' && (
              <div className="admin-dropdown-popover">
                <div
                  className={`admin-filter-dropdown-item ${!filters.election_id ? 'active font-bold' : ''}`}
                  style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '6px' }}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, election_id: '' }));
                    setActiveDropdown(null);
                  }}
                >
                  All Elections
                </div>
                {elections.map((election) => (
                  <div
                    key={election.id}
                    className={`admin-filter-dropdown-item ${String(filters.election_id) === String(election.id) ? 'active font-bold' : ''}`}
                    style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '6px' }}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, election_id: election.id }));
                      setActiveDropdown(null);
                    }}
                  >
                    {election.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vote Status Dropdown Pill */}
          <div className="admin-filter-dropdown-wrapper">
            <button
              type="button"
              className={`admin-filter-dropdown-btn ${filters.vote_status ? 'active' : ''}`}
              onClick={() => setActiveDropdown((prev) => (prev === 'status' ? null : 'status'))}
            >
              <div className="admin-filter-dropdown-title">
                <span>Vote Status</span>
                <Icon name="chevronDown" size={12} />
              </div>
              <div className="admin-filter-dropdown-sub">{selectedStatusLabel}</div>
            </button>
            {activeDropdown === 'status' && (
              <div className="admin-dropdown-popover">
                {[
                  { key: '', label: 'All Statuses' },
                  { key: 'verified', label: 'Verified' },
                  { key: 'missing_ballot', label: 'Missing Ballot' },
                  { key: 'hash_mismatch', label: 'Hash Mismatch' },
                ].map((st) => (
                  <div
                    key={st.key}
                    className={`admin-filter-dropdown-item ${filters.vote_status === st.key ? 'active font-bold' : ''}`}
                    style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '6px' }}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, vote_status: st.key }));
                      setActiveDropdown(null);
                    }}
                  >
                    {st.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-users-toolbar-right">
          <button
            type="button"
            className="admin-btn-export-csv"
            onClick={fetchRows}
          >
            <Icon name="refresh" size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingSpinner text="Loading receipt audit data..." />
      ) : rows.length > 0 ? (
        <div className="admin-users-table-container">
          <div className="table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <SortableHeader label="STUDENT" sortKey="student" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="ELECTION" sortKey="election" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="RECEIPT CODE" sortKey="receipt" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="CREATED AT" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="STATUS" sortKey="status" sortConfig={sortConfig} onSort={handleSort} align="center" />
                  <th>BLOCK HASH</th>
                  <th>PREVIOUS HASH</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {

                  const studentName = row.user_full_name || row.user_username || 'Student';
                  const cleanInitials = getInitials(studentName).replace(/\./g, '').toUpperCase() || 'U';

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar-table">
                            {cleanInitials}
                          </div>
                          <div>
                            <div className="admin-user-name">
                              {studentName}
                            </div>
                            <div className="admin-user-id text-muted" style={{ fontSize: '0.78rem' }}>
                              {row.student_id || row.user_username || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{row.election_title || '—'}</div>
                      </td>
                      <td>
                        {row.masked_receipt_code ? (
                          <div className="d-flex align-items-center gap-2">
                            <code className="text-muted">{MASKED_VALUE}</code>
                            <button
                              type="button"
                              className="admin-action-btn-outline lock"
                              title="Show Receipt Code"
                              onClick={() => openReceiptModal(row)}
                              disabled={revealingReceiptId === row.id}
                            >
                              <Icon name={revealingReceiptId === row.id ? 'clock' : 'eye'} size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <span className="admin-user-joined">
                          {formatDate(row.created_at, 'datetime') || (row.created_at ? new Date(row.created_at).toLocaleString() : '—')}
                        </span>
                      </td>
                      <td className="text-center">
                        {row.vote_status === 'verified' ? (
                          <span className="admin-status-badge-table admin-status-badge-active-table">
                            <Icon name="checkCircle" size={13} />
                            Verified
                          </span>
                        ) : row.vote_status === 'missing_ballot' ? (
                          <span className="admin-role-badge admin-role-badge-admin">
                            <Icon name="alertTriangle" size={13} />
                            Missing Ballot
                          </span>
                        ) : row.vote_status === 'hash_mismatch' ? (
                          <span className="admin-role-badge admin-btn-archive-selected active">
                            <Icon name="xCircle" size={13} />
                            Hash Mismatch
                          </span>
                        ) : (
                          <span className="admin-status-badge-table admin-status-badge-inactive-table">
                            {row.vote_status || '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        {row.block_hash ? (
                          <div className="d-flex align-items-center gap-2">
                            <code className="text-muted">{MASKED_VALUE}</code>
                            <button
                              type="button"
                              className="admin-action-btn-outline edit"
                              title="View Block Hash"
                              onClick={() => openRevealModal('Block Hash', row.block_hash)}
                            >
                              <Icon name="eye" size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {row.previous_hash ? (
                          <div className="d-flex align-items-center gap-2">
                            <code className="text-muted">{MASKED_VALUE}</code>
                            <button
                              type="button"
                              className="admin-action-btn-outline edit"
                              title="View Previous Hash"
                              onClick={() => openRevealModal('Previous Hash', row.previous_hash)}
                            >
                              <Icon name="eye" size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer & Pagination */}
          <div className="admin-users-table-footer">
            <div className="admin-users-page-size">
              <span>Show</span>
              <select
                className="admin-users-page-select"
                value={String(pagination.pageSize)}
                onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value) }))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="admin-users-pagination">
              <button
                type="button"
                className="admin-users-page-btn"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                &lt; Previous
              </button>

              {paginationPages.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-users-page-btn ${p === pagination.page ? 'active' : ''}`}
                  onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                >
                  [{p}]
                </button>
              ))}

              <button
                type="button"
                className="admin-users-page-btn"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card-container admin-empty-state">
          <Icon name="fileText" size={48} className="admin-empty-state-icon" />
          <h5 className="admin-empty-state-title">No audit records found</h5>
          <p className="admin-empty-state-message">Try changing the election filter, vote status, or search query.</p>
        </div>
      )}

      {/* Sensitive Value Reveal Modal */}
      <Modal
        show={revealModal.show}
        onHide={() => setRevealModal({ show: false, title: '', value: '' })}
        onCancel={() => setRevealModal({ show: false, title: '', value: '' })}
        title={revealModal.title}
        confirmText="Close"
        onConfirm={() => setRevealModal({ show: false, title: '', value: '' })}
      >
        <div className="admin-form-section" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
          <p className="admin-form-label text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            Full Audited Hash / Code:
          </p>
          <code
            style={{
              display: 'block',
              padding: '0.75rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              wordBreak: 'break-all',
              fontSize: '0.9rem',
              color: '#0f172a',
            }}
          >
            {revealModal.value}
          </code>
        </div>
      </Modal>
    </Container>
  );
};

export default ReceiptAuditPage;
