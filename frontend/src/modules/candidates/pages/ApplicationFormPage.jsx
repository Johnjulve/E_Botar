/**
 * ApplicationFormPage
 * Apply as a candidate for an election
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService, electionService } from '../../../services';
import { isValidFileSize, isValidFileType } from '../../../utils/validators';
import './applications.css';

const ApplicationFormPage = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [positions, setPositions] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    election: '',
    position: '',
    party: '',
    manifesto: '',
    photo: null
  });
  const [errors, setErrors] = useState({});

  const extractPositionsFromElection = (electionData) => {
    if (!electionData) return [];

    if (Array.isArray(electionData.election_positions)) {
      return electionData.election_positions
        .filter((ep) => ep?.position && (ep.is_enabled ?? true))
        .map((ep) => ({
          ...ep.position,
          order: ep.order ?? ep.position?.display_order ?? 0,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    if (Array.isArray(electionData.positions)) {
      return electionData.positions
        .map((ep) => ep?.position || ep)
        .filter(Boolean);
    }

    return [];
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!formData.election) {
      setPositions([]);
      if (formData.position) {
        setFormData((prev) => ({ ...prev, position: '' }));
      }
      return;
    }

    setPositions([]);
    setFormData((prev) => ({ ...prev, position: '' }));
    fetchElectionPositions(formData.election);
  }, [formData.election]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [electionsRes, partiesRes] = await Promise.all([
        electionService.getUpcoming(),
        electionService.getAllParties()
      ]);
      setElections(electionsRes.data || []);
      setParties(partiesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  const fetchElectionPositions = async (electionId) => {
    try {
      const response = await electionService.getById(electionId);
      const electionData = response.data;
      // Extract positions from election
      const positionsList = extractPositionsFromElection(electionData);
      setPositions(positionsList);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      if (!isValidFileSize(file, 5)) {
        setErrors(prev => ({ ...prev, photo: 'File size must be less than 5MB' }));
        return;
      }
      if (!isValidFileType(file)) {
        setErrors(prev => ({ ...prev, photo: 'Only JPG, JPEG, and PNG files are allowed' }));
        return;
      }
      setFormData(prev => ({ ...prev, photo: file }));
      setErrors(prev => ({ ...prev, photo: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.election) newErrors.election = 'Please select an election';
    if (!formData.position) newErrors.position = 'Please select a position';
    if (!formData.manifesto.trim()) newErrors.manifesto = 'Campaign manifesto is required';
    if (formData.manifesto.length < 100) newErrors.manifesto = 'Manifesto must be at least 100 characters';
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      
      const applicationData = {
        election: parseInt(formData.election),
        position: parseInt(formData.position),
        party: formData.party ? parseInt(formData.party) : null,
        manifesto: formData.manifesto,
        photo: formData.photo
      };

      await candidateService.submitApplication(applicationData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/my-applications');
      }, 2000);
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(error.response?.data?.detail || error.response?.data?.error || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading application form..." />;
  }

  if (success) {
    return (
      <div className="application-form-page">
        <Container>
          <div className="success-state">
            <div className="success-icon">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>Application Submitted!</h2>
            <p>Your candidate application has been submitted for review.</p>
            <p>Redirecting to your applications...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="application-form-page">
      <Container>
        <div className="form-container">
          <div className="form-card">
            <h2>Candidate Application</h2>

            {error && (
              <div className="alert-message error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
                <button onClick={() => setError('')} className="alert-close">×</button>
              </div>
            )}

            {elections.length === 0 ? (
              <div className="alert-message info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>No upcoming elections available for applications at this time.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Election Selection */}
                <div className="form-group">
                  <label htmlFor="election" className="form-label">
                    Election <span className="required">*</span>
                  </label>
                  <select
                    id="election"
                    name="election"
                    className={`form-select ${errors.election ? 'error' : ''}`}
                    value={formData.election}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.id} value={election.id}>
                        {election.title}
                      </option>
                    ))}
                  </select>
                  {errors.election && <span className="form-error">{errors.election}</span>}
                </div>

                {/* Position Selection */}
                <div className="form-group">
                  <label htmlFor="position" className="form-label">
                    Position <span className="required">*</span>
                  </label>
                  <select
                    id="position"
                    name="position"
                    className={`form-select ${errors.position ? 'error' : ''}`}
                    value={formData.position}
                    onChange={handleChange}
                    disabled={!formData.election || submitting || positions.length === 0}
                  >
                    <option value="">Select Position</option>
                    {positions.map(position => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {errors.position && <span className="form-error">{errors.position}</span>}
                  {!formData.election && (
                    <span className="form-help">Please select an election first</span>
                  )}
                  {formData.election && positions.length === 0 && !errors.position && (
                    <span className="form-help">No positions available for the selected election.</span>
                  )}
                </div>

                {/* Party Selection */}
                <div className="form-group">
                  <label htmlFor="party" className="form-label">
                    Party <span className="optional">(Optional)</span>
                  </label>
                  <select
                    id="party"
                    name="party"
                    className="form-select"
                    value={formData.party}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="">Independent (No Party)</option>
                    {parties.map(party => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campaign Manifesto */}
                <div className="form-group">
                  <label htmlFor="manifesto" className="form-label">
                    Campaign Manifesto <span className="required">*</span>
                  </label>
                  <textarea
                    id="manifesto"
                    name="manifesto"
                    className={`form-textarea ${errors.manifesto ? 'error' : ''}`}
                    rows="10"
                    value={formData.manifesto}
                    onChange={handleChange}
                    placeholder="Share your vision, goals, and plans for the position you're running for..."
                    disabled={submitting}
                  />
                  {errors.manifesto && <span className="form-error">{errors.manifesto}</span>}
                  <span className="character-count">
                    {formData.manifesto.length} / 100 minimum characters
                  </span>
                </div>

                {/* Photo Upload */}
                <div className="form-group">
                  <label htmlFor="photo" className="form-label">
                    Candidate Photo <span className="optional">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    id="photo"
                    className={`form-input ${errors.photo ? 'error' : ''}`}
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                  {errors.photo && <span className="form-error">{errors.photo}</span>}
                  <span className="form-help">
                    Max file size: 5MB. Accepted formats: JPG, JPEG, PNG
                  </span>
                </div>

                {/* Submit Buttons */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => navigate('/candidates')}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ApplicationFormPage;
