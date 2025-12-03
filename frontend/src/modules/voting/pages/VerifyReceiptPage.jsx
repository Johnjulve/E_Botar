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
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#2563eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1e40af', fontSize: '1rem', fontWeight: 600 }}>
              How to Verify Your Vote
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <li>After voting, you received a unique receipt code</li>
              <li>Enter this code below to verify your vote was recorded</li>
              <li>The system will confirm your vote details without revealing your choices</li>
              <li>You can verify your receipt at any time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verification Form */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Receipt Code *
            </label>
            <input
              type="text"
              value={receiptCode}
              onChange={(e) => setReceiptCode(e.target.value)}
              placeholder="Enter your receipt code (e.g., VR-XXXX-XXXX-XXXX-XXXX)"
              disabled={verifying || result}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
              Find your receipt code in "My Voting History"
            </small>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')} style={{ marginBottom: '1.5rem' }}>
              {error}
            </Alert>
          )}

          {result && (
            <div style={{
              background: result.valid ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${result.valid ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: result.valid ? '#22c55e' : '#ef4444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
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
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 0.75rem',
                    color: result.valid ? '#166534' : '#991b1b',
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}>
                    {result.valid ? '✓ Receipt Verified Successfully' : '✗ Receipt Verification Failed'}
                  </h4>
                  <p style={{
                    margin: '0 0 1rem',
                    color: result.valid ? '#15803d' : '#b91c1c',
                    fontSize: '0.9rem'
                  }}>
                    {result.message}
                  </p>
                  
                  {result.valid && result.election && (
                    <div style={{
                      background: 'white',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.5rem',
                      padding: '1rem'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#166534' }}>Election:</strong>
                        <span style={{ marginLeft: '0.5rem', color: '#15803d' }}>{result.election}</span>
                      </div>
                      {result.voted_at && (
                        <div>
                          <strong style={{ color: '#166534' }}>Voted At:</strong>
                          <span style={{ marginLeft: '0.5rem', color: '#15803d' }}>
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

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {!result ? (
              <Button 
                type="submit" 
                variant="primary"
                loading={verifying}
                disabled={verifying || !receiptCode.trim()}
                style={{ flex: 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
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
                style={{ flex: 1 }}
              >
                Verify Another Receipt
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div style={{
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '0.75rem',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#eab308',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1rem', fontWeight: 600 }}>
              Security & Privacy
            </h4>
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.9rem', lineHeight: '1.6' }}>
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
