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
      <div className="verify-receipt-page">
        <header className="verify-page-header">
          <p className="verify-page-eyebrow">Receipt verification</p>
          <div className="verify-page-title-row">
            <div className="verify-page-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="verify-page-heading">Verify your vote</h1>
          </div>
          <p className="verify-page-lede">
            Enter the code from your voting receipt to confirm your ballot was recorded. Your selections stay private.
          </p>
        </header>

        <section className="verify-info-card" aria-labelledby="verify-how-heading">
          <div className="verify-info-content">
            <div className="verify-info-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div className="verify-info-body">
              <h2 id="verify-how-heading" className="verify-info-title">
                How it works
              </h2>
              <ul className="verify-info-list">
                <li>Each vote issues a unique receipt code.</li>
                <li>Paste the code below—we confirm it was recorded, not how you voted.</li>
                <li>Codes are listed under My Voting History.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="verify-form-card" aria-label="Enter receipt code">
          <form onSubmit={handleVerify}>
            <div className="verify-form-group">
              <label className="verify-form-label" htmlFor="verify-receipt-input">
                Receipt code
              </label>
              <input
                id="verify-receipt-input"
                type="text"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                placeholder="VR-XXXX-XXXX-XXXX-XXXX"
                disabled={verifying || result}
                className="verify-form-input"
                autoComplete="off"
                spellCheck="false"
              />
              <small className="verify-form-help">
                From My Voting History after you cast a ballot
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
                    <h3 className={`verify-result-title ${result.valid ? 'valid' : 'invalid'}`}>
                      {result.valid ? 'Receipt verified' : 'Verification failed'}
                    </h3>
                    <p className={`verify-result-message ${result.valid ? 'valid' : 'invalid'}`}>
                      {result.message}
                    </p>

                    {result.valid && result.election && (
                      <dl className="verify-result-details">
                        <div className="verify-result-detail-row">
                          <dt className="verify-result-detail-label">Election</dt>
                          <dd className="verify-result-detail-value">{result.election}</dd>
                        </div>
                        {result.voted_at && (
                          <div className="verify-result-detail-row">
                            <dt className="verify-result-detail-label">Recorded</dt>
                            <dd className="verify-result-detail-value">
                              {formatDate(result.voted_at, 'datetime')}
                            </dd>
                          </div>
                        )}
                      </dl>
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
        </section>

        <footer className="verify-security-notice">
          <div className="verify-security-content">
            <div className="verify-security-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="verify-security-body">
              <p className="verify-security-title">Privacy</p>
              <p className="verify-security-text">
                Verification only confirms that a ballot was stored. Treat your receipt code like a secret—do not share it.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Container>
  );
};

export default VerifyReceiptPage;
