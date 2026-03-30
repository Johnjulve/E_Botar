/**
 * ElectionFormPage
 * Create or edit election with positions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert } from '../../../components/common';
import { useAuth } from '../../../hooks/useAuth';
import { electionService, programService } from '../../../services';
import '../admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
    save: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const ElectionFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isSubmittingRef = useRef(false);
  /** Original DB end time (ISO) for extend-only validation on edit */
  const originalEndDateRef = useRef('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availablePositions, setAvailablePositions] = useState([]);
  const [selectedPositionIds, setSelectedPositionIds] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1,
    description: '',
    start_date: '',
    end_date: '',
    election_type: 'university',
    allowed_department_code: null
  });

  useEffect(() => {
    fetchAvailablePositions();
    fetchDepartments();
    if (isEdit) {
      fetchElection();
    }
  }, [id]);

  const fetchAvailablePositions = async () => {
    try {
      const response = await electionService.getAllPositions();
      setAvailablePositions(response.data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setError('Failed to load available positions');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await programService.getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchElection = async () => {
    try {
      setLoading(true);
      const response = await electionService.getById(id);
      const election = response.data;
      
      // Extract position IDs from election_positions
      const positionIds = election.election_positions 
        ? election.election_positions.map(ep => ep.position.id)
        : [];
      
      setFormData({
        start_year: election.start_year || new Date().getFullYear(),
        end_year: election.end_year || new Date().getFullYear() + 1,
        description: election.description || '',
        start_date: election.start_date ? election.start_date.slice(0, 16) : '',
        end_date: election.end_date ? election.end_date.slice(0, 16) : '',
        election_type: election.election_type || 'university',
        allowed_department_code: election.allowed_department?.code || null
      });
      originalEndDateRef.current = election.end_date || '';

      setSelectedPositionIds(positionIds);
    } catch (error) {
      console.error('Error fetching election:', error);
      setError('Failed to load election');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle year fields specially
    if (name === 'start_year') {
      const year = parseInt(value) || new Date().getFullYear();
      setFormData(prev => ({ 
        ...prev, 
        start_year: year,
        end_year: year + 1 // Auto-set end_year to start_year + 1
      }));
    } else if (name === 'election_type') {
      // Clear department when switching to university type
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        allowed_department_code: value === 'university' ? null : prev.allowed_department_code
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Auto-generate title preview
  const getTitlePreview = () => {
    if (!formData.start_year || !formData.end_year) return '';
    
    if (formData.election_type === 'university') {
      return `USC Election AY ${formData.start_year}-${formData.end_year}`;
    } else if (formData.election_type === 'department') {
      if (formData.allowed_department_code) {
        const selectedDept = departments.find(d => d.code === formData.allowed_department_code);
        if (selectedDept) {
          return `${selectedDept.code} Election AY ${formData.start_year}-${formData.end_year}`;
        }
      }
      return `[Department Code] Election AY ${formData.start_year}-${formData.end_year}`;
    }
    return '';
  };

  const togglePositionSelection = (positionId) => {
    setSelectedPositionIds(prev => {
      if (prev.includes(positionId)) {
        return prev.filter(id => id !== positionId);
      } else {
        return [...prev, positionId];
      }
    });
  };

  const buildDatetimePayload = useCallback((localVal) => {
    if (!localVal) return '';
    if (localVal.length === 16) return `${localVal}:00`;
    return localVal;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError('');
    setSuccess('');

    if (isEdit) {
      if (!formData.end_date) {
        setError('End date is required');
        return;
      }
      const newEnd = new Date(buildDatetimePayload(formData.end_date)).getTime();
      const origEnd = new Date(originalEndDateRef.current).getTime();
      if (Number.isNaN(newEnd) || Number.isNaN(origEnd)) {
        setError('Invalid end date');
        return;
      }
      if (newEnd < origEnd) {
        setError('End date can only be extended, not moved earlier.');
        return;
      }
    } else {
      if (!formData.start_year || !formData.end_year) {
        setError('School year is required');
        return;
      }
      if (formData.end_year !== formData.start_year + 1) {
        setError('End year must be exactly one year after start year');
        return;
      }
      if (!formData.start_date || !formData.end_date) {
        setError('Start and end dates are required');
        return;
      }
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        setError('End date must be after start date');
        return;
      }
      if (selectedPositionIds.length === 0) {
        setError('At least one position is required');
        return;
      }
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      if (isEdit) {
        await electionService.partialUpdate(id, {
          description: formData.description,
          end_date: buildDatetimePayload(formData.end_date),
        });
        setSuccess('Election updated successfully!');
      } else {
        const dataToSubmit = {
          ...formData,
          start_date: buildDatetimePayload(formData.start_date),
          end_date: buildDatetimePayload(formData.end_date),
          position_ids: selectedPositionIds,
          allowed_department_code: formData.election_type === 'department' ? formData.allowed_department_code : null
        };
        await electionService.create(dataToSubmit);
        setSuccess('Election created successfully!');
      }

      setTimeout(() => {
        navigate('/admin/elections');
      }, 1500);
    } catch (error) {
      console.error('Error saving election:', error);
      const data = error.response?.data;
      const message = data?.non_field_errors?.[0] ?? data?.detail ?? 'Failed to save election';
      setError(typeof message === 'string' ? message : 'Failed to save election');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this election? This will remove the election and its positions. This action cannot be undone.')) {
      return;
    }
    setError('');
    setDeleting(true);
    try {
      await electionService.delete(id);
      setSuccess('Election deleted successfully.');
      setTimeout(() => navigate('/admin/elections'), 1000);
    } catch (err) {
      console.error('Error deleting election:', err);
      setError(err.response?.data?.detail || 'Failed to delete election. Only superusers can delete elections.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading election..." />;
  }

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <Link to="/admin/elections" className="admin-btn secondary admin-election-back-btn">
          <Icon name="arrow" size={16} />
          Back to Elections
        </Link>
        <h1>{isEdit ? 'Edit Election' : 'Create New Election'}</h1>
        <p>
          {isEdit
            ? 'You can update the description and extend the end date only. Schedule, type, and positions are fixed.'
            : 'Set up a new election with positions'}
        </p>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">{success}</Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="admin-election-form-section">
          <h5 className="admin-election-section-title">
            Election Details
          </h5>

          {/* School Year Section */}
            <div className="admin-election-info-box">
              <p className="admin-election-info-title">
                Academic Year: AY {formData.start_year}-{formData.end_year}
              </p>
              <p className="admin-election-info-text">
                {isEdit
                  ? 'Title, academic year, type, positions, and start time are locked. Extend end time only if needed.'
                  : 'The election title will be auto-generated based on the election type and academic year you select below.'}
              </p>
            </div>

          <div className="admin-election-form-grid">
            <div>
              <label className="admin-election-form-label">
                Start Year *
              </label>
              <input
                type="number"
                name="start_year"
                value={formData.start_year}
                onChange={handleChange}
                min="2000"
                max="2100"
                required={!isEdit}
                disabled={isEdit}
                className="admin-election-form-input"
                placeholder="e.g., 2025"
              />

              <small className="admin-election-form-help">
                First year of the school year
              </small>
            </div>

            <div>
              <label className="admin-election-form-label">
                End Year *
              </label>
              <input
                type="number"
                name="end_year"
                value={formData.end_year}
                onChange={handleChange}
                min="2000"
                max="2100"
                required
                disabled
                className="admin-election-form-input"
                placeholder="Auto-filled"
              />
              <small className="admin-election-form-help">
                Auto-filled (Start Year + 1)
              </small>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="admin-election-form-label">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="admin-election-form-textarea"
              placeholder="Brief description of the election..."
            />
          </div>

          {/* Election Type Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="admin-election-form-label-spaced">
              Election Type / Council Type *
            </label>
            <div className="admin-election-type-group">
              <label className={`admin-election-type-label ${formData.election_type === 'university' ? 'admin-election-type-label-active' : ''}`}>
                <input
                  type="radio"
                  name="election_type"
                  value="university"
                  checked={formData.election_type === 'university'}
                  onChange={handleChange}
                  disabled={isEdit}
                  className="admin-election-type-radio"
                />
                <div className="admin-election-type-content">
                  <div className="admin-election-type-title">University Student Council (USC)</div>
                  <small className="admin-election-type-subtitle">All students can vote</small>
                </div>
              </label>
              <label className={`admin-election-type-label ${formData.election_type === 'department' ? 'admin-election-type-label-active' : ''}`}>
                <input
                  type="radio"
                  name="election_type"
                  value="department"
                  checked={formData.election_type === 'department'}
                  onChange={handleChange}
                  disabled={isEdit}
                  className="admin-election-type-radio"
                />
                <div className="admin-election-type-content">
                  <div className="admin-election-type-title">Department Election</div>
                  <small className="admin-election-type-subtitle">Specific department only</small>
                </div>
              </label>
            </div>
          </div>

          {/* Title Preview */}
          <div className="admin-election-title-preview">
            <p className="admin-election-title-preview-label">
              Election Title Preview (Auto-generated):
            </p>
            <p className="admin-election-title-preview-text">
              {getTitlePreview() || 'Enter start and end year to see title preview'}
            </p>
          </div>

          {/* Department Selection (only for Department Election) */}
          {formData.election_type === 'department' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="admin-election-form-label">
                Department *
              </label>
              <select
                name="allowed_department_code"
                value={formData.allowed_department_code || ''}
                onChange={handleChange}
                required={formData.election_type === 'department'}
                disabled={isEdit}
                className="admin-election-form-select"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              <small className="admin-election-form-help">
                Only students from the selected department can vote and apply as candidates.
              </small>
            </div>
          )}

          <div className="admin-election-form-grid-dates">
            <div>
              <label className="admin-election-form-label">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required={!isEdit}
                disabled={isEdit}
                className="admin-election-form-input"
              />
            </div>

            <div>
              <label className="admin-election-form-label">
                End Date & Time *{isEdit ? ' (extend only)' : ''}
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                min={isEdit && originalEndDateRef.current ? originalEndDateRef.current.slice(0, 16) : undefined}
                className="admin-election-form-input"
              />
            </div>
          </div>
        </div>

        {/* Positions Selection */}
        <div className="admin-election-form-section">
          <h5 className="admin-election-positions-section-title">
            Select Positions *
          </h5>
          
          <p className="admin-election-positions-description">
            {isEdit
              ? 'Positions cannot be changed after the election is created.'
              : 'Choose which positions will be contested in this election. You can select multiple positions.'}
          </p>

          {availablePositions.length === 0 ? (
            <div className="admin-election-no-positions">
              <p className="admin-election-no-positions-text">
                No positions available. Please create positions first in the Position Management section.
              </p>
            </div>
          ) : (
            <div className="admin-election-positions-grid">
              {availablePositions.map((position) => (
                <label
                  key={position.id}
                  className={`admin-election-position-label ${selectedPositionIds.includes(position.id) ? 'admin-election-position-label-selected' : ''}`}
                  onMouseEnter={(e) => {
                    if (!selectedPositionIds.includes(position.id)) {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedPositionIds.includes(position.id)) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPositionIds.includes(position.id)}
                    onChange={() => togglePositionSelection(position.id)}
                    disabled={isEdit}
                    className="admin-election-position-checkbox"
                  />
                  <div className="admin-election-position-content">
                    <div className="admin-election-position-name">
                      {position.name}
                    </div>
                    {position.description && (
                      <div className="admin-election-position-description">
                        {position.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedPositionIds.length > 0 && (
            <div className="admin-election-selected-count">
              ✓ {selectedPositionIds.length} position{selectedPositionIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="admin-election-submit-buttons">
          <Link to="/admin/elections" className="admin-btn secondary">
            Cancel
          </Link>
          <div className="admin-election-submit-actions">
            {isEdit && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting || deleting}
                className="admin-btn danger"
                title="Delete this election (superuser only)"
              >
                <Icon name="trash" size={16} />
                {deleting ? 'Deleting...' : 'Delete Election'}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || deleting}
              className="admin-btn primary"
            >
              <Icon name="save" size={16} />
              {submitting ? 'Saving...' : isEdit ? 'Update Election' : 'Create Election'}
            </button>
          </div>
        </div>
      </form>
    </Container>
  );
};

export default ElectionFormPage;
