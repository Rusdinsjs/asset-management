-- Migration: 0018_asset_lifecycle
-- Description: Asset Lifecycle Management and Transformation tables
-- Created: 2026-01-10

-- ============================================
-- ASSET LIFECYCLE HISTORY
-- Tracks all state transitions for assets
-- ============================================

CREATE TABLE IF NOT EXISTS asset_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_history_asset ON asset_lifecycle_history(asset_id);
CREATE INDEX idx_lifecycle_history_created ON asset_lifecycle_history(created_at DESC);

-- ============================================
-- ASSET CONVERSIONS
-- Tracks conversion/transformation requests
-- ============================================

CREATE TABLE IF NOT EXISTS asset_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Type changes
    from_category_id UUID REFERENCES categories(id),
    to_category_id UUID REFERENCES categories(id),
    from_subtype VARCHAR(100),
    to_subtype VARCHAR(100),
    
    -- Conversion details
    conversion_type VARCHAR(50) NOT NULL, -- 'function_change', 'upgrade', 'downgrade', 'customization', 'repurposing'
    conversion_cost DECIMAL(18,2) DEFAULT 0,
    old_specifications JSONB,
    new_specifications JSONB,
    justification TEXT NOT NULL,
    
    -- Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    executed_by UUID REFERENCES users(id),
    executed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversions_asset ON asset_conversions(asset_id);
CREATE INDEX idx_conversions_status ON asset_conversions(status);
CREATE INDEX idx_conversions_requested ON asset_conversions(requested_by);

-- ============================================
-- ASSET SPECIFICATION HISTORY
-- Tracks changes to asset specifications
-- ============================================

CREATE TABLE IF NOT EXISTS asset_specification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    conversion_id UUID REFERENCES asset_conversions(id),
    change_type VARCHAR(50) NOT NULL, -- 'conversion', 'upgrade', 'modification', 'correction'
    old_category_id UUID REFERENCES categories(id),
    new_category_id UUID REFERENCES categories(id),
    old_subtype VARCHAR(100),
    new_subtype VARCHAR(100),
    old_specifications JSONB,
    new_specifications JSONB,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spec_history_asset ON asset_specification_history(asset_id);
CREATE INDEX idx_spec_history_conversion ON asset_specification_history(conversion_id);

-- ============================================
-- UPDATE TRIGGER for asset_conversions
-- ============================================

CREATE OR REPLACE FUNCTION update_asset_conversions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_conversions_updated_at
    BEFORE UPDATE ON asset_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_conversions_updated_at();
