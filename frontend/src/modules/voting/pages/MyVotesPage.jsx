/**
 * MyVotesPage
 * Display user's voting history and receipts
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { votingService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import { copyToClipboard } from '../../../utils/helpers';
import '../voting.css';

const MyVotesPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchMyReceipts();
  }, []);

  const fetchMyReceipts = async () => {
    try {
      setLoading(true);
      const response = await votingService.getMyReceipts();
      setReceipts(response.data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReceipt = async (receiptCode, receiptId) => {
    const success = await copyToClipboard(receiptCode);
    if (success) {
      setCopiedId(receiptId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your votes..." />;
  }

  return (
    <Container>
      {/* Page Header */}
      <div className="voting-page-header">
        <div className="voting-page-title">
          <div className="voting-page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span>My Voting History</span>
        </div>
        <p className="voting-page-subtitle">View your voting receipts and verify your participation</p>
      </div>

      {/* Statistics Summary */}
      {receipts.length > 0 && (
        <div className="voting-stats">
          <div className="voting-stat-card">
            <div className="voting-stat-icon total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="voting-stat-content">
              <div className="voting-stat-value">{receipts.length}</div>
              <div className="voting-stat-label">Total Votes Cast</div>
            </div>
          </div>
          <div className="voting-stat-card">
            <div className="voting-stat-icon recent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="voting-stat-content">
              <div className="voting-stat-value">
                {receipts.length > 0 ? new Date(receipts[0].created_at).getFullYear() : '-'}
              </div>
              <div className="voting-stat-label">Latest Election</div>
            </div>
          </div>
        </div>
      )}

      {/* Receipts Grid */}
      {receipts.length > 0 ? (
        <div className="receipts-grid">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="receipt-card">
              {/* Receipt Header */}
              <div className="receipt-header">
                <h3 className="receipt-election-title">
                  {receipt.election?.title || 'Election'}
                </h3>
                <div className="voted-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>Voted</span>
                </div>
              </div>

              {/* Vote Date */}
              <div className="receipt-date-row">
                <div className="receipt-date-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="receipt-info-item">
                  <div className="receipt-info-label">Voted On</div>
                  <div className="receipt-info-value">{formatDate(receipt.created_at, 'datetime')}</div>
                </div>
              </div>

              {/* Receipt Code */}
              <div className="receipt-code-section">
                <div className="receipt-code-label">Receipt Code</div>
                <div className="receipt-code-display">
                  <div className="receipt-code-text">
                    {receipt.masked_receipt_code || receipt.receipt_code}
                  </div>
                  <button
                    className="copy-code-btn"
                    onClick={() => handleCopyReceipt(receipt.receipt_code, receipt.id)}
                    title="Copy receipt code"
                  >
                    {copiedId === receipt.id ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="receipt-actions">
                <Link 
                  to={`/results/${receipt.election?.id}`}
                  className="receipt-action-btn receipt-action-primary"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>View Results</span>
                </Link>
                <Link
                  to="/verify-receipt"
                  className="receipt-action-btn receipt-action-secondary"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>Verify</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="voting-empty-state">
          <div className="voting-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h2 className="voting-empty-title">No Voting History</h2>
          <p className="voting-empty-message">
            You haven't cast any votes yet. Participate in an active election to see your voting history here.
          </p>
          <Link to="/elections" className="voting-empty-action">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>View Elections</span>
          </Link>
        </div>
      )}
    </Container>
  );
};

export default MyVotesPage;
