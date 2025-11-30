/**
 * PartyManagementPage
 * Manage political parties (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { electionService } from '../../../services';
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

const PartyManagementPage = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2563eb',
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchParties();
  }, [filter]);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await electionService.getAllParties();
      let allParties = response.data || [];
      
      // Apply filter
      if (filter === 'active') {
        allParties = allParties.filter(p => p.is_active);
      } else if (filter === 'inactive') {
        allParties = allParties.filter(p => !p.is_active);
      }
      
      setParties(allParties);
    } catch (error) {
      console.error('Error fetching parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
        color: formData.color,
        is_active: formData.is_active
      };

      if (editingParty) {
        await electionService.updateParty(editingParty.id, submitData);
      } else {
        await electionService.createParty(submitData);
      }

      // Reset form and refresh
      resetForm();
      fetchParties();
    } catch (error) {
      console.error('Error saving party:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'An error occurred while saving the party' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      description: party.description || '',
      color: party.color || '#2563eb',
      is_active: party.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this party? This action cannot be undone.')) {
      return;
    }

    try {
      await electionService.deleteParty(id);
      fetchParties();
    } catch (error) {
      console.error('Error deleting party:', error);
      alert('Error deleting party. It may be in use by candidates.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#2563eb',
      is_active: true
    });
    setEditingParty(null);
    setShowForm(false);
    setErrors({});
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading parties..." />;
  }

  const filterButtons = [
    { key: 'all', label: 'All Parties' },
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
              <Icon name="users" size={28} style={{ color: '#2563eb' }} />
              Party Management
            </h1>
            <p>Manage political parties</p>
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
              {showForm ? 'Cancel' : 'Add Party'}
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
            {editingParty ? 'Edit Party' : 'Add New Party'}
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
                  Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="#2563eb"
                  />
                </div>
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
                {saving ? (editingParty ? 'Updating...' : 'Creating...') : (editingParty ? 'Update' : 'Create')}
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

      {/* Parties Table */}
      {parties.length > 0 ? (
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
                  color: '#374151'
                }}>Name</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Color</th>
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
              {parties.map(party => (
                <tr key={party.id} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    fontWeight: 500
                  }}>
                    {party.name}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: party.color || '#2563eb',
                        border: '1px solid #d1d5db'
                      }} />
                      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {party.color || '#2563eb'}
                      </span>
                    </div>
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
                    {party.description || '-'}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: party.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: party.is_active ? '#166534' : '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {party.is_active ? 'Active' : 'Inactive'}
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
                        onClick={() => handleEdit(party)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(party.id)}
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
          <Icon name="users" size={48} style={{
            color: '#d1d5db',
            marginBottom: '1rem',
            display: 'block'
          }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No Parties Found
          </h5>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            {filter !== 'all' ? `No ${filter} parties found.` : 'Get started by adding your first party.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="admin-btn primary"
          >
            <Icon name="plus" size={16} />
            Add Party
          </button>
        </div>
      )}
    </Container>
  );
};

export default PartyManagementPage;

