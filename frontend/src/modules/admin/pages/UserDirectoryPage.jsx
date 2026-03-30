/**
 * UserDirectoryPage
 * Admin/staff read-only directory for students and staff/admin users.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';
import { getInitials, formatYearLevelNumeric, parseYearLevelNumber } from '../../../utils/helpers';
import '../admin.css';

const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    checkCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const UserDirectoryPage = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [type, setType] = useState('students'); // students | staff
  const [filters, setFilters] = useState({
    college: '',
    course: '',
    year_level: '',
    is_active: '',
    is_verified: '',
    search: '',
  });
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    email: true,
    username: true,
    studentId: true,
    college: false,
    course: false,
    yearLevel: false,
    role: false,
  });

  useEffect(() => {
    fetchDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params = {
        type,
      };
      const response = await authService.getDirectory(params);
      setUsers(Array.isArray(response.data) ? response.data : response.data?.results || []);
    } catch (error) {
      console.error('Error fetching user directory:', error);
      setUsers([]);
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

  const filteredUsers = useMemo(() => {
    let data = users;

    if (filters.college) {
      data = data.filter((u) => u.department?.code === filters.college);
    }

    if (filters.course) {
      data = data.filter((u) => u.course?.code === filters.course);
    }

    if (filters.year_level) {
      const want = String(filters.year_level).trim();
      data = data.filter(
        (u) => formatYearLevelNumeric(u.year_level) === want || String(u.year_level || '') === want
      );
    }

    if (filters.is_active) {
      const active = filters.is_active === 'true';
      data = data.filter((u) => u.user?.is_active === active);
    }

    if (filters.is_verified) {
      const verified = filters.is_verified === 'true';
      data = data.filter((u) => Boolean(u.is_verified) === verified);
    }

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const activeFields = searchFields;
      data = data.filter((u) => {
        const values = [];

        if (activeFields.name) {
          values.push(
            `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.toLowerCase()
          );
        }
        if (activeFields.email) {
          values.push((u.user?.email || '').toLowerCase());
        }
        if (activeFields.studentId) {
          values.push((u.student_id || '').toLowerCase());
        }
        if (activeFields.username) {
          values.push((u.user?.username || '').toLowerCase());
        }
        if (activeFields.college) {
          values.push(
            (u.department?.name || '').toLowerCase(),
            (u.department?.code || '').toLowerCase()
          );
        }
        if (activeFields.course) {
          values.push(
            (u.course?.name || '').toLowerCase(),
            (u.course?.code || '').toLowerCase()
          );
        }
        if (activeFields.yearLevel) {
          const raw = String(u.year_level || '').toLowerCase();
          const num = formatYearLevelNumeric(u.year_level).toLowerCase();
          values.push(raw, num);
        }
        if (activeFields.role) {
          let role = 'student';
          if (u.user?.is_superuser) role = 'admin';
          else if (u.user?.is_staff) role = 'staff';
          values.push(role);
        }

        return values.some((val) => val && val.includes(q));
      });
    }

    return data;
  }, [users, filters, searchFields]);

  const summary = useMemo(() => {
    if (!filteredUsers.length) {
      return {
        total: 0,
        colleges: 0,
        courses: 0,
      };
    }

    const collegeSet = new Set();
    const courseSet = new Set();

    filteredUsers.forEach((u) => {
      if (u.department?.name || u.department?.code) {
        collegeSet.add(u.department.code || u.department.name);
      }
      if (u.course?.code || u.course?.name) {
        courseSet.add(u.course.code || u.course.name);
      }
    });

    return {
      total: filteredUsers.length,
      colleges: collegeSet.size,
      courses: courseSet.size,
    };
  }, [filteredUsers]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading user directory..." />;
  }

  const isStudentsView = type === 'students';

  return (
    <Container>
      <div className="admin-header">
        <h1>
          <Icon name="users" size={28} className="admin-icon-primary" />
          User Directory
        </h1>
        <p>
          Read-only directory of {isStudentsView ? 'students' : 'staff and administrators'} with academic information.
        </p>
      </div>

      <div className="admin-filter-tabs">
        <button
          type="button"
          onClick={() => setType('students')}
          className={`admin-filter-btn ${
            isStudentsView ? 'admin-filter-btn-default' : 'admin-filter-btn-inactive'
          }`}
        >
          <Icon name="users" size={16} />
          Students
        </button>
        <button
          type="button"
          onClick={() => setType('staff')}
          className={`admin-filter-btn ${
            !isStudentsView ? 'admin-filter-btn-default' : 'admin-filter-btn-inactive'
          }`}
        >
          <Icon name="users" size={16} />
          Staff / Admin
        </button>
      </div>

      <div className="admin-search-container">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
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
        </div>

        {showSearchFilters && (
          <div
            style={{
              marginTop: '0.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>Search in:</span>
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
            <label className="admin-filter-chip">
              <input
                type="checkbox"
                checked={searchFields.college}
                onChange={() => toggleSearchField('college')}
              />
              <span>College</span>
            </label>
            <label className="admin-filter-chip">
              <input
                type="checkbox"
                checked={searchFields.course}
                onChange={() => toggleSearchField('course')}
              />
              <span>Course</span>
            </label>
            <label className="admin-filter-chip">
              <input
                type="checkbox"
                checked={searchFields.yearLevel}
                onChange={() => toggleSearchField('yearLevel')}
              />
              <span>Year</span>
            </label>
            <label className="admin-filter-chip">
              <input
                type="checkbox"
                checked={searchFields.role}
                onChange={() => toggleSearchField('role')}
              />
              <span>Role</span>
            </label>
          </div>
        )}
      </div>

      {filteredUsers.length > 0 && (
        <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-icon primary">
              <Icon name="users" size={24} />
            </div>
            <div className="admin-stat-value">{summary.total}</div>
            <div className="admin-stat-label">
              {isStudentsView ? 'Students in view' : 'Staff/Admin in view'}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon success">
              <Icon name="users" size={24} />
            </div>
            <div className="admin-stat-value">{summary.colleges}</div>
            <div className="admin-stat-label">Colleges represented</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon warning">
              <Icon name="users" size={24} />
            </div>
            <div className="admin-stat-value">{summary.courses}</div>
            <div className="admin-stat-label">Courses represented</div>
          </div>
        </div>
      )}

      {filteredUsers.length > 0 ? (
        <div className="admin-table-container">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>College / Course</th>
                  <th>Year Level</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Verified</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar-table">
                          {getInitials(
                            `${u.user?.first_name || ''} ${u.user?.last_name || ''}`
                          )}
                        </div>
                        <div>
                          <div className="admin-user-name">
                            {u.user?.first_name} {u.user?.last_name}
                          </div>
                          <div className="admin-user-id">
                            {u.student_id || u.user?.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-user-contact">
                        {u.user?.email || 'No email'}
                      </div>
                    </td>
                    <td>
                      {u.department?.name || u.course?.name ? (
                        <>
                          <div className="admin-user-academic">
                            {u.department?.name || 'Unassigned College'}
                          </div>
                          <div className="admin-user-academic-secondary">
                            {u.course?.name || 'Unassigned Course'}
                          </div>
                        </>
                      ) : (
                        <span className="admin-user-not-specified">Not specified</span>
                      )}
                    </td>
                    <td className="text-center">
                      {formatYearLevelNumeric(u.year_level) || (
                        <span className="admin-user-not-specified">N/A</span>
                      )}
                    </td>
                    <td className="text-center">
                      {u.user?.is_active ? (
                        <span className="admin-status-badge-table admin-status-badge-active-table">
                          Active
                        </span>
                      ) : (
                        <span className="admin-status-badge-table admin-status-badge-inactive-table">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {u.is_verified ? (
                        <span className="admin-status-badge-table admin-status-badge-active-table">
                          <Icon name="checkCircle" size={14} />
                          Verified
                        </span>
                      ) : (
                        <span className="admin-status-badge-table admin-status-badge-inactive-table">
                          Not Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="admin-card-container admin-empty-state">
          <Icon name="users" size={48} className="admin-empty-state-icon" />
          <h5 className="admin-empty-state-title">
            No {isStudentsView ? 'students' : 'staff/admin users'} found
          </h5>
          <p className="admin-empty-state-message">
            Try adjusting your search or filters to see more results.
          </p>
        </div>
      )}
    </Container>
  );
};

export default UserDirectoryPage;

