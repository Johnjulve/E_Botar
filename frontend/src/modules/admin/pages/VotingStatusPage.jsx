/**
 * VotingStatusPage
 * Admin/staff view of per-election voting status with summary.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { authService, electionService, votingService } from '../../../services';
import { formatNumber } from '../../../utils/formatters';
import { formatYearLevelNumeric, parseYearLevelNumber } from '../../../utils/helpers';
import '../admin.css';

const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    vote: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    checkCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

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
<<<<<<< HEAD
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20, // 20 | 50 | Infinity (All)
  });
=======
  const [pageSize, setPageSize] = useState(20); // 20 | 50 | Infinity (All)
  const [currentPage, setCurrentPage] = useState(1);
>>>>>>> main
  const [filters, setFilters] = useState({
    has_voted: '',
    search: '',
  });
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    email: true,
    username: true,
    studentId: true,
  });
  const [courseCatalog, setCourseCatalog] = useState([]);
<<<<<<< HEAD
  const [courseFilters, setCourseFilters] = useState({
    courseListSearch: '',
    advancedCourseCodes: [],
    advancedYearLevels: [],
  });
=======
  const [courseListSearch, setCourseListSearch] = useState('');
  const [advancedCourseCodes, setAdvancedCourseCodes] = useState([]);
  const [advancedYearLevels, setAdvancedYearLevels] = useState([]);
>>>>>>> main

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElectionId]);

  useEffect(() => {
<<<<<<< HEAD
    setPagination((prev) => ({ ...prev, page: 1 }));
=======
    setCurrentPage(1);
>>>>>>> main
  }, [
    selectedElectionId,
    filters.has_voted,
    filters.search,
<<<<<<< HEAD
    pagination.pageSize,
    searchFields,
    courseFilters.advancedCourseCodes,
    courseFilters.advancedYearLevels,
=======
    pageSize,
    searchFields,
    advancedCourseCodes,
    advancedYearLevels,
>>>>>>> main
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
<<<<<<< HEAD
    const q = courseFilters.courseListSearch.trim().toLowerCase();
=======
    const q = courseListSearch.trim().toLowerCase();
>>>>>>> main
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
<<<<<<< HEAD
  }, [courseCatalog, courseFilters.courseListSearch]);
=======
  }, [courseCatalog, courseListSearch]);
>>>>>>> main

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
      setLoading(true);
      const res = await votingService.getVotingStatus({ election_id: selectedElectionId });
      const data = res.data || {};
      setSummary(data.summary || null);
      setRows(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error('Error fetching voting status:', error);
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
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
<<<<<<< HEAD
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
=======
    setAdvancedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleAdvancedYear = (yearLabel) => {
    setAdvancedYearLevels((prev) =>
      prev.includes(yearLabel) ? prev.filter((y) => y !== yearLabel) : [...prev, yearLabel]
    );
  };

  const clearAdvancedAttributeFilters = () => {
    setAdvancedCourseCodes([]);
    setAdvancedYearLevels([]);
    setCourseListSearch('');
>>>>>>> main
  };

  const filteredRows = useMemo(() => {
    return rows.filter((u) => {
      if (filters.has_voted === 'true' && !u.has_voted) return false;
      if (filters.has_voted === 'false' && u.has_voted) return false;

<<<<<<< HEAD
      if (courseFilters.advancedCourseCodes.length > 0) {
        if (!u.course?.code || !courseFilters.advancedCourseCodes.includes(u.course.code)) {
          return false;
        }
      }
      if (courseFilters.advancedYearLevels.length > 0) {
        const yn = formatYearLevelNumeric(u.year_level);
        if (!yn || !courseFilters.advancedYearLevels.includes(yn)) {
=======
      if (advancedCourseCodes.length > 0) {
        if (!u.course?.code || !advancedCourseCodes.includes(u.course.code)) {
          return false;
        }
      }
      if (advancedYearLevels.length > 0) {
        const yn = formatYearLevelNumeric(u.year_level);
        if (!yn || !advancedYearLevels.includes(yn)) {
>>>>>>> main
          return false;
        }
      }

      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const values = [];
        if (searchFields.name) {
          values.push(
            `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.toLowerCase()
          );
        }
        if (searchFields.email) {
          values.push((u.user?.email || '').toLowerCase());
        }
        if (searchFields.studentId) {
          values.push((u.student_id || '').toLowerCase());
        }
        if (searchFields.username) {
          values.push((u.user?.username || '').toLowerCase());
        }
        if (!values.some((val) => val && val.includes(q))) {
          return false;
        }
      }

      return true;
    });
  }, [
    rows,
    filters.has_voted,
    filters.search,
    searchFields,
<<<<<<< HEAD
  courseFilters.advancedCourseCodes,
  courseFilters.advancedYearLevels,
  ]);

  const totalRows = filteredRows.length;
  const effectivePageSize = Number.isFinite(pagination.pageSize)
    ? pagination.pageSize
    : totalRows || 1;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, pagination.page), totalPages);
=======
    advancedCourseCodes,
    advancedYearLevels,
  ]);

  const totalRows = filteredRows.length;
  const effectivePageSize = Number.isFinite(pageSize) ? pageSize : totalRows || 1;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
>>>>>>> main
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndexExclusive = Math.min(startIndex + effectivePageSize, totalRows);
  const paginatedRows = filteredRows.slice(startIndex, endIndexExclusive);

  const selectedElection = elections.find((e) => String(e.id) === String(selectedElectionId));

  const handleExportCsv = () => {
<<<<<<< HEAD
    const toExport = Number.isFinite(pagination.pageSize) ? paginatedRows : filteredRows;
=======
    const toExport = Number.isFinite(pageSize) ? paginatedRows : filteredRows;
>>>>>>> main
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
<<<<<<< HEAD
      .replace(/[^\w-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 72);
    const scopeLabel = Number.isFinite(pagination.pageSize)
=======
      .replace(/[^\w\-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 72);
    const scopeLabel = Number.isFinite(pageSize)
>>>>>>> main
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
        <div className="admin-info-grid">
          <div className="admin-info-card">
            <div className="admin-info-card-label">Total Eligible Students</div>
            <div className="admin-info-card-value">
              {formatNumber(summary.total_eligible_students || 0)}
            </div>
          </div>
          <div className="admin-info-card">
            <div className="admin-info-card-label">Total Voted</div>
            <div className="admin-info-card-value">
              {formatNumber(summary.total_voted || 0)}
            </div>
          </div>
          <div className="admin-info-card">
            <div className="admin-info-card-label">Total Not Voted</div>
            <div className="admin-info-card-value">
              {formatNumber(summary.total_not_voted || 0)}
            </div>
          </div>
        </div>
      )}

      {selectedElectionId && (
        <div className="admin-search-container">
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label className="admin-form-label">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, username, or student ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="admin-search-input"
              />
            </div>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => setShowSearchFilters((prev) => !prev)}
            >
              Advanced Search
            </button>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={handleExportCsv}
              disabled={!filteredRows.length}
              title={
<<<<<<< HEAD
                Number.isFinite(pagination.pageSize)
=======
                Number.isFinite(pageSize)
>>>>>>> main
                  ? `Export current page (${paginatedRows.length} rows) as CSV`
                  : `Export all filtered rows (${filteredRows.length}) as CSV`
              }
            >
              <span className="admin-btn-inline-icon">
                <Icon name="download" size={18} />
              </span>
              Export CSV
            </button>
          </div>

          {showSearchFilters && (
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
<<<<<<< HEAD
                    value={courseFilters.courseListSearch}
                    onChange={(e) =>
                      setCourseFilters((prev) => ({
                        ...prev,
                        courseListSearch: e.target.value,
                      }))
                    }
=======
                    value={courseListSearch}
                    onChange={(e) => setCourseListSearch(e.target.value)}
>>>>>>> main
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
<<<<<<< HEAD
                          {courseFilters.advancedCourseCodes.length > 0 && (
                            <> · {courseFilters.advancedCourseCodes.length} selected</>
=======
                          {advancedCourseCodes.length > 0 && (
                            <> · {advancedCourseCodes.length} selected</>
>>>>>>> main
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
<<<<<<< HEAD
                            const checked = courseFilters.advancedCourseCodes.includes(code);
=======
                            const checked = advancedCourseCodes.includes(code);
>>>>>>> main
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
<<<<<<< HEAD
                      const checked = courseFilters.advancedYearLevels.includes(yl);
=======
                      const checked = advancedYearLevels.includes(yl);
>>>>>>> main
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

<<<<<<< HEAD
              {(courseFilters.advancedCourseCodes.length > 0 || courseFilters.advancedYearLevels.length > 0) && (
=======
              {(advancedCourseCodes.length > 0 || advancedYearLevels.length > 0) && (
>>>>>>> main
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
          )}
        </div>
      )}

      {selectedElectionId ? (
        filteredRows.length > 0 ? (
          <div className="admin-table-container">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>First Name</th>
                    <th>Middle Name</th>
                    <th>Last Name</th>
                    <th>ID</th>
                    <th>Course</th>
                    <th>Year Level</th>
                    <th className="text-center">Vote Status</th>
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
                  ({totalRows === 0 ? 0 : startIndex + 1}-{endIndexExclusive} of {totalRows})
                </span>
              </div>

              <div className="admin-pagination-right">
                <button
                  type="button"
                  className="admin-btn admin-btn-small"
<<<<<<< HEAD
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
=======
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
>>>>>>> main
                  disabled={safeCurrentPage <= 1}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-small"
<<<<<<< HEAD
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                  }
=======
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
>>>>>>> main
                  disabled={safeCurrentPage >= totalPages}
                >
                  Next
                </button>

                <div className="admin-pagination-view">
                  <label className="admin-pagination-view-label">View</label>
                  <select
                    className="admin-pagination-view-select"
<<<<<<< HEAD
                    value={Number.isFinite(pagination.pageSize) ? String(pagination.pageSize) : 'all'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'all') {
                        setPagination((prev) => ({ ...prev, pageSize: Infinity, page: 1 }));
                      } else {
                        setPagination((prev) => ({ ...prev, pageSize: Number(value), page: 1 }));
                      }
=======
                    value={Number.isFinite(pageSize) ? String(pageSize) : 'all'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'all') setPageSize(Infinity);
                      else setPageSize(Number(value));
>>>>>>> main
                    }}
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="all">All</option>
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

