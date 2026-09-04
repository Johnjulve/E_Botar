/**
 * UserManagementPage
 * View and manage all users in modern table format matching exact UI specifications
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Modal, Button, SortableHeader, Icon } from '../../../components/common';
import { authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { useTableSort } from '../../../hooks/useTableSort';
import { useDebounce } from '../../../hooks/useDebounce';
import { getInitials, parseYearLevelNumber, formatYearLevelNumeric } from '../../../utils/helpers';
import { formatDate } from '../../../utils/formatters';
import { RosterSyncModal } from '../components/RosterSyncModal';
import '../admin.css';

const csvEscape = (val) => {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/** Staff may edit only non–staff users at or below their own year level. */
const canStaffManageStudent = (actorProfile, targetRow) => {
  if (!actorProfile) return false;
  const staffY = parseYearLevelNumber(actorProfile.year_level);
  if (staffY == null) return false;
  if (targetRow.user?.is_superuser || targetRow.user?.is_staff) return false;
  const ty = parseYearLevelNumber(targetRow.year_level);
  if (ty == null) return true;
  return ty <= staffY;
};

const getUserRoleKey = (u) => {
  if (u.user?.is_superuser) return 'admin';
  if (u.user?.is_staff) return 'staff';
  return 'student';
};

const UserManagementPage = () => {
  const { isAdmin, isStaffOrAdmin, user: authUser } = useAuth();
  const isStaffOnly = isStaffOrAdmin && !isAdmin;
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, admin, staff, student, verified
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'course' | 'year' | 'role' | null
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [editDepartments, setEditDepartments] = useState([]);
  const [editCourses, setEditCourses] = useState([]);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    student_id: '',
    department_code: '',
    course_code: '',
    year_level: '',
    section: '',
    is_verified: false,
  });

  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    student_id: '',
    department_code: '',
    course_code: '',
    year_level: '',
    section: '',
    role: 'student',
    password: '',
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [actionUserId, setActionUserId] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    email: true,
    username: true,
    studentId: true,
  });

  /** Multi-select filters */
  const [courseCatalog, setCourseCatalog] = useState([]);
  const [courseListSearch, setCourseListSearch] = useState('');
  const [advancedCourseCodes, setAdvancedCourseCodes] = useState([]);
  const [advancedYearLevels, setAdvancedYearLevels] = useState([]);
  const [advancedRoles, setAdvancedRoles] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
  }, [debouncedSearchQuery, filter, advancedCourseCodes, advancedYearLevels, advancedRoles, pageSize]);

  const buildProfileListParams = useCallback(() => {
    const params = {
      page: currentPage,
      page_size: Number.isFinite(pageSize) ? pageSize : 100,
    };
    if (filter === 'admin' || filter === 'staff' || filter === 'student') {
      params.role = filter;
    } else if (filter === 'verified') {
      params.is_verified = 'true';
    }
    if (debouncedSearchQuery.trim()) {
      params.search = debouncedSearchQuery.trim();
    }
    if (advancedCourseCodes.length > 0) {
      params.course_codes = advancedCourseCodes.join(',');
    }
    if (advancedYearLevels.length > 0) {
      params.year_levels = advancedYearLevels.join(',');
    }
    return params;
  }, [
    currentPage,
    pageSize,
    filter,
    debouncedSearchQuery,
    advancedCourseCodes,
    advancedYearLevels,
  ]);

  const fetchUsers = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setTableLoading(true);
      }
      const response = await authService.getAllProfiles(buildProfileListParams());
      const data = response.data || {};
      setUsers(Array.isArray(data.results) ? data.results : []);
      setTotalCount(typeof data.count === 'number' ? data.count : 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setInitialLoading(false);
      setTableLoading(false);
    }
  }, [buildProfileListParams]);

  useEffect(() => {
    fetchUsers(initialLoading);
  }, [fetchUsers]);

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

  const uniqueYearLevels = useMemo(() => ['1', '2', '3', '4'], []);

  const filteredCourseCatalog = useMemo(() => {
    const q = courseListSearch.trim().toLowerCase();
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
  }, [courseCatalog, courseListSearch]);

  useEffect(() => {
    if (!showEditModal && !showAddModal) return;
    let cancelled = false;
    (async () => {
      try {
        const [deptRes] = await Promise.all([authService.getDepartments()]);
        if (cancelled) return;
        setEditDepartments(deptRes.data || []);
        
        const dept = selectedUser?.department?.code || addForm.department_code || '';
        if (dept) {
          const cr = await authService.getCoursesByDepartment(dept);
          if (!cancelled) setEditCourses(cr.data || []);
        } else {
          setEditCourses([]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEditModal, showAddModal, selectedUser, addForm.department_code]);

  const filteredUsers = useMemo(() => {
    if (!advancedRoles.length) {
      return users;
    }
    return users.filter((userRow) => advancedRoles.includes(getUserRoleKey(userRow)));
  }, [users, advancedRoles]);

  const getUserSortValue = useCallback((u, key) => {
    switch (key) {
      case 'first_name':
        return (u.user?.first_name || u.user?.username || '').toLowerCase();
      case 'id':
        return (u.student_id || u.user?.username || '').toLowerCase();
      case 'course':
        return (u.course?.code || u.course?.name || '').toLowerCase();
      case 'year_level': {
        const n = parseYearLevelNumber(u.year_level);
        return n == null ? Number.POSITIVE_INFINITY : n;
      }
      case 'section':
        return (u.section ?? '').toString().toLowerCase();
      case 'role': {
        if (u.user?.is_superuser) return 0;
        if (u.user?.is_staff) return 1;
        return 2;
      }
      case 'status':
        return u.user?.is_active ? 1 : 0;
      case 'verified':
        return u.is_verified ? 1 : 0;
      case 'joined': {

        const raw = u.user?.date_joined || u.created_at;
        const t = raw ? new Date(raw).getTime() : 0;
        return Number.isFinite(t) ? t : 0;
      }
      default:
        return '';
    }
  }, []);

  const { sortedRows: sortedUsers, sortConfig, handleSort } = useTableSort(
    filteredUsers,
    getUserSortValue,
  );

  const pageSizeEffective = Number.isFinite(pageSize) ? pageSize : Math.max(totalCount, 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSizeEffective));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedUsers = sortedUsers;

  // Multi-select helpers
  const isAllSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds.includes(u.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedUsers.map((u) => u.id);
      setSelectedUserIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedUsers.map((u) => u.id);
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const toggleAdvancedCourse = (code) => {
    if (!code) return;
    setAdvancedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleAdvancedYear = (yearLabel) => {
    setAdvancedYearLevels((prev) =>
      prev.includes(yearLabel) ? prev.filter((y) => y !== yearLabel) : [...prev, yearLabel]
    );
  };

  const toggleAdvancedRole = (role) => {
    setAdvancedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const activeFilterCount =
    advancedCourseCodes.length +
    advancedYearLevels.length +
    advancedRoles.length +
    (filter !== 'all' ? 1 : 0);

  // Pagination pages array
  const paginationPages = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  // CSV Export
  const handleExportCsv = () => {
    const list = filteredUsers;
    if (!list.length) return;

    const headers = [
      'Name',
      'Student ID',
      'Username',
      'Email',
      'Department',
      'Course',
      'Year Level',
      'Section',
      'Role',
      'Status',
      'Verified',
      'Date Joined',
    ];

    const rows = list.map((u) => [
      `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim() || u.user?.username,
      u.student_id || '',
      u.user?.username || '',
      u.user?.email || '',
      u.department?.name || u.department?.code || '',
      u.course?.code || u.course?.name || '',
      formatYearLevelNumeric(u.year_level),
      u.section || '',
      u.user?.is_superuser ? 'Admin' : u.user?.is_staff ? 'Staff' : 'Student',
      u.user?.is_active ? 'Active' : 'Inactive',
      u.is_verified ? 'Yes' : 'No',
      u.user?.date_joined || u.created_at || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Actions
  const openEditUser = (userRow) => {
    setSelectedUser(userRow);
    setEditForm({
      first_name: userRow.user?.first_name || '',
      last_name: userRow.user?.last_name || '',
      middle_name: userRow.middle_name || '',
      student_id: userRow.student_id || '',
      department_code: userRow.department?.code || '',
      course_code: userRow.course?.code || '',
      year_level: userRow.year_level != null ? String(userRow.year_level) : '',
      section: userRow.section || '',
      is_verified: Boolean(userRow.is_verified),
    });
    setShowEditModal(true);
  };

  const handleResetPassword = (userRow) => {
    setSelectedUser(userRow);
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
    setPasswordCopied(false);
    setShowPasswordModal(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!selectedUser?.id || !generatedPassword || modalSubmitting) return;
    try {
      setModalSubmitting(true);
      await authService.resetUserPassword(selectedUser.id, generatedPassword);
      alert('Password has been reset successfully.');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setGeneratedPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.error || 'Failed to reset password.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveEditProfile = async () => {
    if (!selectedUser?.id || modalSubmitting) return;
    try {
      setModalSubmitting(true);
      await authService.updateUserProfile(selectedUser.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        middle_name: editForm.middle_name,
        student_id: editForm.student_id,
        department_code: editForm.department_code || null,
        course_code: editForm.course_code || null,
        year_level: editForm.year_level,
        section: editForm.section,
      });
      if (Boolean(selectedUser.is_verified) !== Boolean(editForm.is_verified)) {
        await authService.setUserVerified(selectedUser.id, editForm.is_verified);
      }
      alert('Profile updated successfully.');
      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || error.message || 'Failed to update profile.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (modalSubmitting || !selectedUser) return;
    try {
      setModalSubmitting(true);
      // Toggle active status as archive/delete
      await authService.toggleUserActive(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
      alert('Failed to update user status.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleBulkArchive = async () => {
    if (modalSubmitting || !selectedUserIds.length) return;
    try {
      setModalSubmitting(true);
      for (const id of selectedUserIds) {
        await authService.toggleUserActive(id);
      }
      setShowBulkDeleteModal(false);
      setSelectedUserIds([]);
      await fetchUsers();
      alert(`Updated status for ${selectedUserIds.length} users.`);
    } catch (error) {
      console.error('Error in bulk update:', error);
      alert('Failed to update all users.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!isAdmin && !isStaff) return;
    try {
      await authService.toggleUserActive(user.id);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === user.id
            ? { ...u, user: { ...u.user, is_active: !u.user?.is_active } }
            : u
        )
      );
    } catch (error) {
      console.error('Error toggling user status:', error);
      const detail = error.response?.data?.detail || error.message || 'Failed to update user status.';
      alert(detail);
      await fetchUsers();
    }
  };

  const handleToggleVerified = async (user) => {
    if (!isAdmin && !isStaff) return;
    const nextVerified = !user.is_verified;
    try {
      await authService.setUserVerified(user.id, nextVerified);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === user.id
            ? { ...u, is_verified: nextVerified }
            : u
        )
      );
    } catch (error) {
      console.error('Error toggling verification status:', error);
      const detail = error.response?.data?.detail || error.message || 'Failed to update verification status.';
      alert(detail);
      await fetchUsers();
    }
  };

  const handleAddUserSubmit = async (e) => {

    e.preventDefault();
    if (modalSubmitting) return;
    try {
      setModalSubmitting(true);
      await authService.register({
        username: addForm.username,
        email: addForm.email,
        first_name: addForm.first_name,
        middle_name: addForm.middle_name,
        last_name: addForm.last_name,
        student_id: addForm.student_id,
        department: addForm.department_code,
        course: addForm.course_code,
        year_level: addForm.year_level,
        section: addForm.section,
        password: addForm.password,
        password_confirm: addForm.password,
      });
      alert('User added successfully.');
      setShowAddModal(false);
      setAddForm({
        username: '',
        email: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        student_id: '',
        department_code: '',
        course_code: '',
        year_level: '',
        section: '',
        role: 'student',
        password: '',
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      const data = error.response?.data;
      const msg = typeof data === 'object' ? Object.values(data).flat().join('\n') : error.message;
      alert(msg || 'Failed to add user.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  const adminCount = users.filter((u) => u.user?.is_superuser).length;
  const staffCount = users.filter((u) => u.user?.is_staff && !u.user?.is_superuser).length;
  const studentCount = users.filter((u) => !u.user?.is_staff && !u.user?.is_superuser).length;
  const verifiedCount = users.filter((u) => u.is_verified || u.user?.is_active).length;

  return (
    <Container>
      {/* 5 Top Stat Cards matching user mockup */}
      <div className="admin-users-stats-grid">
        <div
          className={`admin-users-stat-card ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="admin-users-stat-icon total">
            <Icon name="users" size={20} />
          </div>
          <div className="admin-users-stat-value">{users.length}</div>
          <div className="admin-users-stat-label">Total Users</div>
        </div>

        <div
          className={`admin-users-stat-card ${filter === 'admin' ? 'active' : ''}`}
          onClick={() => setFilter('admin')}
        >
          <div className="admin-users-stat-icon admin">
            <Icon name="shield" size={20} />
          </div>
          <div className="admin-users-stat-value">{adminCount}</div>
          <div className="admin-users-stat-label">Administrators</div>
        </div>

        <div
          className={`admin-users-stat-card ${filter === 'staff' ? 'active' : ''}`}
          onClick={() => setFilter('staff')}
        >
          <div className="admin-users-stat-icon staff">
            <Icon name="users" size={20} />
          </div>
          <div className="admin-users-stat-value">{staffCount}</div>
          <div className="admin-users-stat-label">Staff</div>
        </div>

        <div
          className={`admin-users-stat-card ${filter === 'student' ? 'active' : ''}`}
          onClick={() => setFilter('student')}
        >
          <div className="admin-users-stat-icon student">
            <Icon name="users" size={20} />
          </div>
          <div className="admin-users-stat-value">{studentCount}</div>
          <div className="admin-users-stat-label">Students</div>
        </div>

        <div
          className={`admin-users-stat-card ${filter === 'verified' ? 'active' : ''}`}
          onClick={() => setFilter('verified')}
        >
          <div className="admin-users-stat-icon verified">
            <Icon name="checkCircle" size={20} />
          </div>
          <div className="admin-users-stat-value">{verifiedCount}</div>
          <div className="admin-users-stat-label">Verified</div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="admin-users-toolbar-card" ref={dropdownRef}>
        <div className="admin-users-toolbar-left">
          {/* Search Input Pill */}
          <div className="admin-users-search-pill">
            <Icon name="search" size={16} className="admin-users-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or email..."
              className="admin-users-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-users-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Course Dropdown Pill */}
          <div className="admin-filter-dropdown-wrapper">
            <button
              type="button"
              className={`admin-filter-dropdown-btn ${advancedCourseCodes.length > 0 ? 'active' : ''}`}
              onClick={() => toggleDropdown('course')}
            >
              <div className="admin-filter-dropdown-title">
                <span>Course</span>
                <Icon name="chevronDown" size={12} />
              </div>
              <div className="admin-filter-dropdown-sub">
                {advancedCourseCodes.length > 0
                  ? `Selected: ${advancedCourseCodes.join(', ')}`
                  : 'All Courses'}
              </div>
            </button>
            {activeDropdown === 'course' && (
              <div className="admin-dropdown-popover">
                <input
                  type="search"
                  className="form-control form-control-sm mb-2"
                  placeholder="Filter courses..."
                  value={courseListSearch}
                  onChange={(e) => setCourseListSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {filteredCourseCatalog.map((c) => (
                  <label key={c.code} className="d-flex align-items-center gap-2 small cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={advancedCourseCodes.includes(c.code)}
                      onChange={() => toggleAdvancedCourse(c.code)}
                    />
                    <span>{c.code} - {c.name || ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Year Level Dropdown Pill */}
          <div className="admin-filter-dropdown-wrapper">
            <button
              type="button"
              className={`admin-filter-dropdown-btn ${advancedYearLevels.length > 0 ? 'active' : ''}`}
              onClick={() => toggleDropdown('year')}
            >
              <div className="admin-filter-dropdown-title">
                <span>Year Level</span>
                <Icon name="chevronDown" size={12} />
              </div>
              <div className="admin-filter-dropdown-sub">
                {advancedYearLevels.length > 0
                  ? `Selected: ${advancedYearLevels.join(', ')}`
                  : 'All Years'}
              </div>
            </button>
            {activeDropdown === 'year' && (
              <div className="admin-dropdown-popover">
                {uniqueYearLevels.map((yl) => (
                  <label key={yl} className="d-flex align-items-center gap-2 small cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={advancedYearLevels.includes(yl)}
                      onChange={() => toggleAdvancedYear(yl)}
                    />
                    <span>Year {yl}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Role Dropdown Pill */}
          <div className="admin-filter-dropdown-wrapper">
            <button
              type="button"
              className={`admin-filter-dropdown-btn ${advancedRoles.length > 0 ? 'active' : ''}`}
              onClick={() => toggleDropdown('role')}
            >
              <div className="admin-filter-dropdown-title">
                <span>Role</span>
                <Icon name="chevronDown" size={12} />
              </div>
              <div className="admin-filter-dropdown-sub">
                {advancedRoles.length > 0
                  ? `Selected: ${advancedRoles.map((r) => r === 'admin' ? 'Admin' : r === 'staff' ? 'Staff' : 'Student').join(', ')}`
                  : 'All Roles'}
              </div>
            </button>
            {activeDropdown === 'role' && (
              <div className="admin-dropdown-popover">
                {[
                  { key: 'student', label: 'Student' },
                  { key: 'staff', label: 'Staff' },
                  { key: 'admin', label: 'Admin' },
                ].map(({ key, label }) => (
                  <label key={key} className="d-flex align-items-center gap-2 small cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={advancedRoles.includes(key)}
                      onChange={() => toggleAdvancedRole(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Filters Button */}
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
          {isAdmin && (
            <button
              type="button"
              className="admin-btn-sync-roster"
              onClick={() => setShowSyncModal(true)}
              title="Upload and synchronize active student roster (.xlsx or .csv)"
            >
              <Icon name="upload" size={16} />
              <span>Sync Roster</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="admin-btn-add-user"
              onClick={() => setShowAddModal(true)}
            >
              <Icon name="plus" size={16} />
              <span>Add User</span>
            </button>
          )}

          <button
            type="button"
            className="admin-btn-export-csv"
            onClick={handleExportCsv}
            disabled={!filteredUsers.length}
          >
            <Icon name="download" size={16} />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`admin-btn-archive-selected ${selectedUserIds.length > 0 ? 'active' : ''}`}
              disabled={selectedUserIds.length === 0}
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Icon name="archive" size={16} />
              <span>Archive Selected</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced search panel drawer */}
      {showSearchFilters && (
        <div className="admin-search-container mb-3">
          <div className="admin-advanced-search-panel">
            <div className="admin-advanced-search-row">
              <span className="admin-advanced-search-label">Search in (text box):</span>
              <div className="admin-advanced-search-chips">
                <label className="admin-filter-chip">
                  <input
                    type="checkbox"
                    checked={searchFields.name}
                    onChange={() => setSearchFields((f) => ({ ...f, name: !f.name }))}
                  />
                  <span>Name</span>
                </label>
                <label className="admin-filter-chip">
                  <input
                    type="checkbox"
                    checked={searchFields.email}
                    onChange={() => setSearchFields((f) => ({ ...f, email: !f.email }))}
                  />
                  <span>Email</span>
                </label>
                <label className="admin-filter-chip">
                  <input
                    type="checkbox"
                    checked={searchFields.username}
                    onChange={() => setSearchFields((f) => ({ ...f, username: !f.username }))}
                  />
                  <span>Username</span>
                </label>
                <label className="admin-filter-chip">
                  <input
                    type="checkbox"
                    checked={searchFields.studentId}
                    onChange={() => setSearchFields((f) => ({ ...f, studentId: !f.studentId }))}
                  />
                  <span>ID</span>
                </label>
              </div>
            </div>

            {(advancedCourseCodes.length > 0 ||
              advancedYearLevels.length > 0 ||
              advancedRoles.length > 0) && (
              <div className="admin-advanced-search-actions mt-2">
                <button
                  type="button"
                  className="admin-btn secondary admin-btn-small"
                  onClick={() => {
                    setAdvancedCourseCodes([]);
                    setAdvancedYearLevels([]);
                    setAdvancedRoles([]);
                  }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="admin-users-table-container">
          <div className="table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <SortableHeader label="NAME" sortKey="first_name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="COURSE" sortKey="course" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="YEAR LEVEL" sortKey="year_level" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="SECTION" sortKey="section" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="ROLE" sortKey="role" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="STATUS" sortKey="status" sortConfig={sortConfig} onSort={handleSort} align="center" />
                  <SortableHeader label="VERIFIED" sortKey="verified" sortConfig={sortConfig} onSort={handleSort} align="center" />
                  <SortableHeader label="JOINED/CREATED" sortKey="joined" sortConfig={sortConfig} onSort={handleSort} />
                  <th className="text-right">ACTIONS</th>

                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  // Clean initials WITHOUT PERIOD as requested
                  const rawInitials = getInitials(`${user.user?.first_name || ''} ${user.user?.last_name || ''}`);
                  const cleanInitials = (rawInitials || 'U').replace(/\./g, '').toUpperCase();
                  const fullName = `${user.user?.first_name || ''} ${user.user?.last_name || ''}`.trim() || user.user?.username || '-';

                  return (
                    <tr key={user.id} className={isSelected ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user.id)}
                        />
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar-table">
                            {cleanInitials}
                          </div>
                          <div className="admin-user-name">
                            {fullName}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-user-id">{user.student_id || user.user?.username || '-'}</div>
                      </td>
                      <td>
                        {user.course?.code || user.course?.name || (
                          <span className="admin-user-not-specified text-muted">Not specified</span>
                        )}
                      </td>
                      <td>
                        {formatYearLevelNumeric(user.year_level) ||
                          (String(user.year_level || '').trim() ? user.year_level : '-')}
                      </td>
                      <td>
                        {user.section != null && String(user.section).trim() !== ''
                          ? user.section
                          : '-'}
                      </td>
                      
                      {/* Role Pill */}
                      <td>
                        {user.user?.is_superuser ? (
                          <span className="admin-role-badge admin-role-badge-admin">
                            <Icon name="user" size={13} />
                            Administrator
                          </span>
                        ) : user.user?.is_staff ? (
                          <span className="admin-role-badge admin-role-badge-staff">
                            <Icon name="user" size={13} />
                            Staff
                          </span>
                        ) : (
                          <span className="admin-role-badge admin-role-badge-student">
                            <Icon name="user" size={13} />
                            Student
                          </span>
                        )}
                      </td>
                      
                      {/* Status Pill (Clickable) */}
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`admin-status-badge-table ${
                            user.user?.is_active ? 'admin-status-badge-active-table' : 'admin-status-badge-inactive-table'
                          }`}
                          title={user.user?.is_active ? "Click to set Inactive" : "Click to set Active"}
                        >
                          <Icon name={user.user?.is_active ? "checkCircle" : "clock"} size={13} />
                          {user.user?.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Verified Pill (Clickable) */}
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleVerified(user)}
                          className={`admin-status-badge-table ${
                            user.is_verified ? 'admin-status-badge-active-table' : 'admin-status-badge-inactive-table'
                          }`}
                          title={user.is_verified ? "Click to revoke verification" : "Click to mark as Verified"}
                        >
                          <Icon name={user.is_verified ? "checkCircle" : "xCircle"} size={13} />
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      
                      {/* Joined/Created */}
                      <td className="admin-user-joined">

                        {formatDate(user.user?.date_joined || user.created_at, 'date')}
                      </td>
                      
                      {/* Actions: 3 Outline Buttons */}
                      <td>
                        <div className="d-flex align-items-center justify-content-end">
                          <button
                            type="button"
                            onClick={() => openEditUser(user)}
                            className="admin-action-btn-outline edit"
                            title="Edit User"
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleResetPassword(user)}
                              className="admin-action-btn-outline lock"
                              title="Reset Password"
                            >
                              <Icon name="lock" size={15} />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              className="admin-action-btn-outline delete"
                              title="Archive/Delete User"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </div>
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
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="admin-users-pagination">
              <button
                type="button"
                className="admin-users-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                &lt; Previous
              </button>

              {paginationPages.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-users-page-btn ${p === safeCurrentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  [{p}]
                </button>
              ))}

              <button
                type="button"
                className="admin-users-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card-container admin-empty-state">
          <Icon name="users" size={48} className="admin-empty-state-icon" />
          <h5 className="admin-empty-state-title">No Users Found</h5>
          <p className="admin-empty-state-message">
            {filter !== 'all' ? `No ${filter} users found.` : 'No users registered yet.'}
          </p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <Modal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New User"
        >
          <form onSubmit={handleAddUserSubmit} className="admin-edit-profile-form">
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">Username / Student ID *</label>
                <input
                  required
                  className="form-control form-control-sm"
                  value={addForm.username}
                  onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value, student_id: e.target.value }))}
                  placeholder="e.g. 2025-12345"
                />
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Email *</label>
                <input
                  required
                  type="email"
                  className="form-control form-control-sm"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@ssct.edu.ph"
                />
              </div>
            </div>

            <div className="row g-2 mb-2">
              <div className="col-md-4">
                <label className="admin-modal-label">First Name *</label>
                <input
                  required
                  className="form-control form-control-sm"
                  value={addForm.first_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="admin-modal-label">Middle Name</label>
                <input
                  className="form-control form-control-sm"
                  value={addForm.middle_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, middle_name: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="admin-modal-label">Last Name *</label>
                <input
                  required
                  className="form-control form-control-sm"
                  value={addForm.last_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">Department</label>
                <select
                  className="admin-modal-select"
                  value={addForm.department_code}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setAddForm((f) => ({ ...f, department_code: code, course_code: '' }));
                    if (code) {
                      const cr = await authService.getCoursesByDepartment(code);
                      setEditCourses(cr.data || []);
                    }
                  }}
                >
                  <option value="">—</option>
                  {editDepartments.map((d) => (
                    <option key={d.code || d.id} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Course</label>
                <select
                  className="admin-modal-select"
                  value={addForm.course_code}
                  onChange={(e) => setAddForm((f) => ({ ...f, course_code: e.target.value }))}
                >
                  <option value="">—</option>
                  {editCourses.map((c) => (
                    <option key={c.code || c.id} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">Year Level</label>
                <select
                  className="admin-modal-select"
                  value={addForm.year_level}
                  onChange={(e) => setAddForm((f) => ({ ...f, year_level: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Section</label>
                <input
                  className="form-control form-control-sm"
                  value={addForm.section}
                  onChange={(e) => setAddForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="e.g. A"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="admin-modal-label">Temporary Password *</label>
              <input
                required
                type="password"
                className="form-control form-control-sm"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>

            <div className="admin-modal-buttons">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={modalSubmitting}>
                {modalSubmitting ? 'Creating…' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && selectedUser && (
        <Modal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Edit Profile"
        >
          <div className="admin-edit-profile-form">
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">First Name</label>
                <input
                  className="form-control form-control-sm"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Last Name</label>
                <input
                  className="form-control form-control-sm"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Middle Name</label>
              <input
                className="form-control form-control-sm"
                value={editForm.middle_name}
                onChange={(e) => setEditForm((f) => ({ ...f, middle_name: e.target.value }))}
              />
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Student ID</label>
              <input
                className="form-control form-control-sm"
                value={editForm.student_id}
                onChange={(e) => setEditForm((f) => ({ ...f, student_id: e.target.value }))}
              />
            </div>
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">Department</label>
                <select
                  className="admin-modal-select"
                  value={editForm.department_code}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setEditForm((f) => ({ ...f, department_code: code, course_code: '' }));
                    if (code) {
                      const cr = await authService.getCoursesByDepartment(code);
                      setEditCourses(cr.data || []);
                    }
                  }}
                >
                  <option value="">—</option>
                  {editDepartments.map((d) => (
                    <option key={d.code || d.id} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Course</label>
                <select
                  className="admin-modal-select"
                  value={editForm.course_code}
                  onChange={(e) => setEditForm((f) => ({ ...f, course_code: e.target.value }))}
                >
                  <option value="">—</option>
                  {editCourses.map((c) => (
                    <option key={c.code || c.id} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Year Level</label>
              <select
                className="admin-modal-select"
                value={editForm.year_level}
                onChange={(e) => setEditForm((f) => ({ ...f, year_level: e.target.value }))}
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Section</label>
              <input
                className="form-control form-control-sm"
                value={editForm.section}
                onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                maxLength={50}
              />
            </div>
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="edit-is-verified"
                checked={editForm.is_verified}
                onChange={(e) => setEditForm((f) => ({ ...f, is_verified: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="edit-is-verified">
                Student verified (profile reviewed)
              </label>
            </div>
          </div>
          <div className="admin-modal-buttons">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEditProfile} disabled={modalSubmitting}>
              {modalSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <Modal
          show={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
            setGeneratedPassword('');
            setPasswordCopied(false);
          }}
          title="Reset Password"
        >
          <div>
            <p style={{ marginBottom: '1rem' }}>
              Reset password for <strong>{selectedUser?.user?.first_name} {selectedUser?.user?.last_name}</strong>
            </p>
            
            <div className="admin-modal-info-box-blue">
              <p className="admin-modal-info-text-blue" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                Generated Password:
              </p>
              <div className="admin-password-container">
                <code className="admin-password-code">
                  {generatedPassword}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    setPasswordCopied(true);
                  }}
                  className={`admin-password-copy-btn ${passwordCopied ? 'admin-password-copy-btn-success' : 'admin-password-copy-btn-primary'}`}
                  title="Copy to clipboard"
                >
                  <Icon name={passwordCopied ? 'checkCircle' : 'copy'} size={18} />
                  {passwordCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="admin-modal-buttons">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmPasswordReset}
              disabled={modalSubmitting}
            >
              {modalSubmitting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Single Archive/Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          show={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          title="Toggle User Status"
        >
          <p>
            Are you sure you want to {selectedUser?.user?.is_active ? 'deactivate/archive' : 'reactivate'} <strong>{selectedUser?.user?.first_name} {selectedUser?.user?.last_name}</strong>?
          </p>
          
          <div className="admin-modal-buttons">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteUser}
              disabled={modalSubmitting}
            >
              {modalSubmitting ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Bulk Archive Modal */}
      {showBulkDeleteModal && (
        <Modal
          show={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          title="Archive Selected Users"
        >
          <p>
            Are you sure you want to archive / toggle active status for <strong>{selectedUserIds.length}</strong> selected users?
          </p>
          
          <div className="admin-modal-buttons">
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkArchive}
              disabled={modalSubmitting}
            >
              {modalSubmitting ? 'Archiving...' : 'Archive Selected'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Student Roster Sync Modal */}
      {showSyncModal && (
        <RosterSyncModal
          show={showSyncModal}
          isOpen={showSyncModal}
          onHide={() => setShowSyncModal(false)}
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}

    </Container>

  );
};

export default UserManagementPage;
