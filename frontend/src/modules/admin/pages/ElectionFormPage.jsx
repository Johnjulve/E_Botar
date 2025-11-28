/**
 * ElectionFormPage
 * Create or edit election with positions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert } from '../../../components/common';
import { electionService, programService } from '../../../services';
import '../../../assets/styles/admin.css';

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
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
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
    allowed_department_id: null
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
        allowed_department_id: election.allowed_department?.id || null
      });
      
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
        allowed_department_id: value === 'university' ? null : prev.allowed_department_id
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
      if (formData.allowed_department_id) {
        const selectedDept = departments.find(d => d.id === formData.allowed_department_id);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
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

    try {
      setSubmitting(true);

      // Prepare data with position_ids
      const dataToSubmit = {
        ...formData,
        position_ids: selectedPositionIds,
        allowed_department_id: formData.election_type === 'department' ? formData.allowed_department_id : null
      };

      if (isEdit) {
        await electionService.update(id, dataToSubmit);
        setSuccess('Election updated successfully!');
      } else {
        await electionService.create(dataToSubmit);
        setSuccess('Election created successfully!');
      }

      setTimeout(() => {
        navigate('/admin/elections');
      }, 1500);
    } catch (error) {
      console.error('Error saving election:', error);
      setError(error.response?.data?.detail || 'Failed to save election');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading election..." />;
  }

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <Link to="/admin/elections" className="admin-btn secondary" style={{ marginBottom: '1rem' }}>
          <Icon name="arrow" size={16} />
          Back to Elections
        </Link>
        <h1>{isEdit ? 'Edit Election' : 'Create New Election'}</h1>
        <p>{isEdit ? 'Update election details and positions' : 'Set up a new election with positions'}</p>
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
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h5 style={{
            margin: '0 0 1.5rem',
            color: '#1f2937',
            fontWeight: 600
          }}>
            Election Details
          </h5>

          {/* School Year Section */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <p style={{
                margin: '0 0 0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#1e40af'
              }}>
                Academic Year: AY {formData.start_year}-{formData.end_year}
              </p>
              <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#1e3a8a'
              }}>
                The election title will be auto-generated based on the election type and academic year you select below.
              </p>
            </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Start Year *
              </label>
              <input
                type="number"
                name="start_year"
                value={formData.start_year}
                onChange={handleChange}
                min="2000"
                max="2100"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit'
                }}
                placeholder="e.g., 2025"
              />
              <small style={{ 
                display: 'block', 
                marginTop: '0.25rem', 
                color: '#6b7280',
                fontSize: '0.85rem' 
              }}>
                First year of the school year
              </small>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
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
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  background: '#f3f4f6',
                  cursor: 'not-allowed'
                }}
                placeholder="Auto-filled"
              />
              <small style={{ 
                display: 'block', 
                marginTop: '0.25rem', 
                color: '#6b7280',
                fontSize: '0.85rem' 
              }}>
                Auto-filled (Start Year + 1)
              </small>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Brief description of the election..."
            />
          </div>

          {/* Election Type Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: '#374151'
            }}>
              Election Type / Council Type *
            </label>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.75rem',
                border: `2px solid ${formData.election_type === 'university' ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                background: formData.election_type === 'university' ? '#eff6ff' : 'white',
                flex: 1,
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="election_type"
                  value="university"
                  checked={formData.election_type === 'university'}
                  onChange={handleChange}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>University Student Council (USC)</div>
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>All students can vote</small>
                </div>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.75rem',
                border: `2px solid ${formData.election_type === 'department' ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                background: formData.election_type === 'department' ? '#eff6ff' : 'white',
                flex: 1,
                minWidth: '200px'
              }}>
                <input
                  type="radio"
                  name="election_type"
                  value="department"
                  checked={formData.election_type === 'department'}
                  onChange={handleChange}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>Department Election</div>
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>Specific department only</small>
                </div>
              </label>
            </div>
          </div>

          {/* Title Preview */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <p style={{
              margin: '0 0 0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#1e40af'
            }}>
              Election Title Preview (Auto-generated):
            </p>
            <p style={{
              margin: 0,
              fontSize: '0.95rem',
              color: '#1e3a8a',
              fontWeight: 500
            }}>
              {getTitlePreview() || 'Enter start and end year to see title preview'}
            </p>
          </div>

          {/* Department Selection (only for Department Election) */}
          {formData.election_type === 'department' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Department *
              </label>
              <select
                name="allowed_department_id"
                value={formData.allowed_department_id || ''}
                onChange={handleChange}
                required={formData.election_type === 'department'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              <small style={{
                display: 'block',
                marginTop: '0.25rem',
                color: '#6b7280',
                fontSize: '0.85rem'
              }}>
                Only students from the selected department can vote and apply as candidates.
              </small>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
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

            <div>
              <label style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
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
          </div>
        </div>

        {/* Positions Selection */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h5 style={{
            margin: '0 0 1rem',
            color: '#1f2937',
            fontWeight: 600
          }}>
            Select Positions *
          </h5>
          
          <p style={{
            margin: '0 0 1.25rem',
            color: '#6b7280',
            fontSize: '0.9rem'
          }}>
            Choose which positions will be contested in this election. You can select multiple positions.
          </p>

          {availablePositions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem'
            }}>
              <p style={{ margin: 0, color: '#991b1b' }}>
                No positions available. Please create positions first in the Position Management section.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '0.75rem'
            }}>
              {availablePositions.map((position) => (
                <label
                  key={position.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '1rem',
                    border: selectedPositionIds.includes(position.id) 
                      ? '2px solid #2563eb' 
                      : '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    background: selectedPositionIds.includes(position.id) 
                      ? '#eff6ff' 
                      : 'white',
                    transition: 'all 0.15s'
                  }}
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
                    style={{
                      marginRight: '0.75rem',
                      marginTop: '0.25rem',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#2563eb'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {position.name}
                    </div>
                    {position.description && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        lineHeight: 1.4
                      }}>
                        {position.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedPositionIds.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '0.5rem',
              color: '#047857',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              ✓ {selectedPositionIds.length} position{selectedPositionIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <Link to="/admin/elections" className="admin-btn secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="admin-btn primary"
          >
            <Icon name="save" size={16} />
            {submitting ? 'Saving...' : isEdit ? 'Update Election' : 'Create Election'}
          </button>
        </div>
      </form>
    </Container>
  );
};

export default ElectionFormPage;
