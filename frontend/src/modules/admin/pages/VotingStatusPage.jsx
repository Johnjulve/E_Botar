/**
 * VotingStatusPage
 * Admin/staff view of per-election voting status with summary.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Icon } from '../../../components/common';
import { authService, electionService, votingService } from '../../../services';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatNumber } from '../../../utils/formatters';
import { formatYearLevelNumeric, parseYearLevelNumber } from '../../../utils/helpers';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/common/SortableHeader';
import '../admin.css';

const csvEscape = (val) => {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const VotingStatusPage = () => {
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
  });
  const [filters, setFilters] = useState({
    has_voted: '',
    search: '',
  });
  const debouncedSearch = useDebounce(filters.search, 300);
  const [tableLoading, setTableLoading] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    email: true,
    username: true,
    studentId: true,
  });
  const [courseCatalog, setCourseCatalog] = useState([]);
  const [courseFilters, setCourseFilters] = useState({
    courseListSearch: '',
    advancedCourseCodes: [],
    advancedYearLevels: [],
  });

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    let cancelled = false;
    authService
      .getCourses()
      .then((res) => {
        if (!cancelled) setCourseCatalog(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setCourseCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchVotingStatus();
    } else {
      setSummary(null);
      setRows([]);
      setTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedElectionId,
    pagination.page,
    pagination.pageSize,
    filters.has_voted,
    debouncedSearch,
    courseFilters.advancedCourseCodes,
    courseFilters.advancedYearLevels,
  ]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    selectedElectionId,
    filters.has_voted,
    debouncedSearch,
    pagination.pageSize,
    courseFilters.advancedCourseCodes,
    courseFilters.advancedYearLevels,
  ]);

  const uniqueYearLevels = useMemo(() => {
    const s = new Set();
    rows.forEach((u) => {
      const n = formatYearLevelNumeric(u.year_level);
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) => {
      const na = parseYearLevelNumber(a) ?? 999;
      const nb = parseYearLevelNumber(b) ?? 999;
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });
  }, [rows]);

  const filteredCourseCatalog = useMemo(() => {
    const q = courseFilters.courseListSearch.trim().toLowerCase();
    const list = courseCatalog.filter((c) => c.code);
    if (!q) return list;
    return list.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      const dept = (c.department || '').toLowerCase();
      const dname = (c.department_name || '').toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        dept.includes(q) ||
        dname.includes(q)
      );
    });
  }, [courseCatalog, courseFilters.courseListSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.has_voted) count += 1;
    if (courseFilters.advancedCourseCodes.length > 0) count += courseFilters.advancedCourseCodes.length;
    if (courseFilters.advancedYearLevels.length > 0) count += courseFilters.advancedYearLevels.length;
    return count;
  }, [filters.has_voted, courseFilters.advancedCourseCodes, courseFilters.advancedYearLevels]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await electionService.getAll();
      setElections(res.data || []);
    } catch (error) {
      console.error('Error fetching elections for voting status:', error);
      setElections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVotingStatus = async () => {
    if (!selectedElectionId) return;
    try {
      setTableLoading(true);
      const params = {
        election_id: selectedElectionId,
        page: pagination.page,
        page_size: Number.isFinite(pagination.pageSize) ? pagination.pageSize : 100,
      };
      if (filters.has_voted) {
        params.has_voted = filters.has_voted;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (courseFilters.advancedCourseCodes.length > 0) {
        params.course_codes = courseFilters.advancedCourseCodes.join(',');
      }
      if (courseFilters.advancedYearLevels.length > 0) {
        params.year_levels = courseFilters.advancedYearLevels.join(',');
      }
      const res = await votingService.getVotingStatus(params);
      const data = res.data || {};
      setSummary(data.summary || null);
      setRows(Array.isArray(data.results) ? data.results : []);
      setTotalCount(typeof data.count === 'number' ? data.count : 0);
    } catch (error) {
      console.error('Error fetching voting status:', error);
      setSummary(null);
      setRows([]);
      setTotalCount(0);
    } finally {
      setTableLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleSearchField = (field) => {
    setSearchFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const toggleAdvancedCourse = (code) => {
    if (!code) return;
    setCourseFilters((prev) => ({
      ...prev,
      advancedCourseCodes: prev.advancedCourseCodes.includes(code)
        ? prev.advancedCourseCodes.filter((c) => c !== code)
        : [...prev.advancedCourseCodes, code],
    }));
  };

  const toggleAdvancedYear = (yearLabel) => {
    setCourseFilters((prev) => ({
      ...prev,
      advancedYearLevels: prev.advancedYearLevels.includes(yearLabel)
        ? prev.advancedYearLevels.filter((y) => y !== yearLabel)
        : [...prev.advancedYearLevels, yearLabel],
    }));
  };

  const clearAdvancedAttributeFilters = () => {
    setCourseFilters((prev) => ({
      ...prev,
      advancedCourseCodes: [],
      advancedYearLevels: [],
      courseListSearch: '',
    }));
  };

  const pageSizeEffective = Number.isFinite(pagination.pageSize)
    ? pagination.pageSize
    : Math.max(totalCount, 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSizeEffective));
  const safeCurrentPage = Math.min(Math.max(1, pagination.page), totalPages);
  const startIndexDisplay = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSizeEffective + 1;
  const endIndexDisplay = Math.min(safeCurrentPage * pageSizeEffective, totalCount);

  const getVotingSortValue = (u, key) => {

    switch (key) {
      case 'first_name':
        return (u.user?.first_name || '').toLowerCase();
      case 'middle_name':
        return (u.middle_name || '').toLowerCase();
      case 'last_name':
        return (u.user?.last_name || '').toLowerCase();
      case 'id':
        return (u.student_id || u.user?.username || '').toLowerCase();
      case 'course':
        return (u.course?.name || u.course?.code || '').toLowerCase();
      case 'year_level': {
        const n = parseYearLevelNumber(u.year_level);
        return n == null ? Number.POSITIVE_INFINITY : n;
      }
      case 'status':
        return u.has_voted ? 1 : 0;
      default:
        return '';
    }
  };

  const { sortedRows: sortedVotingRows, sortConfig, handleSort } = useTableSort(
    rows,
    getVotingSortValue
  );
  const paginatedRows = sortedVotingRows;

  const selectedElection = elections.find((e) => String(e.id) === String(selectedElectionId));


  const handleExportCsv = () => {
    const toExport = paginatedRows;
    if (!toExport.length) return;

    const headers = [
      'First Name',
      'Middle Name',
      'Last Name',
      'ID',
      'Course',
      'Year Level',
      'Vote Status',
    ];
    const lines = [headers.join(',')];

    toExport.forEach((u) => {
      const voteStatus = u.has_voted ? 'Voted' : 'Not Voted';
      const course =
        u.course?.name || u.course?.code || (u.course ? String(u.course) : '');
      lines.push(
        [
          csvEscape(u.user?.first_name || ''),
          csvEscape(u.middle_name || ''),
          csvEscape(u.user?.last_name || ''),
          csvEscape(u.student_id || u.user?.username || ''),
          csvEscape(course),
          csvEscape(formatYearLevelNumeric(u.year_level) || u.year_level || ''),
          csvEscape(voteStatus),
        ].join(',')
      );
    });

    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const titleSlug = (selectedElection?.title || 'voting-status')
      .replace(/[^\w-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 72);
    const scopeLabel = Number.isFinite(pagination.pageSize)
      ? `page${safeCurrentPage}_of${totalPages}`
      : 'all_filtered';
    a.href = url;
    a.download = `${titleSlug || 'voting-status'}_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !elections.length && !selectedElectionId) {
    return <LoadingSpinner fullScreen text="Loading voting status..." />;
  }

  return (
    <Container>
      <div className="admin-header">
        <h1>
          <Icon name="vote" size={28} className="admin-icon-primary" />
          Voting Status
        </h1>
        <p>View who has voted and who has not for a selected election.</p>
      </div>

      <div className="admin-form-section" style={{ marginBottom: '1.5rem' }}>
        <h5 className="admin-section-header">
          <Icon name="users" size={18} className="admin-icon-primary" />
          Select Election
        </h5>
        <div className="admin-form-grid">
          <div>
            <label className="admin-form-label">Election</label>
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="admin-form-input"
            >
              <option value="">-- Select election --</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedElection && summary && (
        <div className="admin-users-stats-grid three-cols">
          <div
            className={`admin-users-stat-card ${filters.has_voted === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('has_voted', '')}
            title="Show all eligible students"
          >
            <div className="admin-users-stat-icon total">
              <Icon name="users" size={20} />
            </div>
            <div className="admin-users-stat-value">
              {formatNumber(summary.total_eligible_students || 0)}
            </div>
            <div className="admin-users-stat-label">Total Eligible</div>
          </div>
          <div
            className={`admin-users-stat-card ${filters.has_voted === 'true' ? 'active' : ''}`}
            onClick={() => handleFilterChange('has_voted', 'true')}
            title="Filter by voted students"
          >
            <div className="admin-users-stat-icon verified">
              <Icon name="checkCircle" size={20} />
            </div>
            <div className="admin-users-stat-value">
              {formatNumber(summary.total_voted || 0)}
            </div>
            <div className="admin-users-stat-label">Total Voted</div>
          </div>
          <div
            className={`admin-users-stat-card ${filters.has_voted === 'false' ? 'active' : ''}`}
            onClick={() => handleFilterChange('has_voted', 'false')}
            title="Filter by students who have not voted"
          >
            <div className="admin-users-stat-icon admin">
              <Icon name="clock" size={20} />
            </div>
            <div className="admin-users-stat-value">
              {formatNumber(summary.total_not_voted || 0)}
            </div>
            <div className="admin-users-stat-label">Total Not Voted</div>
          </div>
        </div>
      )}

      {selectedElectionId && (
        <div className="admin-users-toolbar-card">
          <div className="admin-users-toolbar-left">
            <div className="admin-users-search-pill">
              <Icon name="search" size={16} className="admin-users-search-icon" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name, email, username, or student ID..."
                className="admin-users-search-input"
              />
              {filters.search && (
                <button
                  type="button"
                  className="admin-users-search-clear"
                  onClick={() => handleFilterChange('search', '')}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className={`admin-advanced-toggle-btn ${showSearchFilters ? 'active' : ''}`}
              onClick={() => setShowSearchFilters((prev) => !prev)}
            >
              <Icon name="sliders" size={15} />
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <span className="admin-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>

          <div className="admin-users-toolbar-right">
            <button
              type="button"
              className="admin-btn-export-csv"
              onClick={handleExportCsv}
              disabled={!rows.length}
              title={
                Number.isFinite(pagination.pageSize)
                  ? `Export current page (${paginatedRows.length} rows) as CSV`
                  : `Export current page (${paginatedRows.length} rows) as CSV`
              }
            >
              <Icon name="download" size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {selectedElectionId && showSearchFilters && (
        <div className="admin-search-container">
          <div className="admin-advanced-search-panel">
              <div className="admin-advanced-search-row">
                <span className="admin-advanced-search-label">Voting status:</span>
                <div className="admin-advanced-search-chips" style={{ alignItems: 'center' }}>
                  <select
                    value={filters.has_voted}
                    onChange={(e) => handleFilterChange('has_voted', e.target.value)}
                    className="admin-form-input"
                    style={{ maxWidth: '220px' }}
                  >
                    <option value="">All</option>
                    <option value="true">Voted</option>
                    <option value="false">Not Voted</option>
                  </select>
                </div>
              </div>

              <div className="admin-advanced-search-row">
                <span className="admin-advanced-search-label">Search in (text box):</span>
                <div className="admin-advanced-search-chips">
                  <label className="admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={searchFields.name}
                      onChange={() => toggleSearchField('name')}
                    />
                    <span>Name</span>
                  </label>
                  <label className="admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={searchFields.email}
                      onChange={() => toggleSearchField('email')}
                    />
                    <span>Email</span>
                  </label>
                  <label className="admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={searchFields.username}
                      onChange={() => toggleSearchField('username')}
                    />
                    <span>Username</span>
                  </label>
                  <label className="admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={searchFields.studentId}
                      onChange={() => toggleSearchField('studentId')}
                    />
                    <span>ID</span>
                  </label>
                </div>
              </div>

              <div className="admin-advanced-search-row admin-advanced-search-row-stack">
                <span className="admin-advanced-search-label">Courses:</span>
                <div className="admin-course-listbox">
                  <input
                    type="search"
                    className="admin-course-listbox-search form-control form-control-sm"
                    placeholder="Search courses by name, code, or department…"
                    value={courseFilters.courseListSearch}
                    onChange={(e) =>
                      setCourseFilters((prev) => ({
                        ...prev,
                        courseListSearch: e.target.value,
                      }))
                    }
                    aria-label="Filter course list"
                    disabled={courseCatalog.length === 0}
                  />
                  {courseCatalog.length === 0 ? (
                    <span className="text-muted small d-block mt-2">Loading courses…</span>
                  ) : (
                    <>
                      <div className="admin-course-listbox-meta">
                        <span>
                          {filteredCourseCatalog.length} of {courseCatalog.length} shown
                          {courseFilters.advancedCourseCodes.length > 0 && (
                            <> · {courseFilters.advancedCourseCodes.length} selected</>
                          )}
                        </span>
                      </div>
                      <div
                        className="admin-course-listbox-list"
                        role="listbox"
                        aria-multiselectable="true"
                        aria-label="Courses. Use checkboxes to select multiple."
                      >
                        {filteredCourseCatalog.length === 0 ? (
                          <div className="admin-course-listbox-empty text-muted small">No courses match your search.</div>
                        ) : (
                          filteredCourseCatalog.map((c) => {
                            const code = c.code;
                            const checked = courseFilters.advancedCourseCodes.includes(code);
                            return (
                              <label
                                key={code}
                                className={`admin-course-listbox-option ${checked ? 'admin-course-listbox-option-selected' : ''}`}
                                role="option"
                                aria-selected={checked}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAdvancedCourse(code)}
                                />
                                <span className="admin-course-listbox-option-text">
                                  <span className="admin-course-listbox-name">{c.name || code}</span>
                                  <span className="admin-course-listbox-code">{code}</span>
                                  {(c.department_name || c.department) && (
                                    <span className="admin-course-listbox-dept">
                                      {c.department_name || c.department}
                                    </span>
                                  )}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="admin-advanced-search-row">
                <span className="admin-advanced-search-label">Year level:</span>
                <div className="admin-advanced-search-chips">
                  {uniqueYearLevels.length === 0 ? (
                    <span className="text-muted small">No year levels in current list</span>
                  ) : (
                    uniqueYearLevels.map((yl) => {
                      const checked = courseFilters.advancedYearLevels.includes(yl);
                      return (
                        <label key={yl} className={`admin-filter-chip ${checked ? 'admin-filter-chip-active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAdvancedYear(yl)}
                          />
                          <span>{yl}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {(courseFilters.advancedCourseCodes.length > 0 || courseFilters.advancedYearLevels.length > 0) && (
                <div className="admin-advanced-search-actions">
                  <button
                    type="button"
                    className="admin-btn secondary admin-btn-small"
                    onClick={clearAdvancedAttributeFilters}
                  >
                    Clear course / year filters
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {selectedElectionId ? (
        rows.length > 0 ? (
          <div className="admin-table-container">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="FIRST NAME" sortKey="first_name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="MIDDLE NAME" sortKey="middle_name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="LAST NAME" sortKey="last_name" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="COURSE" sortKey="course" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="YEAR LEVEL" sortKey="year_level" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="VOTE STATUS" sortKey="status" sortConfig={sortConfig} onSort={handleSort} align="center" />
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((u) => (
                    <tr key={u.id}>
                      <td>{u.user?.first_name || '—'}</td>
                      <td>{u.middle_name || '—'}</td>
                      <td>{u.user?.last_name || '—'}</td>
                      <td>
                        <div className="admin-user-id">{u.student_id || u.user?.username || '—'}</div>
                      </td>
                      <td>
                        {u.course?.name || u.course?.code ? (
                          <span>{u.course?.name || u.course?.code}</span>
                        ) : (
                          <span className="admin-user-not-specified">Not specified</span>
                        )}
                      </td>
                      <td>
                        {formatYearLevelNumeric(u.year_level) || (
                          <span className="admin-user-not-specified">N/A</span>
                        )}
                      </td>
                      <td className="text-center">
                        {u.has_voted ? (
                          <span className="admin-status-badge-table admin-status-badge-active-table">
                            <Icon name="checkCircle" size={14} />
                            Voted
                          </span>
                        ) : (
                          <span className="admin-status-badge-table admin-status-badge-inactive-table">
                            <Icon name="clock" size={14} />
                            Not Voted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <div className="admin-pagination-left">
                <span className="admin-pagination-title">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <span className="admin-pagination-range">
                  ({totalCount === 0 ? 0 : startIndexDisplay}-{endIndexDisplay} of {totalCount})
                </span>
              </div>

              <div className="admin-pagination-right">
                <button
                  type="button"
                  className="admin-btn admin-btn-small"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={safeCurrentPage <= 1}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-small"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                  }
                  disabled={safeCurrentPage >= totalPages}
                >
                  Next
                </button>

                <div className="admin-pagination-view">
                  <label className="admin-pagination-view-label">View</label>
                  <select
                    className="admin-pagination-view-select"
                    value={String(pagination.pageSize)}
                    onChange={(e) => {
                      setPagination((prev) => ({
                        ...prev,
                        pageSize: Number(e.target.value),
                        page: 1,
                      }));
                    }}
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
          <div className="admin-card-container admin-empty-state">
            <h5 className="admin-empty-state-title">
              No students match the current filters
            </h5>
            <p className="admin-empty-state-message">
              Try adjusting voting status, the search box, or Advanced Search (course / year filters).
            </p>
          </div>
        )
      ) : (
        <div className="admin-card-container admin-empty-state">
          <h5 className="admin-empty-state-title">
            Select an election to view voting status
          </h5>
          <p className="admin-empty-state-message">
            Choose an election from the dropdown above to see who has voted and who has not.
          </p>
        </div>
      )}
    </Container>
  );
};

export default VotingStatusPage;

