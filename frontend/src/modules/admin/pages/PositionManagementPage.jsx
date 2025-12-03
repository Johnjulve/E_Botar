/**
 * PositionManagementPage
 * Manage election positions (CRUD operations with reordering)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { electionService } from '../../../services';
import '../../../assets/styles/admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    briefcase: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
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
    arrowUp: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="19" x2="12" y2="5"/>
        <polyline points="5 12 12 5 19 12"/>
      </svg>
    ),
    arrowDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"/>
        <polyline points="19 12 12 19 5 12"/>
      </svg>
    ),
    x: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const PositionManagementPage = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    max_candidates: 1,
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPositions();
  }, [filter]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await electionService.getAllPositions();
      let allPositions = response.data || [];
      
      // Sort by display_order
      allPositions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Apply filter
      if (filter === 'active') {
        allPositions = allPositions.filter(p => p.is_active);
      } else if (filter === 'inactive') {
        allPositions = allPositions.filter(p => !p.is_active);
      }
      
      setPositions(allPositions);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) {
      return;
    }
    setErrors({});

    try {
      // Validate
      if (!formData.name.trim()) {
        setErrors({ name: 'Name is required' });
        return;
      }

      setSaving(true);

      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        display_order: formData.display_order || 0,
        max_candidates: formData.max_candidates || 1,
        is_active: formData.is_active
      };

      if (editingPosition) {
        await electionService.updatePosition(editingPosition.id, submitData);
      } else {
        await electionService.createPosition(submitData);
      }

      // Reset form and refresh
      resetForm();
      fetchPositions();
    } catch (error) {
      console.error('Error saving position:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'An error occurred while saving the position' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || '',
      display_order: position.display_order || 0,
      max_candidates: position.max_candidates || 1,
      is_active: position.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this position? This action cannot be undone. Positions used in elections cannot be deleted.')) {
      return;
    }

    try {
      await electionService.deletePosition(id);
      fetchPositions();
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Error deleting position. It may be in use by elections.');
    }
  };

  const handleMoveUp = async (position) => {
    if (position.display_order <= 0) return;
    
    try {
      await electionService.updatePosition(position.id, {
        ...position,
        display_order: position.display_order - 1
      });
      fetchPositions();
    } catch (error) {
      console.error('Error moving position up:', error);
    }
  };

  const handleMoveDown = async (position) => {
    try {
      await electionService.updatePosition(position.id, {
        ...position,
        display_order: (position.display_order || 0) + 1
      });
      fetchPositions();
    } catch (error) {
      console.error('Error moving position down:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      display_order: 0,
      max_candidates: 1,
      is_active: true
    });
    setEditingPosition(null);
    setShowForm(false);
    setErrors({});
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading positions..." />;
  }

  const filterButtons = [
    { key: 'all', label: 'All Positions' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' }
  ];

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h1>
              <Icon name="briefcase" size={28} style={{ color: '#2563eb' }} />
              Position Management
            </h1>
            <p>Manage election positions</p>
          </div>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setShowForm(!showForm)}
              className="admin-btn primary"
            >
              <Icon name={showForm ? 'x' : 'plus'} size={16} />
              {showForm ? 'Cancel' : 'Add Position'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h5 style={{
            marginBottom: '1rem',
            color: '#1f2937',
            fontWeight: 600
          }}>
            {editingPosition ? 'Edit Position' : 'Add New Position'}
          </h5>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${errors.name ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
                {errors.name && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Max Candidates
                </label>
                <input
                  type="number"
                  name="max_candidates"
                  value={formData.max_candidates}
                  onChange={handleInputChange}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  id="is_active"
                />
                <label htmlFor="is_active" style={{
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  Active
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {errors.general && (
              <div style={{
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {errors.general}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={resetForm}
                className="admin-btn secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-btn primary"
                disabled={saving}
              >
                <Icon name="check" size={16} />
                {saving ? (editingPosition ? 'Updating...' : 'Creating...') : (editingPosition ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`admin-filter-btn ${filter === btn.key ? 'active' : ''}`}
            style={{
              background: filter === btn.key ? '#2563eb' : 'white',
              color: filter === btn.key ? 'white' : '#374151',
              borderColor: filter === btn.key ? '#2563eb' : '#d1d5db'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Positions Table */}
      {positions.length > 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          overflow: 'hidden'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead style={{
              background: '#f9fafb',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <tr>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  width: '60px'
                }}>Order</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Name</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Max Candidates</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Description</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Status</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={position.id} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    {position.display_order || index}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    fontWeight: 500
                  }}>
                    {position.name}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {position.max_candidates || 1}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {position.description || '-'}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: position.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: position.is_active ? '#166534' : '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {position.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{
                    padding: '1rem',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => handleMoveUp(position)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem'
                        }}
                        title="Move Up"
                      >
                        <Icon name="arrowUp" size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(position)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem'
                        }}
                        title="Move Down"
                      >
                        <Icon name="arrowDown" size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(position)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(position.id)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          color: '#dc2626'
                        }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          textAlign: 'center',
          padding: '3rem 2rem'
        }}>
          <Icon name="briefcase" size={48} style={{
            color: '#d1d5db',
            marginBottom: '1rem',
            display: 'block'
          }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No Positions Found
          </h5>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            {filter !== 'all' ? `No ${filter} positions found.` : 'Get started by adding your first position.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="admin-btn primary"
          >
            <Icon name="plus" size={16} />
            Add Position
          </button>
        </div>
      )}
    </Container>
  );
};

export default PositionManagementPage;

