/**
 * UserManagementPage
 * View and manage all users in table format
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Modal, Button } from '../../../components/common';
import { authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { getInitials, parseYearLevelNumber, formatYearLevelNumeric, coerceYearLevelToFormValue } from '../../../utils/helpers';
import { formatDate } from '../../../utils/formatters';
import '../admin.css';

// SVG Icon Component
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
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    mail: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
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
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    ),
    toggleLeft: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="1" y="5" width="22" height="14" rx="7" ry="7"/>
        <circle cx="8" cy="12" r="3"/>
      </svg>
    ),
    toggleRight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="1" y="5" width="22" height="14" rx="7" ry="7"/>
        <circle cx="16" cy="12" r="3"/>
      </svg>
    ),
    key: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    ),
    copy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
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

const getUserRoleLabel = (u) => {
  if (u.user?.is_superuser) return 'Admin';
  if (u.user?.is_staff) return 'Staff';
  return 'Student';
};

const UserManagementPage = () => {
  const { isAdmin, isStaffOrAdmin, user: authUser } = useAuth();
  const isStaffOnly = isStaffOrAdmin && !isAdmin;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, admin, staff, student, verified
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionUserId, setActionUserId] = useState(null); // prevent rapid repeat actions per user
  const [modalSubmitting, setModalSubmitting] = useState(false); // prevent double-submit in modals
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    email: true,
    username: true,
    studentId: true,
  });
  /** Multi-select filters (empty = no restriction on that axis). */
  const [courseCatalog, setCourseCatalog] = useState([]);
  const [courseListSearch, setCourseListSearch] = useState('');
  const [advancedCourseCodes, setAdvancedCourseCodes] = useState([]);
  const [advancedYearLevels, setAdvancedYearLevels] = useState([]);
  const [advancedRoles, setAdvancedRoles] = useState([]);
  const [pageSize, setPageSize] = useState(20); // 20 | 50 | Infinity (All)
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers();
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

  const uniqueYearLevels = useMemo(() => {
    const s = new Set();
    users.forEach((u) => {
      const n = formatYearLevelNumeric(u.year_level);
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) => {
      const na = parseYearLevelNumber(a) ?? 999;
      const nb = parseYearLevelNumber(b) ?? 999;
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });
  }, [users]);

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
    if (!showEditModal || !selectedUser) return;
    let cancelled = false;
    (async () => {
      try {
        const [deptRes] = await Promise.all([authService.getDepartments()]);
        if (cancelled) return;
        setEditDepartments(deptRes.data || []);
        const dept = selectedUser.department?.code || '';
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
  }, [showEditModal, selectedUser]);

  useEffect(() => {
    filterUsers();
  }, [filter, users, searchQuery, searchFields, advancedCourseCodes, advancedYearLevels, advancedRoles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, pageSize, advancedCourseCodes, advancedYearLevels, advancedRoles]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredUsers.length / (Number.isFinite(pageSize) ? pageSize : filteredUsers.length || 1))
    );
    if (currentPage > totalPages) setCurrentPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUsers.length, pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Use getAllProfiles endpoint
      const response = await authService.getAllProfiles();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // For demo, set empty array
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    
    // Apply type filter
    if (filter === 'admin') {
      filtered = filtered.filter(u => u.user?.is_superuser);
    } else if (filter === 'staff') {
      filtered = filtered.filter(u => u.user?.is_staff && !u.user?.is_superuser);
    } else if (filter === 'student') {
      filtered = filtered.filter(u => !u.user?.is_staff && !u.user?.is_superuser);
    } else if (filter === 'verified') {
      filtered = filtered.filter(u => u.is_verified || u.user?.is_active);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const activeFields = searchFields;
      filtered = filtered.filter((u) => {
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

        return values.some((val) => val && val.includes(query));
      });
    }

    if (advancedCourseCodes.length > 0) {
      filtered = filtered.filter(
        (u) => u.course?.code && advancedCourseCodes.includes(u.course.code)
      );
    }
    if (advancedYearLevels.length > 0) {
      filtered = filtered.filter((u) => {
        const yn = formatYearLevelNumeric(u.year_level);
        return yn && advancedYearLevels.includes(yn);
      });
    }
    if (advancedRoles.length > 0) {
      filtered = filtered.filter((u) => advancedRoles.includes(getUserRoleKey(u)));
    }

    setFilteredUsers(filtered);
  };

  const toggleSearchField = (field) => {
    setSearchFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
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

  const clearAdvancedAttributeFilters = () => {
    setAdvancedCourseCodes([]);
    setAdvancedYearLevels([]);
    setAdvancedRoles([]);
    setCourseListSearch('');
  };

  const totalRows = filteredUsers.length;
  const effectivePageSize = Number.isFinite(pageSize) ? pageSize : totalRows || 1;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndexExclusive = Math.min(startIndex + effectivePageSize, totalRows);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndexExclusive);

  const handleExportCsv = () => {
    const toExport = Number.isFinite(pageSize) ? paginatedUsers : filteredUsers;
    if (!toExport.length) return;

    const headers = [
      'First Name',
      'Middle Name',
      'Last Name',
      'Student ID',
      'Username',
      'Email',
      'College',
      'Course',
      'Year Level',
      'Section',
      'Role',
      'Active',
      'Verified',
      'Joined',
    ];
    const lines = [headers.join(',')];

    toExport.forEach((u) => {
      const course = u.course?.name || u.course?.code || '';
      const college = u.department?.name || u.department?.code || '';
      const yearDisplay =
        formatYearLevelNumeric(u.year_level) ||
        (String(u.year_level || '').trim() ? String(u.year_level) : '');
      lines.push(
        [
          csvEscape(u.user?.first_name || ''),
          csvEscape(u.middle_name || ''),
          csvEscape(u.user?.last_name || ''),
          csvEscape(u.student_id || ''),
          csvEscape(u.user?.username || ''),
          csvEscape(u.user?.email || ''),
          csvEscape(college),
          csvEscape(course),
          csvEscape(yearDisplay),
          csvEscape(u.section != null ? String(u.section) : ''),
          csvEscape(getUserRoleLabel(u)),
          csvEscape(u.user?.is_active ? 'Yes' : 'No'),
          csvEscape(u.is_verified ? 'Yes' : 'No'),
          csvEscape(formatDate(u.user?.date_joined || u.created_at, 'date')),
        ].join(',')
      );
    });

    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const scopeLabel = Number.isFinite(pageSize)
      ? `page${safeCurrentPage}_of${totalPages}`
      : 'all_filtered';
    const filterSlug = String(filter || 'all').replace(/[^\w-]+/g, '_');
    a.href = url;
    a.download = `users_${filterSlug}_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate random password: 8 characters with lower, upper, and numbers
  // Simple format for easy copying and remembering
  const generatePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let password = '';
    
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    
    // Fill the rest randomly (total 8 chars)
    const allChars = lowercase + uppercase + numbers;
    for (let i = 3; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleToggleActive = async (user) => {
    if (actionUserId === user.id) {
      // Ignore rapid repeat clicks for the same user
      return;
    }
    try {
      setActionUserId(user.id);
      const response = await authService.toggleUserActive(user.id);
      
      // Update the user in the local state immediately
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === user.id 
          ? { 
              ...u, 
              user: { 
                ...u.user, 
                is_active: !u.user.is_active 
              } 
            }
          : u
      ));
      
      console.log(response.data.message);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to toggle user status. Please try again.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleResetPassword = (user) => {
    if (!user || !user.id) {
      alert('Error: Invalid user selected. Please try again.');
      return;
    }
    setSelectedUser(user);
    const newPassword = generatePassword();
    if (!newPassword || newPassword.length < 8) {
      alert('Error: Failed to generate a valid password. Please try again.');
      return;
    }
    setGeneratedPassword(newPassword);
    setPasswordCopied(false);
    setShowPasswordModal(true);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  const handleConfirmPasswordReset = async () => {
    if (modalSubmitting) return;
    if (!selectedUser || !selectedUser.id) {
      alert('Error: User information is missing. Please try again.');
      return;
    }
    try {
      setModalSubmitting(true);
      await authService.resetUserPassword(selectedUser.id, generatedPassword);
      
      console.log('Password reset successfully');
      alert(`Password reset successfully for ${selectedUser.user?.first_name} ${selectedUser.user?.last_name}. Make sure to share the password securely.`);
      
      // Close modal
      setShowPasswordModal(false);
      setSelectedUser(null);
      setGeneratedPassword('');
      setPasswordCopied(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Failed to reset password. Please try again.';
      alert(`Failed to reset password: ${errorMessage}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditUser = (u) => {
    setSelectedUser(u);
    setEditForm({
      first_name: u.user?.first_name || '',
      last_name: u.user?.last_name || '',
      middle_name: u.middle_name || '',
      student_id: u.student_id || '',
      department_code: u.department?.code || '',
      course_code: u.course?.code || '',
      year_level: coerceYearLevelToFormValue(u.year_level),
      section: u.section != null ? String(u.section) : '',
      is_verified: !!u.is_verified,
    });
    setShowEditModal(true);
  };

  const handleEditDepartmentChange = async (e) => {
    const code = e.target.value;
    setEditForm((prev) => ({ ...prev, department_code: code, course_code: '' }));
    if (code) {
      try {
        const cr = await authService.getCoursesByDepartment(code);
        setEditCourses(cr.data || []);
      } catch (err) {
        console.error(err);
        setEditCourses([]);
      }
    } else {
      setEditCourses([]);
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
        is_verified: editForm.is_verified,
      });
      alert('Profile updated successfully.');
      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error(error);
      const d = error.response?.data;
      let msg = d?.detail;
      if (!msg && typeof d === 'object') {
        const first = Object.values(d)[0];
        msg = Array.isArray(first) ? first[0] : first;
      }
      alert(msg || error.message || 'Failed to update profile.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (modalSubmitting) return;
    try {
      setModalSubmitting(true);
      // TODO: Implement API call to delete user
      console.log('Delete user:', selectedUser?.id);
      
      setShowDeleteModal(false);
      setSelectedUser(null);
      
      // Refresh users after deletion
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  const adminCount = users.filter(u => u.user?.is_superuser).length;
  const staffCount = users.filter(u => u.user?.is_staff && !u.user?.is_superuser).length;
  const studentCount = users.filter(u => !u.user?.is_staff && !u.user?.is_superuser).length;
  const verifiedCount = users.filter(u => u.is_verified || u.user?.is_active).length;

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <h1>
          <Icon name="users" size={28} className="admin-icon-primary" />
          User Management
        </h1>
        <p>View and manage all registered users</p>
        {isStaffOnly && (
          <p className="admin-header-note text-muted small mt-2 mb-0">
            As staff, you can edit profile details and student verification/active status only for students whose
            year level is at or below your own (
              {formatYearLevelNumeric(authUser?.profile?.year_level) ||
                authUser?.profile?.year_level ||
                'set your year level in Profile'}
            ).
            Administrators and other staff accounts are not editable here.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="users" size={24} />
          </div>
          <div className="admin-stat-value">{users.length}</div>
          <div className="admin-stat-label">Total Users</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon warning">
            <Icon name="shield" size={24} />
          </div>
          <div className="admin-stat-value">{adminCount}</div>
          <div className="admin-stat-label">Administrators</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon info">
            <Icon name="users" size={24} />
          </div>
          <div className="admin-stat-value">{staffCount}</div>
          <div className="admin-stat-label">Staff</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="users" size={24} />
          </div>
          <div className="admin-stat-value">{studentCount}</div>
          <div className="admin-stat-label">Students</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Icon name="checkCircle" size={24} />
          </div>
          <div className="admin-stat-value">{verifiedCount}</div>
          <div className="admin-stat-label">Verified</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        <button
          onClick={() => setFilter('all')}
          className={`admin-filter-btn ${filter === 'all' ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive-default'}`}
        >
          <Icon name="users" size={16} />
          All Users ({users.length})
        </button>
        <button
          onClick={() => setFilter('admin')}
          className={`admin-filter-btn ${filter === 'admin' ? 'admin-filter-btn-admin' : 'admin-filter-btn-inactive-default'}`}
        >
          <Icon name="shield" size={16} />
          Admins ({adminCount})
        </button>
        <button
          onClick={() => setFilter('staff')}
          className={`admin-filter-btn ${filter === 'staff' ? 'admin-filter-btn-staff' : 'admin-filter-btn-inactive-default'}`}
        >
          <Icon name="users" size={16} />
          Staff ({staffCount})
        </button>
        <button
          onClick={() => setFilter('student')}
          className={`admin-filter-btn ${filter === 'student' ? 'admin-filter-btn-student' : 'admin-filter-btn-inactive-default'}`}
        >
          <Icon name="users" size={16} />
          Students ({studentCount})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`admin-filter-btn ${filter === 'verified' ? 'admin-filter-btn-verified' : 'admin-filter-btn-inactive-default'}`}
        >
          <Icon name="checkCircle" size={16} />
          Verified ({verifiedCount})
        </button>
      </div>

      {/* Search Bar */}
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
            <input
              type="text"
              placeholder="Search by name, email, username, or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            disabled={!filteredUsers.length}
            title={
              Number.isFinite(pageSize)
                ? `Export current page (${paginatedUsers.length} rows) as CSV`
                : `Export all filtered rows (${filteredUsers.length}) as CSV`
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
                  value={courseListSearch}
                  onChange={(e) => setCourseListSearch(e.target.value)}
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
                        {advancedCourseCodes.length > 0 && (
                          <> · {advancedCourseCodes.length} selected</>
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
                          const checked = advancedCourseCodes.includes(code);
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
                  <span className="text-muted small">No year levels in current user list</span>
                ) : (
                  uniqueYearLevels.map((yl) => {
                    const checked = advancedYearLevels.includes(yl);
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

            <div className="admin-advanced-search-row">
              <span className="admin-advanced-search-label">Role:</span>
              <div className="admin-advanced-search-chips">
                {[
                  { key: 'student', label: 'Student' },
                  { key: 'staff', label: 'Staff' },
                  { key: 'admin', label: 'Admin' },
                ].map(({ key, label }) => {
                  const checked = advancedRoles.includes(key);
                  return (
                    <label key={key} className={`admin-filter-chip ${checked ? 'admin-filter-chip-active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdvancedRole(key)}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {(advancedCourseCodes.length > 0 ||
              advancedYearLevels.length > 0 ||
              advancedRoles.length > 0) && (
              <div className="admin-advanced-search-actions">
                <button type="button" className="admin-btn secondary admin-btn-small" onClick={clearAdvancedAttributeFilters}>
                  Clear course / year / role filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
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
                  <th>Section</th>
                  <th>Role</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Joined/Created</th>
                  {(isAdmin || isStaffOnly) && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar-table">
                          {getInitials(`${user.user?.first_name || ''} ${user.user?.last_name || ''}`)}
                        </div>
                        <div>
                          <div className="admin-user-name">
                            {user.user?.first_name || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.middle_name || '-'}
                    </td>
                    <td>
                      {user.user?.last_name || '-'}
                    </td>
                    <td>
                      <div className="admin-user-id">
                        {user.student_id || user.user?.username || '-'}
                      </div>
                    </td>
                    <td>
                      {user.course?.code || user.course?.name || (
                        <span className="admin-user-not-specified">Not specified</span>
                      )}
                    </td>
                    <td>
                      {formatYearLevelNumeric(user.year_level) ||
                        (String(user.year_level || '').trim() ? user.year_level : '-')}
                    </td>
                    <td>
                      {user.section != null && String(user.section).trim() !== ''
                        ? user.section
                        : '—'}
                    </td>
                    
                    {/* Role */}
                    <td>
                      {user.user?.is_superuser ? (
                        <span className="admin-role-badge admin-role-badge-admin">
                          <Icon name="shield" size={14} />
                          Admin
                        </span>
                      ) : user.user?.is_staff ? (
                        <span className="admin-role-badge admin-role-badge-staff">
                          <Icon name="users" size={14} />
                          Staff
                        </span>
                      ) : (
                        <span className="admin-role-badge admin-role-badge-student">
                          <Icon name="users" size={14} />
                          Student
                        </span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="text-center">
                      {user.user?.is_active ? (
                        <span className="admin-status-badge-table admin-status-badge-active-table">
                          <Icon name="checkCircle" size={14} />
                          Active
                        </span>
                      ) : (
                        <span className="admin-status-badge-table admin-status-badge-inactive-table">
                          <Icon name="clock" size={14} />
                          Inactive
                        </span>
                      )}
                    </td>
                    
                    {/* Joined/Created */}
                    <td className="text-center admin-user-joined">
                      {formatDate(user.user?.date_joined || user.created_at, 'date')}
                    </td>
                    
                    {/* Actions: admin full set; staff edit + active toggle for in-scope students only */}
                    {(isAdmin || isStaffOnly) && (
                      <td>
                        <div className="admin-user-actions">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditUser(user)}
                                disabled={actionUserId === user.id}
                                className="admin-action-btn admin-action-btn-role"
                                title="Edit profile"
                              >
                                <Icon name="edit" size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(user)}
                                disabled={actionUserId === user.id}
                                className={`admin-action-btn ${user.user?.is_active ? 'admin-action-btn-toggle-active' : 'admin-action-btn-toggle-inactive'}`}
                                title={user.user?.is_active ? 'Deactivate User' : 'Activate User'}
                              >
                                <Icon name={user.user?.is_active ? 'toggleRight' : 'toggleLeft'} size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.user?.is_superuser ? 'admin' : (user.user?.is_staff ? 'staff' : 'student'));
                                  setShowRoleModal(true);
                                }}
                                disabled={actionUserId === user.id}
                                className="admin-action-btn admin-action-btn-role"
                                title="Change Role"
                              >
                                <Icon name="shield" size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetPassword(user)}
                                disabled={actionUserId === user.id}
                                className="admin-action-btn admin-action-btn-password"
                                title="Reset Password"
                              >
                                <Icon name="key" size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                                disabled={actionUserId === user.id}
                                className="admin-action-btn admin-action-btn-delete"
                                title="Delete User"
                              >
                                <Icon name="trash" size={18} />
                              </button>
                            </>
                          )}
                          {isStaffOnly &&
                            (canStaffManageStudent(authUser?.profile, user) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditUser(user)}
                                  disabled={actionUserId === user.id}
                                  className="admin-action-btn admin-action-btn-role"
                                  title="Edit profile"
                                >
                                  <Icon name="edit" size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(user)}
                                  disabled={actionUserId === user.id}
                                  className={`admin-action-btn ${user.user?.is_active ? 'admin-action-btn-toggle-active' : 'admin-action-btn-toggle-inactive'}`}
                                  title={user.user?.is_active ? 'Deactivate User' : 'Activate User'}
                                >
                                  <Icon name={user.user?.is_active ? 'toggleRight' : 'toggleLeft'} size={18} />
                                </button>
                              </>
                            ) : (
                              <span className="text-muted small" title="Outside your year-level scope">
                                —
                              </span>
                            ))}
                        </div>
                      </td>
                    )}
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                Prev
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-small"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Next
              </button>

              <div className="admin-pagination-view">
                <label className="admin-pagination-view-label">View</label>
                <select
                  className="admin-pagination-view-select"
                  value={Number.isFinite(pageSize) ? String(pageSize) : 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all') setPageSize(Infinity);
                    else setPageSize(Number(value));
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
          <Icon name="users" size={48} className="admin-empty-state-icon" />
          <h5 className="admin-empty-state-title">
            No Users Found
          </h5>
          <p className="admin-empty-state-message">
            {filter !== 'all' ? `No ${filter} users found.` : 'No users registered yet.'}
          </p>
        </div>
      )}

      {/* Edit profile (staff scoped / admin full) */}
      {showEditModal && selectedUser && (
        <Modal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Edit profile"
        >
          <div className="admin-edit-profile-form">
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="admin-modal-label">First name</label>
                <input
                  className="form-control form-control-sm"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="admin-modal-label">Last name</label>
                <input
                  className="form-control form-control-sm"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Middle name</label>
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
                  onChange={handleEditDepartmentChange}
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
              <label className="admin-modal-label">Year level</label>
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
                <option value="5">5</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="admin-modal-label">Section</label>
              <input
                className="form-control form-control-sm"
                value={editForm.section}
                onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                maxLength={50}
                placeholder="e.g. A, B"
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
                  onClick={handleCopyPassword}
                  className={`admin-password-copy-btn ${passwordCopied ? 'admin-password-copy-btn-success' : 'admin-password-copy-btn-primary'}`}
                  title="Copy to clipboard"
                >
                  <Icon name={passwordCopied ? 'checkCircle' : 'copy'} size={18} />
                  {passwordCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="admin-modal-warning-box">
              <p className="admin-modal-warning-text">
                <strong>⚠️ Important:</strong> Make sure to copy this password and share it securely with the user. 
                This password will only be shown once and follows the format:
              </p>
              <ul className="admin-modal-warning-list">
                <li>8 characters long</li>
                <li>Contains lowercase letters (a-z)</li>
                <li>Contains uppercase letters (A-Z)</li>
                <li>Contains numbers (0-9)</li>
              </ul>
            </div>
          </div>
          
          <div className="admin-modal-buttons">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedUser(null);
                setGeneratedPassword('');
                setPasswordCopied(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmPasswordReset}
              disabled={modalSubmitting || !generatedPassword || generatedPassword.length < 8}
            >
              {modalSubmitting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Role Management Modal */}
      {showRoleModal && (
        <Modal
          show={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
            setSelectedRole('');
          }}
          title="Change User Role"
        >
          <div>
            <p style={{ marginBottom: '1rem' }}>
              Change role for <strong>{selectedUser?.user?.first_name} {selectedUser?.user?.last_name}</strong>
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="admin-modal-label">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="admin-modal-select"
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="admin-modal-info-box-blue">
              <p className="admin-modal-info-text-blue">
                <strong>Role Permissions:</strong><br />
                <strong>Student:</strong> Can vote and apply as candidate<br />
                <strong>Staff:</strong> Can manage elections, applications, and view results<br />
                <strong>Admin:</strong> Full system access including user management
              </p>
            </div>
          </div>
          
          <div className="admin-modal-buttons">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
                setSelectedRole('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              disabled={modalSubmitting}
              onClick={async () => {
                if (modalSubmitting) return;
                try {
                  setModalSubmitting(true);
                  await authService.updateUserRole(selectedUser.id, selectedRole);
                  alert(`User role updated to ${selectedRole} successfully`);
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRole('');
                  await fetchUsers();
                } catch (error) {
                  console.error('Error updating role:', error);
                  alert(error.response?.data?.error || 'Failed to update role. Please try again.');
                } finally {
                  setModalSubmitting(false);
                }
              }}
            >
              {modalSubmitting ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          show={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          title="Delete User"
        >
          <p>Are you sure you want to delete <strong>{selectedUser?.user?.first_name} {selectedUser?.user?.last_name}</strong>?</p>
          <p className="admin-modal-danger-text">This action cannot be undone.</p>
          
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
              {modalSubmitting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </Modal>
      )}
    </Container>
  );
};

export default UserManagementPage;
