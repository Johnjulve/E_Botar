import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Form, Row, Col, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Container } from '../../../components/layout';
import { Button, Modal, Icon, LoadingSpinner } from '../../../components/common';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import systemService from '../../../services/systemService';
import {
  loadSavedPresets,
  savePresetsToStorage,
  DEFAULT_INSTITUTION_PRESETS,
} from '../../../utils/themeEngine';
import { compressImageClientSide } from '../../../utils/imageCompressor';
import './branding-settings.css';
import logoFallback from '../../../assets/images/logo.png';

const BrandingSettingsPage = () => {
  const { isAdmin } = useAuth();
  const branding = useBranding();
  const {
    refreshBranding,
    applyPreviewTheme,
    revertPreviewTheme,
    loading: initialLoading,
  } = branding;

  const [formData, setFormData] = useState({
    institution_name: '',
    institution_name_line2: '',
    institution_acronym: '',
    app_name: '',
    tagline: '',
    support_email: '',
    website_url: '',
    primary_color: '#0b6e3b',
    secondary_color: '#f4cc5c',
    institution_logo_url: null,
    is_custom_branded: false,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [presets, setPresets] = useState(() => loadSavedPresets());
  const [activePreset, setActivePreset] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Preset Creation Modal State
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  // Asset Library State
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [activatingAssetId, setActivatingAssetId] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(false);

  const fileInputRef = useRef(null);

  const fetchUploadedAssets = async () => {
    setLoadingAssets(true);
    try {
      const assets = await systemService.getBrandingAssets();
      setUploadedAssets(assets);
    } catch (err) {
      console.error('Failed to load branding assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUploadedAssets();
    }
  }, [isAdmin]);

  // Synchronize form data with active branding
  useEffect(() => {
    if (!initialLoading) {
      setFormData({
        institution_name: branding.institution_name || '',
        institution_name_line2: branding.institution_name_line2 || '',
        institution_acronym: branding.institution_acronym || '',
        app_name: branding.app_name || 'E-Botar',
        tagline: branding.tagline || '',
        support_email: branding.support_email || '',
        website_url: branding.website_url || '',
        primary_color: branding.primary_color || '#0b6e3b',
        secondary_color: branding.secondary_color || '#f4cc5c',
        institution_logo_url: branding.institution_logo_url || null,
        is_custom_branded: Boolean(branding.is_custom_branded),
      });

      // Match preset if exists
      const match = presets.find(
        (p) =>
          p.primaryColor?.toLowerCase() === (branding.primary_color || '').toLowerCase() &&
          p.secondaryColor?.toLowerCase() === (branding.secondary_color || '').toLowerCase()
      );
      setActivePreset(match ? match.id : null);
    }
  }, [branding, initialLoading, presets]);

  // Clean up preview on unmount if not saved
  useEffect(() => {
    return () => {
      revertPreviewTheme();
    };
  }, [revertPreviewTheme]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (initialLoading) {
    return (
      <Container className="branding-settings-page">
        <LoadingSpinner text="Loading institutional branding settings..." />
      </Container>
    );
  }

  const handleInputChange = (field, value) => {
    const nextData = { ...formData, [field]: value };
    setFormData(nextData);
    setStatusMessage(null);
    setErrorMessage(null);

    // Apply live theme preview
    if (field === 'primary_color' || field === 'secondary_color') {
      applyPreviewTheme({
        primary_color: field === 'primary_color' ? value : formData.primary_color,
        secondary_color: field === 'secondary_color' ? value : formData.secondary_color,
      });

      // Check preset match
      const pColor = field === 'primary_color' ? value : formData.primary_color;
      const sColor = field === 'secondary_color' ? value : formData.secondary_color;
      const match = presets.find(
        (p) =>
          p.primaryColor?.toLowerCase() === pColor.toLowerCase() &&
          p.secondaryColor?.toLowerCase() === sColor.toLowerCase()
      );
      setActivePreset(match ? match.id : null);
    }
  };

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    const nextData = {
      ...formData,
      institution_name: preset.institution_name ?? formData.institution_name,
      institution_name_line2: preset.institution_name_line2 ?? formData.institution_name_line2,
      institution_acronym: preset.institution_acronym ?? formData.institution_acronym,
      tagline: preset.tagline ?? formData.tagline,
      primary_color: preset.primaryColor,
      secondary_color: preset.secondaryColor,
    };
    setFormData(nextData);
    applyPreviewTheme({
      primary_color: preset.primaryColor,
      secondary_color: preset.secondaryColor,
    });
    setStatusMessage(`Applied preset "${preset.name}". Click "Save Branding Settings" to persist.`);
  };

  const handleDeletePreset = (e, presetId) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    savePresetsToStorage(updated);
    if (activePreset === presetId) {
      setActivePreset(null);
    }
    setStatusMessage('Preset removed.');
  };

  const handleCreatePreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newId = `custom_${Date.now()}`;
    const newPresetObj = {
      id: newId,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'Custom user configuration.',
      institution_name: formData.institution_name,
      institution_name_line2: formData.institution_name_line2,
      institution_acronym: formData.institution_acronym,
      app_name: formData.app_name || 'E-Botar',
      tagline: formData.tagline,
      primaryColor: formData.primary_color,
      secondaryColor: formData.secondary_color,
      canDelete: true,
    };

    const updated = [...presets, newPresetObj];
    setPresets(updated);
    savePresetsToStorage(updated);
    setActivePreset(newId);
    setShowSavePresetModal(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setStatusMessage(`Preset "${newPresetObj.name}" created and saved successfully!`);
  };

  const handleLogoUpload = async (event) => {
    let file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';
    setUploadingLogo(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (file.size > 2 * 1024 * 1024) {
        setStatusMessage('Image exceeds 2MB. Compressing high-resolution asset before upload...');
        file = await compressImageClientSide(file, 2 * 1024 * 1024);
      }

      setStatusMessage('Uploading and synchronizing logo and browser favicon...');
      const response = await systemService.uploadBrandingAsset(file, 'logo');
      setFormData((prev) => ({
        ...prev,
        institution_logo_url: response.asset_url,
      }));

      if (response.is_duplicate) {
        setStatusMessage(
          response.message || 'This logo already exists in your library and has been set as active.'
        );
      } else {
        setStatusMessage('Primary Logo & Browser Favicon uploaded and added to library successfully!');
      }

      await refreshBranding(true);
      await fetchUploadedAssets();
    } catch (err) {
      console.error('Error uploading logo:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to upload logo image. Please verify file format.'
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleActivateAsset = async (asset) => {
    setActivatingAssetId(asset.id);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await systemService.activateBrandingAsset(asset.id);
      setFormData((prev) => ({
        ...prev,
        institution_logo_url: asset.url,
      }));
      setStatusMessage(`Selected "${asset.name}" as active system logo & browser favicon.`);
      await refreshBranding(true);
      await fetchUploadedAssets();
    } catch (err) {
      console.error('Error activating brand asset:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to activate asset.');
    } finally {
      setActivatingAssetId(null);
    }
  };

  const handleConfirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setDeletingAsset(true);
    setErrorMessage(null);
    try {
      const res = await systemService.deleteBrandingAsset(assetToDelete.id);
      if (res.reverted_to_default) {
        setFormData((prev) => ({
          ...prev,
          institution_logo_url: null,
        }));
        setStatusMessage(`Brand asset "${assetToDelete.name}" deleted. Active brand identity reverted to default E-Botar logo.`);
      } else {
        setStatusMessage(`Brand asset "${assetToDelete.name}" deleted successfully.`);
      }
      setAssetToDelete(null);
      await refreshBranding(true);
      await fetchUploadedAssets();
    } catch (err) {
      console.error('Error deleting brand asset:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to delete brand asset.');
    } finally {
      setDeletingAsset(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await systemService.updateBranding({
        institution_name: formData.institution_name,
        institution_name_line2: formData.institution_name_line2,
        institution_acronym: formData.institution_acronym,
        app_name: formData.app_name,
        tagline: formData.tagline,
        support_email: formData.support_email,
        website_url: formData.website_url,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        is_custom_branded: true,
      });

      setStatusMessage('Branding configuration and theme colors updated successfully!');
      await refreshBranding(true);
    } catch (err) {
      console.error('Error saving branding:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to save branding settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setResetting(true);
    setErrorMessage(null);
    try {
      await systemService.resetBrandingToDefaults();
      setStatusMessage('Institutional branding has been successfully reset to default E-Botar identity.');
      setShowResetModal(false);
      await refreshBranding(true);
    } catch (err) {
      console.error('Error resetting branding:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to reset branding to canonical defaults.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Container className="branding-settings-page">
      {/* Top Header Card */}
      <div className="branding-header-card">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h1 className="branding-header-title">
              <Icon name="palette" size={26} />
              Multi-Institution Branding & Custom Theming
            </h1>
            <p className="branding-header-subtitle">
              Manage institution identity, university presets, primary logo, and dynamic real-time color palettes across all voter views.
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Button
              variant="outline-secondary"
              onClick={() => setShowResetModal(true)}
              disabled={saving || resetting}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={saving || resetting}
            >
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving Changes...
                </>
              ) : (
                'Save Branding Settings'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Popup Toast Notifications */}
      <ToastContainer className="branding-toast-container" position="top-end">
        <Toast
          show={Boolean(statusMessage)}
          onClose={() => setStatusMessage(null)}
          delay={3500}
          autohide
          className="branding-toast-card border-success"
        >
          <Toast.Header className="bg-success text-white py-2">
            <Icon name="check-circle" size={16} className="me-2 text-white" />
            <strong className="me-auto text-white">Success</strong>
            <small className="text-white-50">Just now</small>
          </Toast.Header>
          <Toast.Body className="bg-white text-dark py-3 fw-medium">
            {statusMessage}
          </Toast.Body>
        </Toast>

        <Toast
          show={Boolean(errorMessage)}
          onClose={() => setErrorMessage(null)}
          delay={5000}
          autohide
          className="branding-toast-card border-danger"
        >
          <Toast.Header className="bg-danger text-white py-2">
            <Icon name="alert-triangle" size={16} className="me-2 text-white" />
            <strong className="me-auto text-white">Attention</strong>
            <small className="text-white-50">Notice</small>
          </Toast.Header>
          <Toast.Body className="bg-white text-dark py-3 fw-medium">
            {errorMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Live Viewport Preview Bar */}
      <div className="branding-preview-container">
        <div className="branding-preview-header">
          <span className="branding-preview-badge">
            <Icon name="check-circle" size={14} /> Live Dynamic Preview
          </span>
          <span className="text-muted" style={{ fontSize: '0.825rem' }}>
            Colors and typography automatically adapt across the application
          </span>
        </div>

        <div className="branding-mockup-grid">
          {/* Mockup 1: Simulated Topbar Header */}
          <div className="branding-mockup-card">
            <h6>Simulated Navigation Header</h6>
            {(() => {
              const isDefault = !formData.institution_logo_url && (!formData.institution_name || formData.institution_name.toLowerCase() === 'e-botar');
              return (
                <div
                  className={`mockup-navbar-preview ${isDefault ? 'mockup-navbar-default-ebotar' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${formData.primary_color} 0%, ${formData.primary_color}dd 100%)`,
                    color: '#ffffff',
                  }}
                >
                  <img
                    src={formData.institution_logo_url || logoFallback}
                    alt="Logo Preview"
                    className="mockup-logo-img"
                  />
                  {!isDefault && (
                    <div className="mockup-brand-titles">
                      <span className="mockup-title-main">
                        {formData.institution_name}
                      </span>
                      {formData.institution_name_line2 && (
                        <span className="mockup-title-sub">{formData.institution_name_line2}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Mockup 2: Simulated Voting Action Card */}
          <div className="branding-mockup-card">
            <h6>Simulated Voting Ballot Card</h6>
            <div
              style={{
                border: `2px solid ${formData.primary_color}`,
                borderRadius: '8px',
                padding: '0.85rem',
                backgroundColor: '#ffffff',
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  Student Council President
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: formData.primary_color,
                    background: 'var(--primary-soft-bg, #ecfdf5)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  1 Choice Max
                </span>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  style={{
                    backgroundColor: formData.primary_color,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Select Candidate
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: formData.secondary_color,
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Cast Vote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Form onSubmit={handleSaveSettings}>
        {/* Section 1: Institutional Presets & Theme Engine */}
        <div className="settings-section-card">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h2 className="settings-section-title mb-0">
              <Icon name="palette" size={20} />
              Institutional Presets & Color Themes
            </h2>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowSavePresetModal(true)}
            >
              + Save Current as Preset
            </Button>
          </div>
          <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
            Switch between client configurations (e.g. Surigao del Norte State University) or create custom institutional presets. Any preset can be deleted when no longer needed.
          </p>

          <label className="form-label fw-bold mb-2">Available Presets</label>
          <div className="preset-palettes-grid">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`preset-palette-item ${activePreset === preset.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset)}
                role="button"
                tabIndex={0}
              >
                <div className="preset-swatches">
                  <span
                    className="preset-swatch"
                    style={{ backgroundColor: preset.primaryColor }}
                    title={`Primary: ${preset.primaryColor}`}
                  />
                  <span
                    className="preset-swatch"
                    style={{ backgroundColor: preset.secondaryColor }}
                    title={`Secondary: ${preset.secondaryColor}`}
                  />
                </div>
                <div className="preset-info">
                  <span className="preset-name">{preset.name}</span>
                  {preset.institution_acronym && (
                    <span className="preset-badge">{preset.institution_acronym}</span>
                  )}
                </div>
                {preset.canDelete && (
                  <button
                    type="button"
                    className="preset-delete-btn"
                    title={`Delete preset ${preset.name}`}
                    onClick={(e) => handleDeletePreset(e, preset.id)}
                    aria-label={`Delete preset ${preset.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="color-picker-row mt-4">
            <div className="color-picker-group">
              <label className="form-label fw-semibold text-dark">Primary Brand Color</label>
              <div className="color-picker-input-wrapper">
                <input
                  type="color"
                  className="native-color-picker"
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                />
                <Form.Control
                  type="text"
                  className="hex-text-input"
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                />
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.8rem' }}>
                Used for primary buttons, active links, header banners, topbars, and key badges.
              </small>
            </div>

            <div className="color-picker-group">
              <label className="form-label fw-semibold text-dark">Secondary / Sidebar Accent Color</label>
              <div className="color-picker-input-wrapper">
                <input
                  type="color"
                  className="native-color-picker"
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                />
                <Form.Control
                  type="text"
                  className="hex-text-input"
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                />
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.8rem' }}>
                Used for the desktop & mobile navigation sidebar, secondary badges, and active highlights.
              </small>
            </div>
          </div>
        </div>

        {/* Section 2: Institutional Identity & Metadata */}
        <div className="settings-section-card">
          <h2 className="settings-section-title">
            <Icon name="shield" size={20} />
            Institutional Identity & Information
          </h2>
          <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
            Customize the name and credentials of the academic institution using the platform.
          </p>

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Institution Name (Line 1)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. SURIGAO DEL NORTE or E-Botar"
                  value={formData.institution_name}
                  onChange={(e) => handleInputChange('institution_name', e.target.value)}
                />
                <Form.Text className="text-muted">
                  First line displayed on the topbar navigation header.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Institution Name (Line 2 / Campus)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. STATE UNIVERSITY (optional)"
                  value={formData.institution_name_line2}
                  onChange={(e) => handleInputChange('institution_name_line2', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Second line displayed beneath the main institution name. Leave blank for single-line names.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Institution Acronym</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. SNSU or EB"
                  value={formData.institution_acronym}
                  onChange={(e) => handleInputChange('institution_acronym', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Short acronym used in receipts and summary charts.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={8}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Election System Tagline</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Student Government Electronic Voting System"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Displayed on public login and voter portal banners.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Official Website</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://snsu.edu.ph"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold text-dark">Election Support Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="support@snsu.edu.ph"
                  value={formData.support_email}
                  onChange={(e) => handleInputChange('support_email', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </div>

        {/* Section 3: Visual Brand Assets (Logo & Favicon) */}
        <div className="settings-section-card">
          <h2 className="settings-section-title">
            <Icon name="image" size={20} />
            Institutional Brand Asset (Logo & Favicon)
          </h2>
          <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
            Upload your institution’s high-resolution logo. The uploaded asset serves as both the primary navigation brand logo and the browser tab Favicon. Large files exceeding 2MB will be automatically compressed before saving. Available uploaded logos are saved in your asset library to avoid duplicate uploads.
          </p>

          <Row className="g-4">
            <Col lg={4} md={5}>
              <div className="asset-upload-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="fw-bold mb-0">Active Logo & Favicon</label>
                  <span className="badge bg-light text-dark border">Active Asset</span>
                </div>
                <p className="text-muted small mb-3">
                  Currently displayed on topbars, receipts, login headers, and browser tabs.
                </p>

                <div className="asset-preview-box">
                  <img
                    src={formData.institution_logo_url || logoFallback}
                    alt="Active Institution Logo"
                    className="asset-preview-img"
                  />
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleLogoUpload}
                />

                <div className="asset-actions flex-column gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-100"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Uploading & Optimizing...
                      </>
                    ) : (
                      <>
                        <Icon name="upload" size={14} className="me-1" />
                        Upload New Logo & Favicon
                      </>
                    )}
                  </Button>
                  <small className="text-muted text-center" style={{ fontSize: '0.75rem' }}>
                    Auto-compressed if &gt; 2MB. Deduplicated automatically.
                  </small>
                </div>
              </div>
            </Col>

            <Col lg={8} md={7}>
              <div className="asset-library-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="fw-bold mb-0">Available Uploaded Logos</h6>
                    <span className="badge bg-light text-dark border rounded-pill">
                      {uploadedAssets.length} Available
                    </span>
                  </div>
                  {loadingAssets && <Spinner size="sm" animation="border" />}
                </div>
                <p className="text-muted small mb-3">
                  Select an existing uploaded logo to activate it without re-uploading, or delete unused files.
                </p>

                {uploadedAssets.length === 0 ? (
                  <div className="asset-library-empty text-center py-4">
                    <div className="empty-icon-wrap mb-2 text-muted">
                      <Icon name="image" size={32} />
                    </div>
                    <p className="text-muted mb-1 fw-semibold" style={{ fontSize: '0.875rem' }}>
                      No custom logos uploaded yet
                    </p>
                    <small className="text-muted">
                      Upload your logo on the left to start building your branding library.
                    </small>
                  </div>
                ) : (
                  <div className="asset-library-grid">
                    {uploadedAssets.map((asset) => {
                      const isActive = asset.is_active;
                      return (
                        <div
                          key={asset.id}
                          className={`asset-library-item ${isActive ? 'active-asset' : ''}`}
                        >
                          <div className="asset-library-thumb-wrapper">
                            <img
                              src={asset.url || logoFallback}
                              alt={asset.name}
                              className="asset-library-thumb"
                            />
                            {isActive && (
                              <span className="asset-active-badge">
                                <Icon name="check-circle" size={11} className="me-1" /> Active
                              </span>
                            )}
                            <button
                              type="button"
                              className="asset-delete-btn"
                              title={`Delete ${asset.name}`}
                              onClick={() => setAssetToDelete(asset)}
                              aria-label={`Delete ${asset.name}`}
                            >
                              <Icon name="trash-2" size={13} />
                            </button>
                          </div>

                          <div className="asset-library-details">
                            <div className="asset-filename" title={asset.name}>
                              {asset.name}
                            </div>
                            <div className="asset-meta text-muted">
                              {asset.size > 0 ? `${Math.round(asset.size / 1024)} KB` : 'Uploaded Asset'}
                            </div>

                            <div className="asset-card-actions mt-2">
                              {isActive ? (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  disabled
                                  className="w-100 py-1"
                                  style={{ fontSize: '0.78rem' }}
                                >
                                  ✓ Active Logo
                                </Button>
                              ) : (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="w-100 py-1"
                                  style={{ fontSize: '0.78rem' }}
                                  onClick={() => handleActivateAsset(asset)}
                                  disabled={activatingAssetId === asset.id}
                                >
                                  {activatingAssetId === asset.id ? (
                                    <>
                                      <Spinner size="sm" animation="border" className="me-1" />
                                      Activating...
                                    </>
                                  ) : (
                                    'Use as Active'
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Form>

      {/* Modal: Save Current Settings as Preset */}
      <Modal
        show={showSavePresetModal}
        isOpen={showSavePresetModal}
        onHide={() => setShowSavePresetModal(false)}
        onClose={() => setShowSavePresetModal(false)}
        title="Save Current Configuration as Preset"
      >
        <Form onSubmit={handleCreatePreset}>
          <p className="text-muted small mb-3">
            This will bundle the currently selected institution identity and theme colors into a reusable preset.
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Preset Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Surigao State College of Technology"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Description (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Primary campus brand colors"
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              variant="outline-secondary"
              onClick={() => setShowSavePresetModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!newPresetName.trim()}
            >
              Save Preset
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Confirmation Modal for Resetting to Defaults */}
      <Modal
        show={showResetModal}
        isOpen={showResetModal}
        onHide={() => setShowResetModal(false)}
        onClose={() => setShowResetModal(false)}
        title="Reset to Default E-Botar Identity"
      >
        <p>
          Are you sure you want to reset all branding settings, color schemes, and institutional assets back to the canonical <strong>E-Botar</strong> defaults?
        </p>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          This action will restore the generic <strong>E-Botar</strong> identity and default system logo (<code>logo.png</code>). Client presets like <strong>Surigao del Norte State University (SNSU)</strong> will remain available in the presets list.
        </p>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button
            variant="outline-secondary"
            onClick={() => setShowResetModal(false)}
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleResetConfirm}
            disabled={resetting}
          >
            {resetting ? 'Resetting...' : 'Yes, Restore Defaults'}
          </Button>
        </div>
      </Modal>
      {/* Confirmation Modal for Deleting an Uploaded Brand Asset */}
      <Modal
        show={Boolean(assetToDelete)}
        isOpen={Boolean(assetToDelete)}
        onHide={() => setAssetToDelete(null)}
        onClose={() => setAssetToDelete(null)}
        title="Delete Uploaded Logo"
      >
        <p>
          Are you sure you want to permanently delete <strong>{assetToDelete?.name}</strong> from your brand assets library?
        </p>
        {assetToDelete?.is_active && (
          <Alert variant="warning" className="py-2 px-3 small">
            <strong>Active Logo Notice:</strong> This logo is currently the active system logo. Deleting it will immediately revert your navigation header and favicon back to the default <strong>E-Botar</strong> logo.
          </Alert>
        )}
        <p className="text-muted small">
          This file will be permanently removed from storage and cannot be restored.
        </p>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button
            variant="outline-secondary"
            onClick={() => setAssetToDelete(null)}
            disabled={deletingAsset}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeleteAsset}
            disabled={deletingAsset}
          >
            {deletingAsset ? 'Deleting...' : 'Yes, Delete Asset'}
          </Button>
        </div>
      </Modal>
    </Container>
  );
};

export default BrandingSettingsPage;

