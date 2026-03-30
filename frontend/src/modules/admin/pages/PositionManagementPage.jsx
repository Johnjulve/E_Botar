/**
 * PositionManagementPage
 * Manage election positions (CRUD operations with reordering)
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
  const [allPositions, setAllPositions] = useState([]); // Store all positions for reordering
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
      let fetchedPositions = response.data || [];
      
      // Sort by display_order
      fetchedPositions.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));
      
      // Store all positions for reordering logic
      setAllPositions(fetchedPositions);
      
      // Apply filter
      let filteredPositions = fetchedPositions;
      if (filter === 'active') {
        filteredPositions = fetchedPositions.filter(p => p.is_active);
      } else if (filter === 'inactive') {
        filteredPositions = fetchedPositions.filter(p => !p.is_active);
      }
      
      setPositions(filteredPositions);
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

      // Auto-calculate display_order for new positions
      let displayOrder = 1;
      if (!editingPosition) {
        // For new positions, set to max + 1 or 1 if no positions exist
        const allPositions = await electionService.getAllPositions();
        const positionsList = allPositions.data || [];
        if (positionsList.length > 0) {
          // Use 1 as default for positions with null/0/undefined display_order
          const maxOrder = Math.max(...positionsList.map(p => p.display_order || 1));
          displayOrder = maxOrder + 1;
        } else {
          displayOrder = 1;
        }
      } else {
        // For editing, keep the existing display_order
        displayOrder = editingPosition.display_order || 1;
      }

      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        display_order: displayOrder,
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

  const canMoveUp = (position) => {
    // Use the position's index in the globally sorted list to determine if it can move up
    const index = allPositions.findIndex(p => p.id === position.id);
    return index > 0;
  };

  const canMoveDown = (position) => {
    // Use the position's index in the globally sorted list to determine if it can move down
    const index = allPositions.findIndex(p => p.id === position.id);
    return index !== -1 && index < allPositions.length - 1;
  };

  const handleMoveUp = async (position) => {
    if (!canMoveUp(position)) return;
    
    try {
      // Find current index and the position directly above in the sorted list
      const currentIndex = allPositions.findIndex(p => p.id === position.id);
      if (currentIndex <= 0) {
        return;
      }
      const positionAbove = allPositions[currentIndex - 1];
      
      // Swap display_order values
      await Promise.all([
        electionService.updatePosition(position.id, {
          ...position,
          display_order: positionAbove.display_order
        }),
        electionService.updatePosition(positionAbove.id, {
          ...positionAbove,
          display_order: position.display_order
        })
      ]);
      
      fetchPositions();
    } catch (error) {
      console.error('Error moving position up:', error);
      alert('Error moving position. Please try again.');
    }
  };

  const handleMoveDown = async (position) => {
    if (!canMoveDown(position)) return;
    
    try {
      // Find current index and the position directly below in the sorted list
      const currentIndex = allPositions.findIndex(p => p.id === position.id);
      if (currentIndex === -1 || currentIndex >= allPositions.length - 1) {
        return;
      }
      const positionBelow = allPositions[currentIndex + 1];
      
      // Swap display_order values
      await Promise.all([
        electionService.updatePosition(position.id, {
          ...position,
          display_order: positionBelow.display_order
        }),
        electionService.updatePosition(positionBelow.id, {
          ...positionBelow,
          display_order: position.display_order
        })
      ]);
      
      fetchPositions();
    } catch (error) {
      console.error('Error moving position down:', error);
      alert('Error moving position. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      max_candidates: 1,
      is_active: true
    });
    setEditingPosition(null);
    setShowForm(false);
    setErrors({});
  };

  const openCreateModal = () => {
    setEditingPosition(null);
    setFormData({
      name: '',
      description: '',
      max_candidates: 1,
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
    return <LoadingSpinner fullScreen text="Loading positions..." />;
  }

  const filterButtons = [
    { key: 'all', label: 'All Positions' },
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
                <Icon name="briefcase" size={22} />
              </div>
              <div>
                <h1 className="admin-registry-title">Positions</h1>
                <p className="admin-registry-lede">
                  Define offices that appear on ballots and set how many candidates can run per seat.
                </p>
              </div>
            </div>
            <nav className="admin-registry-nav" aria-label="Election admin sections">
              <Link to="/admin/elections" className="admin-btn secondary admin-registry-nav-btn">
                Elections
              </Link>
              <Link to="/admin/parties" className="admin-btn secondary admin-registry-nav-btn">
                Parties
              </Link>
              <Link to="/admin/positions" className="admin-btn primary admin-registry-nav-btn" aria-current="page">
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
              Add position
            </button>
          </div>
        </header>

      <Modal
        show={showForm}
        onHide={handleModalHide}
        title={editingPosition ? 'Edit position' : 'New position'}
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
              form="position-form-modal"
              className="admin-btn primary"
              disabled={saving}
            >
              <Icon name="check" size={16} />
              {saving ? (editingPosition ? 'Updating...' : 'Creating...') : (editingPosition ? 'Update' : 'Create')}
            </button>
          </div>
        )}
      >
        <form id="position-form-modal" onSubmit={handleSubmit} className="admin-registry-modal-form">
          <div className="admin-form-grid">
            <div>
              <label className="admin-form-label" htmlFor="position-form-name">
                Name <span className="admin-registry-field-required" aria-hidden="true">*</span>
              </label>
              <input
                id="position-form-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`admin-form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && (
                <div className="admin-field-error">
                  {errors.name}
                </div>
              )}
            </div>

            <div>
              <label className="admin-form-label" htmlFor="position-max-candidates">
                Max candidates
              </label>
              <input
                id="position-max-candidates"
                type="number"
                name="max_candidates"
                value={formData.max_candidates}
                onChange={handleInputChange}
                min="1"
                className="admin-form-input"
              />
            </div>

            <div className="admin-checkbox-row">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                id="position-is-active"
              />
              <label htmlFor="position-is-active" className="admin-checkbox-label">
                Active
              </label>
            </div>

            <div className="admin-grid-full-width">
              <label className="admin-form-label" htmlFor="position-form-description">
                Description
              </label>
              <textarea
                id="position-form-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="admin-textarea"
              />
            </div>
          </div>

          {errors.general && (
            <div className="admin-form-error">
              {errors.general}
            </div>
          )}
        </form>
      </Modal>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs admin-registry-filters" role="group" aria-label="Filter positions">
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

      {/* Positions Table */}
      {positions.length > 0 ? (
        <div className="admin-table-wrapper admin-registry-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="order-column">Order</th>
                <th>Name</th>
                <th>Max Candidates</th>
                <th>Description</th>
                <th>Status</th>
                <th className="admin-table-header-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={position.id} className="admin-table-row">
                  <td className="admin-table-cell order">
                    {index + 1}
                  </td>
                  <td className="admin-table-cell name">
                    {position.name}
                  </td>
                  <td className="admin-table-cell">
                    {position.max_candidates || 1}
                  </td>
                  <td className="admin-table-cell description">
                    {position.description || '-'}
                  </td>
                  <td className="admin-status-cell">
                    <span className={`admin-status-badge ${position.is_active ? 'active' : 'inactive'}`}>
                      {position.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin-table-actions-cell">
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(position)}
                        className={`admin-btn secondary admin-table-action-btn ${!canMoveUp(position) ? 'disabled' : ''}`}
                        disabled={!canMoveUp(position)}
                        title="Move Up"
                      >
                        <Icon name="arrowUp" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(position)}
                        className={`admin-btn secondary admin-table-action-btn ${!canMoveDown(position) ? 'disabled' : ''}`}
                        disabled={!canMoveDown(position)}
                        title="Move Down"
                      >
                        <Icon name="arrowDown" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(position)}
                        className="admin-btn secondary admin-table-action-btn"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(position.id)}
                        className="admin-btn secondary admin-table-action-btn danger"
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
          <Icon name="briefcase" size={40} className="admin-empty-icon" />
          <h2 className="admin-empty-title">
            No positions yet
          </h2>
          <p className="admin-empty-text">
            {filter !== 'all' ? `No ${filter} positions match this filter.` : 'Add positions before building elections and ballots.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="admin-btn primary"
          >
            <Icon name="plus" size={16} />
            Add position
          </button>
        </div>
      )}
      </div>
    </Container>
  );
};

export default PositionManagementPage;

