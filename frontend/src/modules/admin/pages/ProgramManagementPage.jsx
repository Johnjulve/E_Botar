/**
 * ProgramManagementPage
 * Manage departments and courses (CRUD operations with CSV import/export)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { programService } from '../../../services';
import '../../../assets/styles/admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
        <line x1="9" y1="9" x2="9" y2="9"/>
        <line x1="9" y1="12" x2="9" y2="12"/>
        <line x1="9" y1="15" x2="9" y2="15"/>
        <line x1="9" y1="18" x2="9" y2="18"/>
      </svg>
    ),
    book: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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
    upload: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
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

const ProgramManagementPage = () => {
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, department, course
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    program_type: 'department',
    description: '',
    department_id: null,
    is_active: true
  });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
  }, [filter]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { program_type: filter } : {};
      const response = await programService.getAll(params);
      setPrograms(response.data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
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
    setErrors({});

    try {
      // Validate
      if (!formData.name.trim()) {
        setErrors({ name: 'Name is required' });
        return;
      }
      if (!formData.code.trim()) {
        setErrors({ code: 'Code is required' });
        return;
      }
      if (formData.program_type === 'course' && !formData.department_id) {
        setErrors({ department_id: 'Department is required for courses' });
        return;
      }

      const submitData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        program_type: formData.program_type,
        description: formData.description.trim(),
        is_active: formData.is_active
      };

      if (formData.program_type === 'course' && formData.department_id) {
        submitData.department_id = parseInt(formData.department_id);
      }

      if (editingProgram) {
        await programService.update(editingProgram.id, submitData);
      } else {
        await programService.create(submitData);
      }

      // Reset form and refresh
      resetForm();
      fetchPrograms();
      fetchDepartments();
    } catch (error) {
      console.error('Error saving program:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'An error occurred while saving the program' });
      }
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      code: program.code,
      program_type: program.program_type,
      description: program.description || '',
      department_id: program.department_id || null,
      is_active: program.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    try {
      await programService.delete(id);
      fetchPrograms();
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error deleting program. It may be in use by other records.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      program_type: 'department',
      description: '',
      department_id: null,
      is_active: true
    });
    setEditingProgram(null);
    setShowForm(false);
    setErrors({});
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a CSV file');
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const response = await programService.importCSV(importFile);
      setImportResult(response.data);
      setImportFile(null);
      // Reset file input
      document.getElementById('csv-file-input').value = '';
      // Refresh programs
      fetchPrograms();
      fetchDepartments();
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportResult({
        message: 'Error importing CSV file',
        errors: error.response?.data?.errors || [{ error: error.message }]
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async (programType = null) => {
    try {
      console.log('Starting CSV export...', { programType });
      const response = await programService.exportCSV(programType);
      console.log('CSV export response:', response);
      
      // Check if response is a blob
      let blob;
      if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        // Convert to blob if it's not already
        blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programs_export${programType ? `_${programType}` : ''}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      console.log('CSV export successful');
    } catch (error) {
      console.error('Error exporting CSV - Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Unknown error occurred';
      
      // Handle different error types
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data type:', typeof error.response.data);
        console.log('Error response data:', error.response.data);
        
        // If it's a blob error response, try to read it
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            console.log('Blob error text:', text);
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.detail || errorData.message || errorData.error || text;
            } catch {
              errorMessage = text || `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
          } catch (blobError) {
            console.error('Error reading blob:', blobError);
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data) {
          errorMessage = error.response.data.detail || 
                        error.response.data.message || 
                        error.response.data.error ||
                        (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : String(error.response.data));
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown status'}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('Final error message:', errorMessage);
      alert(`Error exporting CSV file: ${errorMessage}`);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading programs..." />;
  }

  const filterButtons = [
    { key: 'all', label: 'All Programs', icon: 'building' },
    { key: 'department', label: 'Departments', icon: 'building' },
    { key: 'course', label: 'Courses', icon: 'book' }
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
              <Icon name="building" size={28} style={{ color: '#2563eb' }} />
              Program Management
            </h1>
            <p>Manage departments and courses</p>
          </div>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => handleExport(filter !== 'all' ? filter : null)}
              className="admin-btn"
              style={{ background: '#10b981', color: 'white' }}
            >
              <Icon name="download" size={16} />
              Export CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="admin-btn primary"
            >
              <Icon name={showForm ? 'x' : 'plus'} size={16} />
              {showForm ? 'Cancel' : 'Add Program'}
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h5 style={{
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#1f2937',
          fontWeight: 600
        }}>
          <Icon name="upload" size={20} style={{ color: '#2563eb' }} />
          Import from CSV
        </h5>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files[0])}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          />
          <button
            onClick={handleImport}
            disabled={!importFile || importLoading}
            className="admin-btn"
            style={{
              background: '#2563eb',
              color: 'white',
              opacity: (!importFile || importLoading) ? 0.5 : 1,
              cursor: (!importFile || importLoading) ? 'not-allowed' : 'pointer'
            }}
          >
            {importLoading ? 'Importing...' : 'Import CSV'}
          </button>
          {importFile && (
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Selected: {importFile.name}
            </span>
          )}
        </div>
        {importResult && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: importResult.errors?.length > 0 ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${importResult.errors?.length > 0 ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <div style={{
              fontWeight: 600,
              color: importResult.errors?.length > 0 ? '#dc2626' : '#16a34a',
              marginBottom: '0.5rem'
            }}>
              {importResult.message}
            </div>
            {importResult.created && importResult.created.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Created ({importResult.created.length}):</strong>
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                  {importResult.created.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.updated && importResult.updated.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Updated ({importResult.updated.length}):</strong>
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                  {importResult.updated.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Fallback for old format */}
            {importResult.imported && importResult.imported.length > 0 && 
             !importResult.created && !importResult.updated && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Imported ({importResult.imported.length}):</strong>
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                  {importResult.imported.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Errors ({importResult.errors.length}):</strong>
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <strong>CSV Format:</strong> name, code, program_type, department_id<br/>
          <strong>Note:</strong> program_type must be "department" or "course". Courses must include a valid department_id.<br/>
          <strong>Import Behavior:</strong> Existing programs (matching code and program_type) will be updated/overwritten.
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
            {editingProgram ? 'Edit Program' : 'Add New Program'}
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
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${errors.code ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
                {errors.code && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {errors.code}
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
                  Program Type *
                </label>
                <select
                  name="program_type"
                  value={formData.program_type}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="department">Department</option>
                  <option value="course">Course</option>
                </select>
              </div>

              {formData.program_type === 'course' && (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151'
                  }}>
                    Department *
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id || ''}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: `1px solid ${errors.department_id ? '#dc2626' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  {errors.department_id && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.department_id}
                    </div>
                  )}
                </div>
              )}

              <div>
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
              >
                <Icon name="check" size={16} />
                {editingProgram ? 'Update' : 'Create'}
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
            <Icon name={btn.icon} size={16} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Programs Table */}
      {programs.length > 0 ? (
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
                }}>Code</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Type</th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151'
                }}>Department</th>
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
              {programs.map(program => (
                <tr key={program.id} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    fontWeight: 500
                  }}>
                    {program.name}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {program.code}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    <span style={{
                      textTransform: 'capitalize',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: program.program_type === 'department' ? '#dbeafe' : '#fef3c7',
                      color: program.program_type === 'department' ? '#1e40af' : '#92400e',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {program.program_type}
                    </span>
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {program.department_name || '-'}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: program.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: program.is_active ? '#166534' : '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {program.is_active ? 'Active' : 'Inactive'}
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
                        onClick={() => handleEdit(program)}
                        className="admin-btn secondary"
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(program.id)}
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
          <Icon name="building" size={48} style={{
            color: '#d1d5db',
            marginBottom: '1rem',
            display: 'block'
          }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No Programs Found
          </h5>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            {filter !== 'all' ? `No ${filter}s found.` : 'Get started by adding your first program.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="admin-btn primary"
          >
            <Icon name="plus" size={16} />
            Add Program
          </button>
        </div>
      )}
    </Container>
  );
};

export default ProgramManagementPage;

