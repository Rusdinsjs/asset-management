-- Migration: 020_create_asset_conversions.sql
-- Description: Create table for asset conversions

CREATE TABLE asset_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., CNV-2024-001
    asset_id UUID NOT NULL REFERENCES assets(id),
    title VARCHAR(255) NOT NULL,
    
    -- Status Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed, cancelled
    
    -- Conversion Details
    from_category_id UUID REFERENCES categories(id),
    to_category_id UUID NOT NULL REFERENCES categories(id),
    target_specifications JSONB, -- New specs snapshot
    
    -- Financials
    conversion_cost DECIMAL(18, 2) DEFAULT 0,
    cost_treatment VARCHAR(50) NOT NULL DEFAULT 'capitalize', -- capitalize, expense
    
    -- Meta
    reason TEXT,
    notes TEXT,
    
    -- Actors
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    executed_by UUID REFERENCES users(id),
    
    -- Timestamps
    request_date TIMESTAMPTZ DEFAULT NOW(),
    approval_date TIMESTAMPTZ,
    execution_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_asset_conversions_asset_id ON asset_conversions(asset_id);
CREATE INDEX idx_asset_conversions_status ON asset_conversions(status);
CREATE INDEX idx_asset_conversions_request_no ON asset_conversions(request_number);

-- Trigger for updated_at
CREATE TRIGGER update_asset_conversions_updated_at BEFORE UPDATE ON asset_conversions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
