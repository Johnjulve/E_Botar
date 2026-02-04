/**
 * ProgramManagementPage
 * Manage departments and courses (CRUD operations with CSV import/export)
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { programService } from '../../../services';
import '../admin.css';

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
    department_code: null,
    is_active: true
  });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false); // prevent double-submit on form

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
    if (saving) {
      // Ignore rapid repeat submissions
      return;
    }
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
      if (formData.program_type === 'course' && !formData.department_code) {
        setErrors({ department_code: 'Department is required for courses' });
        return;
      }

      setSaving(true);

      const submitData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        program_type: formData.program_type,
        description: formData.description.trim(),
        is_active: formData.is_active
      };

      if (formData.program_type === 'course' && formData.department_code) {
        submitData.department_code = formData.department_code;
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
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      code: program.code,
      program_type: program.program_type,
      description: program.description || '',
      department_code: program.department || null, // department is now a code string
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
      department_code: null,
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
    { key: 'department', label: 'Colleges', icon: 'building' },
    { key: 'course', label: 'Courses', icon: 'book' }
  ];

// Friendly labels for program types
const typeLabels = {
  department: 'College',
  course: 'Course'
};

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <div className="admin-program-header-flex">
          <div>
            <h1>
              <Icon name="building" size={28} className="admin-icon-primary" />
              Program Management
            </h1>
            <p>Manage colleges and courses</p>
          </div>
          <div className="admin-program-header-actions">
            <button
              onClick={() => handleExport(filter !== 'all' ? filter : null)}
              className="admin-btn admin-btn-success"
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
      <div className="admin-import-section">
        <h5 className="admin-import-header">
          <Icon name="upload" size={20} className="admin-icon-primary" />
          Import from CSV
        </h5>
        <div className="admin-import-controls">
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files[0])}
            className="admin-file-input"
          />
          <button
            onClick={handleImport}
            disabled={!importFile || importLoading}
            className="admin-btn admin-btn-import"
          >
            {importLoading ? 'Importing...' : 'Import CSV'}
          </button>
          {importFile && (
            <span className="admin-file-selected">
              Selected: {importFile.name}
            </span>
          )}
        </div>
        {importResult && (
          <div className={`admin-import-result ${importResult.errors?.length > 0 ? 'admin-import-result-error' : 'admin-import-result-success'}`}>
            <div className={`admin-import-result-title ${importResult.errors?.length > 0 ? 'admin-import-result-title-error' : 'admin-import-result-title-success'}`}>
              {importResult.message}
            </div>
            {importResult.created && importResult.created.length > 0 && (
              <div className="admin-import-result-list">
                <strong>Created ({importResult.created.length}):</strong>
                <ul>
                  {importResult.created.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.updated && importResult.updated.length > 0 && (
              <div className="admin-import-result-list">
                <strong>Updated ({importResult.updated.length}):</strong>
                <ul>
                  {importResult.updated.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Fallback for old format */}
            {importResult.imported && importResult.imported.length > 0 && 
             !importResult.created && !importResult.updated && (
              <div className="admin-import-result-list">
                <strong>Imported ({importResult.imported.length}):</strong>
                <ul>
                  {importResult.imported.map((item, idx) => (
                    <li key={idx}>{item.name} ({item.code})</li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="admin-import-result-list">
                <strong>Errors ({importResult.errors.length}):</strong>
                <ul>
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="admin-import-help">
          <strong>CSV Format:</strong> name, code, program_type, department_code<br/>
          <strong>Note:</strong> program_type must be "department" or "course".<br/>
          For <em>course</em> rows, provide a valid <code>department_code</code> that matches an existing department's code (e.g. <code>CCIS</code>).<br/>
          <strong>Note:</strong> CSV files must use <code>department_code</code> column to link courses to departments.<br/>
          <strong>Import Behavior:</strong> Existing programs (matching code and program_type) will be updated/overwritten.
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-form-section">
          <h5 className="admin-form-title">
            {editingProgram ? 'Edit Program' : 'Add New Program'}
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
                  className={`admin-form-input ${errors.name ? 'admin-form-input-error' : ''}`}
                />
                {errors.name && (
                  <div className="admin-form-error">
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <label className="admin-form-label">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className={`admin-form-input ${errors.code ? 'admin-form-input-error' : ''}`}
                />
                {errors.code && (
                  <div className="admin-form-error">
                    {errors.code}
                  </div>
                )}
              </div>

              <div>
                <label className="admin-form-label">
                  Program Type *
                </label>
                <select
                  name="program_type"
                  value={formData.program_type}
                  onChange={handleInputChange}
                  required
                  className="admin-form-input"
                >
                  <option value="department">College</option>
                  <option value="course">Course</option>
                </select>
              </div>

              {formData.program_type === 'course' && (
                <div>
                  <label className="admin-form-label">
                    Department *
                  </label>
                  <select
                    name="department_code"
                    value={formData.department_code || ''}
                    onChange={handleInputChange}
                    required
                    className={`admin-form-input ${errors.department_code ? 'admin-form-input-error' : ''}`}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  {errors.department_code && (
                    <div className="admin-form-error">
                      {errors.department_code}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="admin-form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="admin-form-textarea"
                />
              </div>

              <div className="admin-form-checkbox-group">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  id="is_active"
                />
                <label htmlFor="is_active" className="admin-form-checkbox-label">
                  Active
                </label>
              </div>
            </div>

            {errors.general && (
              <div className="admin-form-error-box">
                {errors.general}
              </div>
            )}

            <div className="admin-form-buttons">
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
                {saving ? (editingProgram ? 'Updating...' : 'Creating...') : (editingProgram ? 'Update' : 'Create')}
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
            className={`admin-filter-btn ${filter === btn.key ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive-default'}`}
          >
            <Icon name={btn.icon} size={16} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Programs Table */}
      {programs.length > 0 ? (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Colleges</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(program => (
                <tr key={program.id}>
                  <td className="admin-table-cell-name">
                    {program.name}
                  </td>
                  <td className="admin-table-cell-code">
                    {program.code}
                  </td>
                  <td className="admin-table-cell-type">
                    <span className={`admin-program-type-badge ${
                      program.program_type === 'department' ? 'admin-program-type-department' : 'admin-program-type-course'
                    }`}>
                      {typeLabels[program.program_type] || program.program_type}
                    </span>
                  </td>
                  <td className="admin-table-cell-code">
                    {program.department_name || '-'}
                  </td>
                  <td className="admin-table-cell-status">
                    <span className={`admin-status-badge-table ${
                      program.is_active ? 'admin-status-badge-active-table' : 'admin-status-badge-inactive-table'
                    }`}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin-table-actions">
                    <div className="admin-table-action-buttons">
                      <button
                        onClick={() => handleEdit(program)}
                        className="admin-btn secondary admin-btn-small"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(program.id)}
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
        <div className="admin-card-container admin-empty-state">
          <Icon name="building" size={48} className="admin-empty-state-icon" />
          <h5 className="admin-empty-state-title">
            No Programs Found
          </h5>
          <p className="admin-empty-state-message" style={{ marginBottom: '1.5rem' }}>
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

