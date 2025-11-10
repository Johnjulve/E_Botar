/**
 * VotingPage
 * Ballot submission interface
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Button, Alert, LoadingSpinner, EmptyState, Modal } from '../../../components/common';
import { electionService, candidateService, votingService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import { useAuth } from '../../../hooks/useAuth';

const VotingPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState({});  // { positionId: candidateId }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const isPreview = (searchParams.get('preview') === '1' || searchParams.get('preview') === 'true') && isAdmin;
  const isAdminBypassActive = isAdmin && !isPreview;

  useEffect(() => {
    fetchVotingData();
  }, [id]);

  const fetchVotingData = async () => {
    try {
      setLoading(true);
      
      // Check if user has already voted (skip in admin preview)
      if (!isPreview) {
        const voteStatus = await votingService.getVoteStatus(id);
        if (voteStatus.data.has_voted) {
          setHasVoted(true);
          setLoading(false);
          return;
        }
      }
      
      // Fetch election
      const electionResponse = await electionService.getById(id);
      const electionData = electionResponse.data;
      setElection(electionData);
      
      // Check if election is active (allow admins in preview mode)
      // Note: is_active_now is calculated on backend using timezone-aware datetime
      const isElectionActive = electionData.is_active_now !== undefined 
        ? electionData.is_active_now 
        : (electionData.status === 'ongoing');
      
      if (!isElectionActive && !isPreview && !isAdminBypassActive) {
        const statusMsg = electionData.status === 'upcoming' 
          ? 'This election has not started yet.'
          : electionData.status === 'finished'
          ? 'This election has ended.'
          : 'This election is not currently active for voting.';
        setError(statusMsg);
        setLoading(false);
        return;
      }
      
      // Fetch candidates
      const candidatesResponse = await candidateService.getByElection(id);
      setCandidates(candidatesResponse.data || []);
    } catch (error) {
      console.error('Error fetching voting data:', error);
      setError('Failed to load voting information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupCandidatesByPosition = () => {
    const grouped = {};
    candidates.forEach(candidate => {
      const positionId = candidate.position?.id;
      const positionName = candidate.position?.name || 'Unknown Position';
      if (!grouped[positionId]) {
        grouped[positionId] = {
          position: candidate.position,
          candidates: []
        };
      }
      grouped[positionId].candidates.push(candidate);
    });
    return grouped;
  };

  const handleVoteChange = (positionId, candidateId) => {
    setVotes(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
    setError('');
  };

  const validateVotes = () => {
    const candidatesByPosition = groupCandidatesByPosition();
    const positions = Object.keys(candidatesByPosition);
    
    if (positions.length === 0) {
      setError('No positions available for voting.');
      return false;
    }
    
    // Check if all positions have a vote
    for (const positionId of positions) {
      if (!votes[positionId]) {
        setError('Please select a candidate for all positions before submitting.');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateVotes()) {
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      // Prepare ballot data
      const ballotData = {
        election_id: parseInt(id),
        votes: Object.entries(votes).map(([positionId, candidateId]) => ({
          position_id: parseInt(positionId),
          candidate_id: parseInt(candidateId)
        }))
      };
      
      // Submit ballot
      const response = await votingService.submitBallot(ballotData);
      
      setSuccess(true);
      setReceipt(response.data.receipt_code);
      setShowConfirmModal(false);
      
      // Redirect to receipt page after 3 seconds
      setTimeout(() => {
        navigate('/my-votes');
      }, 3000);
    } catch (error) {
      console.error('Error submitting ballot:', error);
      setError(error.response?.data?.detail || 'Failed to submit ballot. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading ballot..." />;
  }

  if (hasVoted && !isPreview) {
    return (
      <Container>
        <EmptyState
          icon="fas fa-check-circle"
          title="You've Already Voted"
          message="You have already cast your vote in this election. Thank you for participating!"
          actionText="View My Votes"
          onAction={() => navigate('/my-votes')}
        />
      </Container>
    );
  }

  if (error && !election) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => navigate('/elections')}>Back to Elections</Button>
      </Container>
    );
  }

  if (success) {
    return (
      <Container>
        <Card className="text-center">
          <i className="fas fa-check-circle text-success" style={{ fontSize: '4rem' }}></i>
          <h2 className="mt-3 mb-3">Vote Submitted Successfully!</h2>
          <p className="text-muted mb-3">Your vote has been securely recorded.</p>
          {receipt && (
            <div className="alert alert-info">
              <strong>Receipt Code:</strong> {receipt}
              <p className="small mb-0 mt-2">Save this code to verify your vote later.</p>
            </div>
          )}
          <p className="text-muted">Redirecting to your votes...</p>
        </Card>
      </Container>
    );
  }

  const candidatesByPosition = groupCandidatesByPosition();

  return (
    <Container>
      <div className="mb-4">
        <h1>
          <i className="fas fa-vote-yea me-2 text-success"></i>
          Cast Your Vote
        </h1>
        <h4 className="text-muted">{election?.title}</h4>
        <p className="text-muted small">
          <i className="fas fa-calendar-alt me-1"></i>
          Voting ends: {formatDate(election?.end_date, 'datetime')}
        </p>
        {isPreview && (
          <Alert variant="warning" className="mt-2">
            <i className="fas fa-eye me-2"></i>
            Preview Mode (Admin): You can review the ballot layout, but submission is disabled.
          </Alert>
        )}
        {!election?.is_active_now && isAdminBypassActive && (
          <Alert variant="warning" className="mt-2">
            <i className="fas fa-exclamation-circle me-2"></i>
            Admin Override: This election is currently inactive. Your test vote will still be recorded.
          </Alert>
        )}
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Voting Instructions */}
      <Alert variant="info" className="mb-4">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Instructions:</strong> Select one candidate for each position. Once submitted, votes cannot be changed.
      </Alert>

      {/* Ballot */}
      {Object.keys(candidatesByPosition).length > 0 ? (
        <div className="mb-4">
          {Object.entries(candidatesByPosition).map(([positionId, data]) => (
            <Card key={positionId} className="mb-4">
              <div className="mb-4 pb-3 border-bottom">
                <h4 className="mb-0" style={{ color: '#1a202c', fontWeight: '600', fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {data.position.name}
                </h4>
                <p className="text-muted small mb-0 mt-1">Select one candidate</p>
              </div>
              
              <div className="d-grid gap-2">
                {data.candidates.map(candidate => (
                  <div 
                    key={candidate.id}
                    className={`p-3 border rounded ${
                      votes[positionId] === candidate.id ? 'border-dark border-2' : ''
                    }`}
                    onClick={() => handleVoteChange(positionId, candidate.id)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: votes[positionId] === candidate.id ? '#f8f9fa' : 'white'
                    }}
                  >
                    <div className="form-check d-flex align-items-center">
                      <input
                        type="radio"
                        className="form-check-input mt-0"
                        name={`position-${positionId}`}
                        id={`candidate-${candidate.id}`}
                        checked={votes[positionId] === candidate.id}
                        onChange={() => handleVoteChange(positionId, candidate.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label w-100 ms-3" htmlFor={`candidate-${candidate.id}`} style={{ cursor: 'pointer' }}>
                        <div className="fw-semibold" style={{ fontSize: '1rem', color: '#2d3748' }}>
                          {candidate.user?.first_name} {candidate.user?.last_name}
                        </div>
                        {candidate.party && (
                          <div className="small mt-1" style={{ color: '#718096' }}>
                            {candidate.party.name}
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-inbox"
          title="No Candidates Available"
          message="There are no candidates registered for this election yet."
        />
      )}

      {/* Submit Button */}
      {Object.keys(candidatesByPosition).length > 0 && (
        <div className="d-flex gap-2 justify-content-center">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/elections/${id}`)}
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            size="lg"
            onClick={isPreview ? () => setError('Submission is disabled in preview mode.') : handleSubmit}
            disabled={isPreview || Object.keys(votes).length === 0}
          >
            <i className="fas fa-paper-plane me-2"></i>
            Submit Ballot
          </Button>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        title="Confirm Your Vote"
        confirmText="Submit Vote"
        cancelText="Review Again"
        onConfirm={isPreview ? () => setShowConfirmModal(false) : confirmSubmit}
        confirmVariant="success"
        confirmLoading={submitting}
      >
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Important:</strong> Once submitted, your vote cannot be changed. Please review your selections carefully.
        </Alert>
        
        <h6 className="mb-3">Your Selections:</h6>
        {Object.entries(votes).map(([positionId, candidateId]) => {
          const positionData = candidatesByPosition[positionId];
          const selectedCandidate = positionData?.candidates.find(c => c.id === candidateId);
          return (
            <div key={positionId} className="mb-2">
              <strong>{positionData?.position.name}:</strong>
              <span className="ms-2">
                {selectedCandidate?.user?.first_name} {selectedCandidate?.user?.last_name}
              </span>
            </div>
          );
        })}
      </Modal>
    </Container>
  );
};

export default VotingPage;
