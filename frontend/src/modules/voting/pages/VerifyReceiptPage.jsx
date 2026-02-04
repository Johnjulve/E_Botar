/**
 * VerifyReceiptPage
 * Allow users to verify their vote receipt
 */

import React, { useState } from 'react';
import { Container } from '../../../components/layout';
import { Button, Alert } from '../../../components/common';
import { votingService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import '../voting.css';

const VerifyReceiptPage = () => {
  const [receiptCode, setReceiptCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!receiptCode.trim()) {
      setError('Please enter a receipt code');
      return;
    }

    try {
      setVerifying(true);
      const response = await votingService.verifyReceipt(receiptCode.trim());
      setResult(response.data);
    } catch (error) {
      console.error('Error verifying receipt:', error);
      setError(error.response?.data?.message || 'Receipt verification failed. The code may be invalid or expired.');
      setResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setReceiptCode('');
    setResult(null);
    setError('');
  };

  return (
    <Container>
      {/* Page Header */}
      <div className="voting-page-header">
        <div className="voting-page-title">
          <div className="voting-page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <span>Verify Vote Receipt</span>
        </div>
        <p className="voting-page-subtitle">
          Enter your receipt code to verify that your vote was properly recorded
        </p>
      </div>

      {/* Info Card */}
      <div className="verify-info-card">
        <div className="verify-info-content">
          <div className="verify-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <h4 className="verify-info-title">
              How to Verify Your Vote
            </h4>
            <ul className="verify-info-list">
              <li>After voting, you received a unique receipt code</li>
              <li>Enter this code below to verify your vote was recorded</li>
              <li>The system will confirm your vote details without revealing your choices</li>
              <li>You can verify your receipt at any time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verification Form */}
      <div className="verify-form-card">
        <form onSubmit={handleVerify}>
          <div className="verify-form-group">
            <label className="verify-form-label">
              Receipt Code *
            </label>
            <input
              type="text"
              value={receiptCode}
              onChange={(e) => setReceiptCode(e.target.value)}
              placeholder="Enter your receipt code (e.g., VR-XXXX-XXXX-XXXX-XXXX)"
              disabled={verifying || result}
              className="verify-form-input"
            />
            <small className="verify-form-help">
              Find your receipt code in "My Voting History"
            </small>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')} className="verify-alert-mb">
              {error}
            </Alert>
          )}

          {result && (
            <div className={`verify-result-card ${result.valid ? 'valid' : 'invalid'}`}>
              <div className="verify-result-content">
                <div className={`verify-result-icon ${result.valid ? 'valid' : 'invalid'}`}>
                  {result.valid ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </div>
                <div className="verify-result-text">
                  <h4 className={`verify-result-title ${result.valid ? 'valid' : 'invalid'}`}>
                    {result.valid ? '✓ Receipt Verified Successfully' : '✗ Receipt Verification Failed'}
                  </h4>
                  <p className={`verify-result-message ${result.valid ? 'valid' : 'invalid'}`}>
                    {result.message}
                  </p>
                  
                  {result.valid && result.election && (
                    <div className="verify-result-details">
                      <div className="verify-result-detail-row">
                        <strong className="verify-result-detail-label">Election:</strong>
                        <span className="verify-result-detail-value">{result.election}</span>
                      </div>
                      {result.voted_at && (
                        <div className="verify-result-detail-row">
                          <strong className="verify-result-detail-label">Voted At:</strong>
                          <span className="verify-result-detail-value">
                            {formatDate(result.voted_at, 'datetime')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="verify-actions">
            {!result ? (
              <Button 
                type="submit" 
                variant="primary"
                loading={verifying}
                disabled={verifying || !receiptCode.trim()}
                className="verify-btn-full"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="verify-icon-spacing">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Verify Receipt
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleReset}
                className="verify-btn-full"
              >
                Verify Another Receipt
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="verify-security-notice">
        <div className="verify-security-content">
          <div className="verify-security-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h4 className="verify-security-title">
              Security & Privacy
            </h4>
            <p className="verify-security-text">
              Receipt verification confirms your vote was recorded without revealing your actual choices. 
              Keep your receipt code private and secure. Never share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default VerifyReceiptPage;
