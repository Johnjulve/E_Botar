/**
 * ApplicationFormPage
 * Apply as a candidate for an election
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Button, Alert, LoadingSpinner } from '../../../components/common';
import { candidateService, electionService } from '../../../services';
import { isValidFileSize, isValidFileType } from '../../../utils/validators';

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.election) {
      fetchElectionPositions();
    }
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

  const fetchElectionPositions = async () => {
    try {
      const response = await electionService.getById(formData.election);
      const electionData = response.data;
      // Extract positions from election
      const positionsList = electionData.positions?.map(ep => ep.position) || [];
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
      <Container>
        <Card className="text-center">
          <i className="fas fa-check-circle text-success" style={{ fontSize: '4rem' }}></i>
          <h2 className="mt-3 mb-3">Application Submitted!</h2>
          <p className="text-muted">Your candidate application has been submitted for review.</p>
          <p className="text-muted">Redirecting to your applications...</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <Card>
            <h2 className="mb-4">
              <i className="fas fa-file-alt me-2 text-primary"></i>
              Candidate Application
            </h2>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            {elections.length === 0 ? (
              <Alert variant="info">
                <i className="fas fa-info-circle me-2"></i>
                No upcoming elections available for applications at this time.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Election Selection */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Election <span className="text-danger">*</span>
                  </label>
                  <select
                    name="election"
                    className={`form-select ${errors.election ? 'is-invalid' : ''}`}
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
                  {errors.election && <div className="invalid-feedback">{errors.election}</div>}
                </div>

                {/* Position Selection */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Position <span className="text-danger">*</span>
                  </label>
                  <select
                    name="position"
                    className={`form-select ${errors.position ? 'is-invalid' : ''}`}
                    value={formData.position}
                    onChange={handleChange}
                    disabled={!formData.election || submitting}
                  >
                    <option value="">Select Position</option>
                    {positions.map(position => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {errors.position && <div className="invalid-feedback">{errors.position}</div>}
                  {!formData.election && (
                    <small className="text-muted">Please select an election first</small>
                  )}
                </div>

                {/* Party Selection (Optional) */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Party <span className="text-muted">(Optional)</span>
                  </label>
                  <select
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
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Campaign Manifesto <span className="text-danger">*</span>
                  </label>
                  <textarea
                    name="manifesto"
                    className={`form-control ${errors.manifesto ? 'is-invalid' : ''}`}
                    rows="8"
                    value={formData.manifesto}
                    onChange={handleChange}
                    placeholder="Share your vision, goals, and plans for the position you're running for..."
                    disabled={submitting}
                  />
                  {errors.manifesto && <div className="invalid-feedback">{errors.manifesto}</div>}
                  <small className="text-muted">
                    {formData.manifesto.length} / 100 minimum characters
                  </small>
                </div>

                {/* Photo Upload */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Candidate Photo <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    className={`form-control ${errors.photo ? 'is-invalid' : ''}`}
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                  {errors.photo && <div className="invalid-feedback">{errors.photo}</div>}
                  <small className="text-muted">
                    Max file size: 5MB. Accepted formats: JPG, JPEG, PNG
                  </small>
                </div>

                {/* Submit Buttons */}
                <div className="d-flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/candidates')}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    className="flex-grow-1"
                  >
                    <i className="fas fa-paper-plane me-2"></i>
                    Submit Application
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default ApplicationFormPage;
