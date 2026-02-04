/**
 * PositionManagementPage
 * Manage election positions (CRUD operations with reordering)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
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
        <div className="admin-header-layout">
          <div>
            <h1>
              <Icon name="briefcase" size={28} className="admin-header-icon" />
              Position Management
            </h1>
            <p>Manage election positions</p>
          </div>
          <div className="admin-header-actions-right">
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
        <div className="admin-form-card">
          <h5 className="admin-form-title">
            {editingPosition ? 'Edit Position' : 'Add New Position'}
          </h5>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div>
                <label className="admin-form-label">
                  Name *
                </label>
                <input
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
                <label className="admin-form-label">
                  Max Candidates
                </label>
                <input
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
                  id="is_active"
                />
                <label htmlFor="is_active" className="admin-checkbox-label">
                  Active
                </label>
              </div>

              <div className="admin-grid-full-width">
                <label className="admin-form-label">
                  Description
                </label>
                <textarea
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

            <div className="admin-form-actions">
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
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Positions Table */}
      {positions.length > 0 ? (
        <div className="admin-table-wrapper">
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
                        onClick={() => handleMoveUp(position)}
                        className={`admin-btn secondary admin-table-action-btn ${!canMoveUp(position) ? 'disabled' : ''}`}
                        disabled={!canMoveUp(position)}
                        title="Move Up"
                      >
                        <Icon name="arrowUp" size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(position)}
                        className={`admin-btn secondary admin-table-action-btn ${!canMoveDown(position) ? 'disabled' : ''}`}
                        disabled={!canMoveDown(position)}
                        title="Move Down"
                      >
                        <Icon name="arrowDown" size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(position)}
                        className="admin-btn secondary admin-table-action-btn"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
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
        <div className="admin-empty-card">
          <Icon name="briefcase" size={48} className="admin-empty-icon" />
          <h5 className="admin-empty-title">
            No Positions Found
          </h5>
          <p className="admin-empty-text">
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

