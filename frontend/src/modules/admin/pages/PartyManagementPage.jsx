/**
 * PartyManagementPage
 * Manage political parties (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { Link } from 'react-router-dom';
import { LoadingSpinner, Modal } from '../../../components/common';
import { electionService } from '../../../services';
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

  const openCreateModal = () => {
    setEditingParty(null);
    setFormData({
      name: '',
      description: '',
      color: '#2563eb',
      is_active: true
    });
    setErrors({});
    setShowForm(true);
  };

  const handleModalHide = () => {
    if (!saving) {
      resetForm();
    }
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
      <div className="admin-registry-page">
        <header className="admin-registry-header">
          <div className="admin-registry-header-text">
            <p className="admin-registry-eyebrow">Election setup</p>
            <div className="admin-registry-title-row">
              <div className="admin-registry-icon" aria-hidden>
                <Icon name="users" size={22} />
              </div>
              <div>
                <h1 className="admin-registry-title">Parties</h1>
                <p className="admin-registry-lede">
                  Create and maintain political parties used when candidates file or appear on ballots.
                </p>
              </div>
            </div>
            <nav className="admin-registry-nav" aria-label="Election admin sections">
              <Link to="/admin/elections" className="admin-btn secondary admin-registry-nav-btn">
                Elections
              </Link>
              <Link to="/admin/parties" className="admin-btn primary admin-registry-nav-btn" aria-current="page">
                Parties
              </Link>
              <Link to="/admin/positions" className="admin-btn secondary admin-registry-nav-btn">
                Positions
              </Link>
            </nav>
          </div>
          <div className="admin-registry-header-actions">
            <button
              type="button"
              onClick={openCreateModal}
              className="admin-btn primary"
            >
              <Icon name="plus" size={16} />
              Add party
            </button>
          </div>
        </header>

      <Modal
        show={showForm}
        onHide={handleModalHide}
        title={editingParty ? 'Edit party' : 'New party'}
        size="lg"
        className="admin-registry-modal"
        container={typeof document !== 'undefined' ? document.body : undefined}
        backdrop={saving ? 'static' : true}
        keyboard={!saving}
        footer={(
          <div className="admin-registry-modal-footer">
            <button
              type="button"
              className="admin-btn secondary"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="party-form-modal"
              className="admin-btn primary"
              disabled={saving}
            >
              <Icon name="check" size={16} />
              {saving ? (editingParty ? 'Updating...' : 'Creating...') : (editingParty ? 'Update' : 'Create')}
            </button>
          </div>
        )}
      >
        <form id="party-form-modal" onSubmit={handleSubmit} className="admin-registry-modal-form">
          <div className="admin-form-grid">
            <div>
              <label className="admin-form-label" htmlFor="party-form-name">
                Name <span className="admin-registry-field-required" aria-hidden="true">*</span>
              </label>
              <input
                id="party-form-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`admin-form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && (
                <div className="admin-form-error">
                  {errors.name}
                </div>
              )}
            </div>

            <div>
              <label className="admin-form-label">
                Color
              </label>
              <div className="admin-party-color-group">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="admin-party-color-picker"
                  aria-label="Party color"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="admin-party-color-input"
                  placeholder="#2563eb"
                  aria-label="Party color hex"
                />
              </div>
            </div>

            <div className="admin-form-checkbox-group">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                id="party-is-active"
              />
              <label htmlFor="party-is-active" className="admin-form-checkbox-label">
                Active
              </label>
            </div>

            <div className="admin-grid-full-width">
              <label className="admin-form-label" htmlFor="party-form-description">
                Description
              </label>
              <textarea
                id="party-form-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="admin-form-textarea"
              />
            </div>
          </div>

          {errors.general && (
            <div className="admin-form-error-box">
              {errors.general}
            </div>
          )}
        </form>
      </Modal>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs admin-registry-filters" role="group" aria-label="Filter parties">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setFilter(btn.key)}
            className={`admin-filter-btn ${filter === btn.key ? 'active' : ''}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Parties Table */}
      {parties.length > 0 ? (
        <div className="admin-table-wrapper admin-registry-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Color</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parties.map(party => (
                <tr key={party.id}>
                  <td className="admin-table-cell-name">
                    {party.name}
                  </td>
                  <td>
                    <div className="admin-party-color-display">
                      <div 
                        className="admin-party-color-swatch"
                        style={{ background: party.color || '#2563eb' }}
                      />
                      <span className="admin-party-color-text">
                        {party.color || '#2563eb'}
                      </span>
                    </div>
                  </td>
                  <td className="admin-party-description-cell">
                    {party.description || '-'}
                  </td>
                  <td className="admin-table-cell-status">
                    <span className={`admin-status-badge-table ${
                      party.is_active ? 'admin-status-badge-active-table' : 'admin-status-badge-inactive-table'
                    }`}>
                      {party.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin-table-actions">
                    <div className="admin-table-action-buttons">
                      <button
                        type="button"
                        onClick={() => handleEdit(party)}
                        className="admin-btn secondary admin-btn-small"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(party.id)}
                        className="admin-btn secondary admin-btn-danger-small"
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
        <div className="admin-empty-card admin-registry-empty">
          <Icon name="users" size={40} className="admin-empty-icon" />
          <h2 className="admin-empty-title">
            No parties yet
          </h2>
          <p className="admin-empty-text">
            {filter !== 'all' ? `No ${filter} parties match this filter.` : 'Add a party to attach candidates and ballot branding.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="admin-btn primary"
          >
            Add party
          </button>
        </div>
      )}
      </div>
    </Container>
  );
};

export default PartyManagementPage;

