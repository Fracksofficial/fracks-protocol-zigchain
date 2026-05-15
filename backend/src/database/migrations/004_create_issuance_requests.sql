-- Migration: Create issuance_requests table
-- Purpose: Track token issuance requests from issuers to controllers

CREATE TABLE IF NOT EXISTS issuance_requests (
    id SERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    asset_id BIGINT NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reason TEXT,
    tx_hash VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejection_reason TEXT,
    
    UNIQUE(token_address, request_id),
    INDEX idx_token_address (token_address),
    INDEX idx_status (status),
    INDEX idx_requester (requester),
    INDEX idx_recipient (recipient),
    INDEX idx_created_at (created_at)
);

-- Create redemption_requests table
CREATE TABLE IF NOT EXISTS redemption_requests (
    id SERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    asset_id BIGINT NOT NULL,
    requester VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reason TEXT,
    tx_hash VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejection_reason TEXT,
    
    UNIQUE(token_address, request_id),
    INDEX idx_token_address (token_address),
    INDEX idx_status (status),
    INDEX idx_requester (requester),
    INDEX idx_created_at (created_at)
);

-- Create activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    wallet_address VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    tx_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_action_type (action_type),
    INDEX idx_resource_type (resource_type),
    INDEX idx_created_at (created_at)
);

-- Add comments for documentation
COMMENT ON TABLE issuance_requests IS 'Tracks token issuance requests from issuers awaiting controller approval';
COMMENT ON TABLE redemption_requests IS 'Tracks token redemption requests from holders awaiting controller approval';
COMMENT ON TABLE activity_logs IS 'Audit trail for all privileged actions on the platform';

COMMENT ON COLUMN issuance_requests.request_id IS 'On-chain request ID from the token contract';
COMMENT ON COLUMN issuance_requests.status IS 'pending | approved | rejected';
COMMENT ON COLUMN redemption_requests.status IS 'pending | approved | rejected';
COMMENT ON COLUMN activity_logs.action_type IS 'e.g., APPROVE_ISSUANCE, REJECT_REDEMPTION, UPDATE_COMPLIANCE';
