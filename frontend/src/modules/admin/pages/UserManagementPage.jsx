/**
 * UserManagementPage
 * View and manage all users in table format
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Modal, Button } from '../../../components/common';
import { authService } from '../../../services';
import { getInitials } from '../../../utils/helpers';
import { formatDate } from '../../../utils/formatters';
import '../../../assets/styles/admin.css';

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
  };

  return icons[name] || null;
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, admin, student, verified
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filter, users, searchQuery]);

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
      filtered = filtered.filter(u => u.is_staff || u.is_superuser);
    } else if (filter === 'student') {
      filtered = filtered.filter(u => !u.is_staff && !u.is_superuser);
    } else if (filter === 'verified') {
      filtered = filtered.filter(u => u.email_verified || u.is_active);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.student_id && u.student_id.toLowerCase().includes(query))
      );
    }
    
    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (user) => {
    // TODO: Implement toggle active status
    console.log('Toggle active for user:', user.id);
  };

  const handleMakeAdmin = async (user) => {
    // TODO: Implement make admin
    console.log('Make admin:', user.id);
  };

  const handleDeleteUser = async () => {
    // TODO: Implement delete user
    console.log('Delete user:', selectedUser?.id);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  const adminCount = users.filter(u => u.is_staff || u.is_superuser).length;
  const studentCount = users.filter(u => !u.is_staff && !u.is_superuser).length;
  const verifiedCount = users.filter(u => u.email_verified || u.is_active).length;

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <h1>
          <Icon name="users" size={28} style={{ color: '#2563eb' }} />
          User Management
        </h1>
        <p>View and manage all registered users</p>
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
          className={`admin-filter-btn ${filter === 'all' ? 'active' : ''}`}
          style={{
            background: filter === 'all' ? '#2563eb' : 'white',
            color: filter === 'all' ? 'white' : '#374151',
            borderColor: filter === 'all' ? '#2563eb' : '#d1d5db'
          }}
        >
          <Icon name="users" size={16} />
          All Users ({users.length})
        </button>
        <button
          onClick={() => setFilter('admin')}
          className={`admin-filter-btn ${filter === 'admin' ? 'active' : ''}`}
          style={{
            background: filter === 'admin' ? '#eab308' : 'white',
            color: filter === 'admin' ? '#1f2937' : '#374151',
            borderColor: filter === 'admin' ? '#eab308' : '#d1d5db'
          }}
        >
          <Icon name="shield" size={16} />
          Admins ({adminCount})
        </button>
        <button
          onClick={() => setFilter('student')}
          className={`admin-filter-btn ${filter === 'student' ? 'active' : ''}`}
          style={{
            background: filter === 'student' ? '#2563eb' : 'white',
            color: filter === 'student' ? 'white' : '#374151',
            borderColor: filter === 'student' ? '#2563eb' : '#d1d5db'
          }}
        >
          <Icon name="users" size={16} />
          Students ({studentCount})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`admin-filter-btn ${filter === 'verified' ? 'active' : ''}`}
          style={{
            background: filter === 'verified' ? '#22c55e' : 'white',
            color: filter === 'verified' ? 'white' : '#374151',
            borderColor: filter === 'verified' ? '#22c55e' : '#d1d5db'
          }}
        >
          <Icon name="checkCircle" size={16} />
          Verified ({verifiedCount})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <input
          type="text"
          placeholder="Search by name, email, or student ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Contact</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Academic Info</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Joined</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id} style={{
                    borderBottom: index < filteredUsers.length - 1 ? '1px solid #e5e7eb' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    {/* User */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          {getInitials(`${user.first_name} ${user.last_name}`)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {user.student_id || user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: '#374151' }}>{user.email}</div>
                      {user.phone_number && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {user.phone_number}
                        </div>
                      )}
                    </td>
                    
                    {/* Academic Info */}
                    <td style={{ padding: '1rem' }}>
                      {user.course ? (
                        <>
                          <div style={{ color: '#374151' }}>{user.course}</div>
                          {user.year_level && (
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              Year {user.year_level}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Not specified</span>
                      )}
                    </td>
                    
                    {/* Role */}
                    <td style={{ padding: '1rem' }}>
                      {user.is_staff || user.is_superuser ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#b45309',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          <Icon name="shield" size={14} />
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(37, 99, 235, 0.15)',
                          color: '#1e40af',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          <Icon name="users" size={14} />
                          Student
                        </span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {user.is_active ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#166534',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          <Icon name="checkCircle" size={14} />
                          Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(107, 114, 128, 0.15)',
                          color: '#374151',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          <Icon name="clock" size={14} />
                          Inactive
                        </span>
                      )}
                    </td>
                    
                    {/* Joined */}
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                      {formatDate(user.date_joined, 'date')}
                    </td>
                    
                    {/* Actions */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleToggleActive(user)}
                          style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            color: user.is_active ? '#ef4444' : '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Icon name={user.is_active ? 'toggleRight' : 'toggleLeft'} size={18} />
                        </button>
                        
                        {!(user.is_staff || user.is_superuser) && (
                          <button
                            onClick={() => handleMakeAdmin(user)}
                            style={{
                              padding: '0.5rem',
                              background: 'transparent',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              color: '#eab308',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Make Admin"
                          >
                            <Icon name="shield" size={18} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete User"
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          textAlign: 'center',
          padding: '3rem 2rem'
        }}>
          <Icon name="users" size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No Users Found
          </h5>
          <p style={{ color: '#6b7280' }}>
            {filter !== 'all' ? `No ${filter} users found.` : 'No users registered yet.'}
          </p>
        </div>
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
          <p>Are you sure you want to delete <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?</p>
          <p style={{ color: '#ef4444', marginTop: '1rem' }}>This action cannot be undone.</p>
          
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
            >
              Delete User
            </Button>
          </div>
        </Modal>
      )}
    </Container>
  );
};

export default UserManagementPage;
