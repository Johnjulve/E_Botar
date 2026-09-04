/**
 * RosterSyncModal.jsx
 * Enterprise Student Roster Synchronization Modal with Drag-and-Drop,
 * In-Memory Pre-Import Validation, Field Diff Inspection, and Atomic Execution.
 */

import React, { useState, useRef } from 'react';
import { Modal, Button, Icon, LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';

const SAMPLE_CSV_CONTENT = `Student ID,Email,First Name,Last Name,Course,Year Level,Section
2024-10001,john.doe@university.edu.ph,John,Doe,BSCS,1st Year,A
2024-10002,jane.smith@university.edu.ph,Jane,Smith,BSCS,2nd Year,B
2024-10003,robert.tan@university.edu.ph,Robert,Tan,BSIT,3rd Year,A
2024-10004,maria.santos@university.edu.ph,Maria,Santos,BSIT,4th Year,C
`;

export const RosterSyncModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'update' | 'deactivate' | 'errors'
  const [deactivateUnlisted, setDeactivateUnlisted] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fileInputRef = useRef(null);

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setErrorMsg('');
    setSyncResult(null);
    setActiveTab('create');
    setDeactivateUnlisted(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = (e) => {
    e.preventDefault();
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_roster_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setErrorMsg('Please select a valid Excel (.xlsx) or CSV (.csv) file.');
      return;
    }
    setErrorMsg('');
    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setErrorMsg('Please choose a file to analyze.');
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMsg('');
      const res = await authService.previewStudentRoster(file);
      setPreviewData(res.data);
      if (res.data.stats?.to_create_count > 0) {
        setActiveTab('create');
      } else if (res.data.stats?.to_update_count > 0) {
        setActiveTab('update');
      } else if (res.data.stats?.error_count > 0) {
        setActiveTab('errors');
      } else {
        setActiveTab('create');
      }
    } catch (err) {
      const respData = err.response?.data;
      const msg = respData?.error || respData?.detail || err.message || 'Failed to analyze roster file.';
      setErrorMsg(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!file) return;

    try {
      setSyncing(true);
      setErrorMsg('');
      const res = await authService.importStudentRoster(file, deactivateUnlisted);
      setSyncResult(res.data);
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      const respData = err.response?.data;
      const msg = respData?.error || respData?.detail || err.message || 'Failed to execute roster import.';
      setErrorMsg(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal
      show={isOpen}
      isOpen={isOpen}
      onHide={handleClose}
      onClose={handleClose}
      title="Synchronize Student Roster"
      size="xl"
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            {!syncResult && previewData && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleReset}
                disabled={syncing}
              >
                Choose Different File
              </button>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={syncing}
            >
              {syncResult ? 'Close' : 'Cancel'}
            </Button>
            {!syncResult && !previewData && (
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={!file || analyzing}
              >
                {analyzing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ms-2">Analyzing File...</span>
                  </>
                ) : (
                  <>
                    <Icon name="search" size={16} className="me-1" />
                    <span>Analyze & Preview</span>
                  </>
                )}
              </Button>
            )}
            {!syncResult && previewData && (
              <Button
                variant="success"
                onClick={handleExecuteSync}
                disabled={syncing || previewData.stats?.valid_count === 0}
              >
                {syncing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ms-2">Applying Changes...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} className="me-1" />
                    <span>Confirm & Sync ({previewData.stats?.valid_count || 0} Students)</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="roster-sync-container">
        {/* Error Alert */}
        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-start gap-2 mb-3">
            <Icon name="alertTriangle" size={18} className="text-danger flex-shrink-0 mt-1" />
            <div>
              <div className="fw-semibold">Roster Notice</div>
              <div className="small">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Success State */}
        {syncResult && (
          <div className="roster-success-banner text-center py-4">
            <div className="roster-success-icon mb-3">
              <Icon name="checkCircle" size={48} className="text-success" />
            </div>
            <h4 className="fw-bold text-success mb-2">Roster Synchronized Successfully!</h4>
            <p className="text-muted mb-4">
              All validated student records and profile updates have been atomically committed to the database.
            </p>
            <div className="roster-stats-summary-grid mb-3">
              <div className="roster-stat-box create">
                <div className="roster-stat-num">{syncResult.created_count}</div>
                <div className="roster-stat-lbl">New Accounts Created</div>
              </div>
              <div className="roster-stat-box update">
                <div className="roster-stat-num">{syncResult.updated_count}</div>
                <div className="roster-stat-lbl">Profiles Updated</div>
              </div>
              <div className="roster-stat-box deactivate">
                <div className="roster-stat-num">{syncResult.deactivated_count}</div>
                <div className="roster-stat-lbl">Accounts Deactivated</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: File Dropzone (when not analyzed yet) */}
        {!syncResult && !previewData && (
          <div className="roster-upload-step">
            <div
              className={`roster-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="d-none"
                onChange={handleFileChange}
              />
              <div className="roster-dropzone-icon">
                <Icon name="upload" size={40} />
              </div>
              {file ? (
                <div className="roster-file-selected">
                  <div className="fw-bold text-primary">{file.name}</div>
                  <div className="text-muted small">
                    {(file.size / 1024).toFixed(1)} KB — Click or drop to replace
                  </div>
                </div>
              ) : (
                <div className="roster-dropzone-prompt">
                  <div className="fw-bold fs-6 mb-1">Drag & drop registrar roster spreadsheet here</div>
                  <div className="text-muted small mb-2">Supports Microsoft Excel (.xlsx) and CSV (.csv)</div>
                  <span className="btn btn-sm btn-outline-primary">Browse Files</span>
                </div>
              )}
            </div>

            {/* Template Information Card */}
            <div className="roster-template-card mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold small text-uppercase text-muted">
                  Supported Column Headers
                </div>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                  onClick={handleDownloadTemplate}
                >
                  <Icon name="download" size={14} className="me-1" />
                  Download Sample CSV
                </button>
              </div>
              <div className="roster-chip-columns">
                <span className="badge bg-light text-dark border">Student ID / ID Number</span>
                <span className="badge bg-light text-dark border">Email / Student Email</span>
                <span className="badge bg-light text-dark border">First Name</span>
                <span className="badge bg-light text-dark border">Last Name</span>
                <span className="badge bg-light text-dark border">Middle Name (optional)</span>
                <span className="badge bg-light text-dark border">Course / Program</span>
                <span className="badge bg-light text-dark border">Department / College (optional)</span>
                <span className="badge bg-light text-dark border">Year Level</span>
                <span className="badge bg-light text-dark border">Section</span>
              </div>
              <div className="small text-muted mt-2">
                <strong>Tip:</strong> If department is omitted, it will automatically inherit from the course. Student IDs (e.g. <code>2024-12345</code> or <code>202412345</code>) and Year Levels (<code>1st</code>, <code>2nd</code>, <code>1</code>, <code>2</code>) are normalized automatically.
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pre-Import Diff Preview */}
        {!syncResult && previewData && (
          <div className="roster-preview-step">
            {/* File info banner */}
            <div className="roster-file-info-banner d-flex justify-content-between align-items-center p-2 px-3 rounded bg-light border mb-3">
              <div className="d-flex align-items-center gap-2">
                <Icon name="fileText" size={18} className="text-primary" />
                <span className="fw-semibold text-dark small">{previewData.filename}</span>
              </div>
              <span className="badge bg-secondary">{previewData.stats?.total_rows} Total Rows</span>
            </div>

            {/* Stats Cards */}
            <div className="roster-stats-summary-grid mb-3">
              <div
                className={`roster-stat-box create cursor-pointer ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                <div className="roster-stat-num">{previewData.stats?.to_create_count || 0}</div>
                <div className="roster-stat-lbl">New Students</div>
              </div>

              <div
                className={`roster-stat-box update cursor-pointer ${activeTab === 'update' ? 'active' : ''}`}
                onClick={() => setActiveTab('update')}
              >
                <div className="roster-stat-num">{previewData.stats?.to_update_count || 0}</div>
                <div className="roster-stat-lbl">Profile Updates</div>
              </div>

              <div
                className={`roster-stat-box deactivate cursor-pointer ${activeTab === 'deactivate' ? 'active' : ''}`}
                onClick={() => setActiveTab('deactivate')}
              >
                <div className="roster-stat-num">{previewData.stats?.to_deactivate_count || 0}</div>
                <div className="roster-stat-lbl">Unlisted In DB</div>
              </div>

              <div
                className={`roster-stat-box error cursor-pointer ${activeTab === 'errors' ? 'active' : ''}`}
                onClick={() => setActiveTab('errors')}
              >
                <div className="roster-stat-num">{previewData.stats?.error_count || 0}</div>
                <div className="roster-stat-lbl">Validation Errors</div>
              </div>
            </div>

            {/* Deactivation Toggle */}
            <div className="roster-option-card p-2 px-3 mb-3 border rounded bg-white d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-semibold small text-dark">Deactivate Unlisted Students</div>
                <div className="small text-muted">
                  Set registered students not present in this active roster to inactive (preventing voting).
                </div>
              </div>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="deactivateSwitch"
                  checked={deactivateUnlisted}
                  onChange={(e) => setDeactivateUnlisted(e.target.checked)}
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <ul className="nav nav-tabs roster-preview-tabs mb-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  New Students ({previewData.stats?.to_create_count || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'update' ? 'active' : ''}`}
                  onClick={() => setActiveTab('update')}
                >
                  Profile Updates ({previewData.stats?.to_update_count || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'deactivate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('deactivate')}
                >
                  Unlisted ({previewData.stats?.to_deactivate_count || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link text-danger ${activeTab === 'errors' ? 'active' : ''}`}
                  onClick={() => setActiveTab('errors')}
                >
                  Errors ({previewData.stats?.error_count || 0})
                </button>
              </li>
            </ul>

            {/* Tab Content Panels */}
            <div className="roster-tab-content-panel border rounded p-2 bg-white">
              {/* TAB 1: New Students */}
              {activeTab === 'create' && (
                <div>
                  {previewData.preview?.to_create?.length === 0 ? (
                    <div className="text-center text-muted py-4 small">
                      No new student accounts detected in this file.
                    </div>
                  ) : (
                    <div className="table-responsive roster-table-wrapper">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Course</th>
                            <th>Year</th>
                            <th>Sec</th>
                            <th>Status</th>
                            <th>Verified</th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {previewData.preview.to_create.map((s, idx) => (
                            <tr key={idx}>
                              <td><code>{s.student_id || 'Auto-gen'}</code></td>
                              <td className="fw-semibold">{s.first_name} {s.last_name}</td>
                              <td className="text-muted">{s.email}</td>
                              <td><span className="badge bg-primary-subtle text-primary">{s.course_code || '—'}</span></td>
                              <td>{s.year_level || '—'}</td>
                              <td>{s.section || '—'}</td>
                              <td>
                                <span className="admin-status-badge-table admin-status-badge-active-table" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                  <Icon name="checkCircle" size={11} /> Active
                                </span>
                              </td>
                              <td>
                                <span className="admin-status-badge-table admin-status-badge-active-table" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                  <Icon name="checkCircle" size={11} /> Verified
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>

                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Profile Updates */}
              {activeTab === 'update' && (
                <div>
                  {previewData.preview?.to_update?.length === 0 ? (
                    <div className="text-center text-muted py-4 small">
                      No existing student profile changes detected.
                    </div>
                  ) : (
                    <div className="table-responsive roster-table-wrapper">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Detected Changes</th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {previewData.preview.to_update.map((u, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="fw-semibold">{u.first_name} {u.last_name}</div>
                                <code className="text-muted">{u.student_id || u.username}</code>
                              </td>
                              <td className="text-muted">{u.email}</td>
                              <td>
                                <div className="d-flex flex-wrap gap-1">
                                  {Object.entries(u.changes || {}).map(([field, delta]) => (
                                    <span key={field} className="badge bg-light text-dark border">
                                      <strong>{field}:</strong> {String(delta.old || 'none')} &rarr; {String(delta.new || 'none')}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Unlisted Accounts */}
              {activeTab === 'deactivate' && (
                <div>
                  {previewData.preview?.to_deactivate?.length === 0 ? (
                    <div className="text-center text-muted py-4 small">
                      All registered students in the database are present in this uploaded roster.
                    </div>
                  ) : (
                    <div className="table-responsive roster-table-wrapper">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Current Status</th>
                            <th>Verified</th>
                            <th>If Confirmed</th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {previewData.preview.to_deactivate.map((u, idx) => (
                            <tr key={idx}>
                              <td><code>{u.student_id || '—'}</code></td>
                              <td className="fw-semibold">{u.name}</td>
                              <td className="text-muted">{u.email}</td>
                              <td>
                                <span className="admin-status-badge-table admin-status-badge-active-table" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                  <Icon name="checkCircle" size={11} /> Active
                                </span>
                              </td>
                              <td>
                                <span className="admin-status-badge-table admin-status-badge-active-table" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                  <Icon name="checkCircle" size={11} /> Verified
                                </span>
                              </td>
                              <td>
                                {deactivateUnlisted ? (
                                  <span className="badge bg-danger-subtle text-danger">Will Deactivate</span>
                                ) : (
                                  <span className="badge bg-secondary-subtle text-secondary">Will Keep Active</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>

                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Validation Errors */}
              {activeTab === 'errors' && (
                <div>
                  {(!previewData.errors || previewData.errors.length === 0) ? (
                    <div className="text-center text-success py-4 small">
                      <Icon name="checkCircle" size={20} className="me-1" />
                      Zero formatting or data errors found!
                    </div>
                  ) : (
                    <div className="table-responsive roster-table-wrapper">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Row #</th>
                            <th>Record Identifier</th>
                            <th>Error Details</th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {previewData.errors.map((err, idx) => (
                            <tr key={idx}>
                              <td><span className="badge bg-danger">Row {err.row_number}</span></td>
                              <td>
                                <div className="fw-semibold">{err.name || 'Unknown'}</div>
                                <code className="text-muted">{err.email || err.student_id || '—'}</code>
                              </td>
                              <td className="text-danger">
                                {Array.isArray(err.errors) ? (
                                  <ul className="mb-0 ps-3">
                                    {err.errors.map((msg, i) => <li key={i}>{msg}</li>)}
                                  </ul>
                                ) : (
                                  err.error || 'Format error'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RosterSyncModal;
