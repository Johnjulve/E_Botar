/**
 * ElectionFormPage
 * Create or edit election with positions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert } from '../../../components/common';
import { electionService } from '../../../services';
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

// Common student government positions
const COMMON_POSITIONS = [
  { name: 'President', description: 'Chief Executive Officer of the student body' },
  { name: 'Vice President', description: 'Second-in-command and assists the President' },
  { name: 'Secretary', description: 'Handles documentation and communications' },
  { name: 'Treasurer', description: 'Manages financial matters and budget' },
  { name: 'Auditor', description: 'Reviews and audits financial records' },
  { name: 'Public Relations Officer', description: 'Handles external communications and publicity' },
  { name: 'Business Manager', description: 'Oversees business operations and ventures' },
  { name: 'Senator', description: 'Represents student interests and concerns' },
  { name: 'Representative', description: 'Represents specific departments or groups' },
];

const ElectionFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    positions: []
  });

  useEffect(() => {
    if (isEdit) {
      fetchElection();
    }
  }, [id]);

  const fetchElection = async () => {
    try {
      setLoading(true);
      const response = await electionService.getById(id);
      const election = response.data;
      
      setFormData({
        title: election.title || '',
        description: election.description || '',
        start_date: election.start_date ? election.start_date.slice(0, 16) : '',
        end_date: election.end_date ? election.end_date.slice(0, 16) : '',
        positions: election.positions || []
      });
    } catch (error) {
      console.error('Error fetching election:', error);
      setError('Failed to load election');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPosition = () => {
    setFormData(prev => ({
      ...prev,
      positions: [...prev.positions, { 
        name: '', 
        description: '', 
        max_selections: 1,
        isCustom: true // Track if user is typing custom or selecting preset
      }]
    }));
  };

  const handleAddPresetPosition = (preset) => {
    setFormData(prev => ({
      ...prev,
      positions: [...prev.positions, { 
        name: preset.name, 
        description: preset.description, 
        max_selections: 1,
        isCustom: false
      }]
    }));
  };

  const handlePositionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.map((pos, i) => 
        i === index ? { 
          ...pos, 
          [field]: value,
          isCustom: field === 'name' ? true : pos.isCustom // Mark as custom if name is manually changed
        } : pos
      )
    }));
  };

  const handlePresetChange = (index, presetName) => {
    if (presetName === 'custom') {
      setFormData(prev => ({
        ...prev,
        positions: prev.positions.map((pos, i) => 
          i === index ? { ...pos, name: '', description: '', isCustom: true } : pos
        )
      }));
    } else {
      const preset = COMMON_POSITIONS.find(p => p.name === presetName);
      if (preset) {
        setFormData(prev => ({
          ...prev,
          positions: prev.positions.map((pos, i) => 
            i === index ? { 
              ...pos, 
              name: preset.name, 
              description: preset.description,
              isCustom: false
            } : pos
          )
        }));
      }
    }
  };

  const handleRemovePosition = (index) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title.trim()) {
      setError('Election title is required');
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
    if (formData.positions.length === 0) {
      setError('At least one position is required');
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit) {
        await electionService.update(id, formData);
        setSuccess('Election updated successfully!');
      } else {
        await electionService.create(formData);
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Election Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
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
              placeholder="e.g., Student Council Election 2025"
            />
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

        {/* Positions */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{
              margin: 0,
              color: '#1f2937',
              fontWeight: 600
            }}>
              Positions
            </h5>
            <button
              type="button"
              onClick={handleAddPosition}
              className="admin-btn primary"
            >
              <Icon name="plus" size={16} />
              Add Custom Position
            </button>
          </div>

          {/* Quick Add Common Positions */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{
              margin: '0 0 0.75rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#1e40af'
            }}>
              Quick Add Common Positions:
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {COMMON_POSITIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleAddPresetPosition(preset)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'white',
                    border: '1px solid #93c5fd',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    color: '#1e40af',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#2563eb';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#1e40af';
                  }}
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {formData.positions.length === 0 ? (
            <p style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280'
            }}>
              No positions added yet. Click "Add Position" to create one.
            </p>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {formData.positions.map((position, index) => (
                <div key={index} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  background: '#f9fafb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <h6 style={{
                      margin: 0,
                      color: '#1f2937',
                      fontWeight: 600
                    }}>
                      Position {index + 1}
                    </h6>
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>

                  {/* Preset Position Selector */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Select Common Position or Enter Custom
                    </label>
                    <select
                      value={position.isCustom ? 'custom' : position.name}
                      onChange={(e) => handlePresetChange(index, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="custom">--- Custom Position ---</option>
                      {COMMON_POSITIONS.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position Name Input (shown when custom or for editing preset) */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Position Name * {!position.isCustom && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.85rem' }}>(from preset)</span>}
                    </label>
                    <input
                      type="text"
                      value={position.name}
                      onChange={(e) => handlePositionChange(index, 'name', e.target.value)}
                      required
                      disabled={!position.isCustom}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        background: position.isCustom ? 'white' : '#f3f4f6',
                        cursor: position.isCustom ? 'text' : 'not-allowed',
                        opacity: position.isCustom ? 1 : 0.7
                      }}
                      placeholder={position.isCustom ? "e.g., President, Vice President" : "Select from dropdown above"}
                    />
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Description {!position.isCustom && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.85rem' }}>(from preset, editable)</span>}
                    </label>
                    <textarea
                      value={position.description}
                      onChange={(e) => handlePositionChange(index, 'description', e.target.value)}
                      rows="2"
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        background: 'white',
                        resize: 'vertical'
                      }}
                      placeholder="Optional description"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Max Selections
                    </label>
                    <input
                      type="number"
                      value={position.max_selections}
                      onChange={(e) => handlePositionChange(index, 'max_selections', parseInt(e.target.value) || 1)}
                      min="1"
                      style={{
                        width: '100px',
                        padding: '0.65rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>
              ))}
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
