-- Additive/constraint-relaxing launch routing migration. Apply explicitly;
-- do not use a destructive schema push.
DROP INDEX IF EXISTS uq_market_vertical_rank_preferred;
CREATE UNIQUE INDEX IF NOT EXISTS uq_market_vertical_rank_preferred
  ON market_vertical_rank(vertical_key, product, rank) WHERE rank IN ('1','2','3');

ALTER TABLE deal_markets
  ADD COLUMN IF NOT EXISTS vertical_snapshot text,
  ADD COLUMN IF NOT EXISTS assignment_product text,
  ADD COLUMN IF NOT EXISTS vertical_rank text,
  ADD COLUMN IF NOT EXISTS engagement_source text NOT NULL DEFAULT 'RATED',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS market_status text NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS is_selected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_email_snapshot text;

ALTER TABLE deal_markets ALTER COLUMN generated_rate DROP NOT NULL;
ALTER TABLE deal_markets ALTER COLUMN rank DROP NOT NULL;

-- Preserve the pre-launch lifecycle when adding launch columns. Existing
-- routed/sent rows remain active and available rows are not accidentally
-- represented as newly available launch engagements.
UPDATE deal_markets
SET
  is_active = (is_routed OR send_status IN ('SENT','FAILED','DELIVERY_UNKNOWN')),
  market_status = CASE
    WHEN is_primary THEN 'SELECTED'
    WHEN send_status = 'SENT' THEN 'SENT'
    WHEN is_routed OR send_status IN ('FAILED','DELIVERY_UNKNOWN') THEN 'ACTIVE'
    ELSE 'AVAILABLE'
  END,
  is_selected = is_primary,
  vertical_rank = CASE
    WHEN rank IN (1,2,3) THEN rank::text
    ELSE NULL
  END,
  engagement_source = 'RATED'
WHERE engagement_source = 'RATED';
ALTER TABLE deal_markets
  DROP CONSTRAINT IF EXISTS chk_dm_rank_routed_equiv,
  DROP CONSTRAINT IF EXISTS chk_dm_primary_rank1_equiv,
  DROP CONSTRAINT IF EXISTS chk_dm_rank_positive,
  DROP CONSTRAINT IF EXISTS chk_dm_rate_nonneg;
DROP INDEX IF EXISTS uq_deal_markets_deal_rank;
CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_markets_deal_rank
  ON deal_markets(deal_id, rank) WHERE rank IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_markets_selected
  ON deal_markets(deal_id) WHERE is_selected = true;
ALTER TABLE deal_markets
  ADD CONSTRAINT chk_dm_rank_positive CHECK (rank IS NULL OR rank > 0),
  ADD CONSTRAINT chk_dm_rate_nonneg CHECK (generated_rate IS NULL OR generated_rate >= 0),
  ADD CONSTRAINT chk_dm_vertical_rank CHECK (vertical_rank IS NULL OR vertical_rank IN ('1','2','3','E')),
  ADD CONSTRAINT chk_dm_assignment_product CHECK (assignment_product IS NULL OR assignment_product IN ('PEO','ASO','WC','PEO+WC')),
  ADD CONSTRAINT chk_dm_engagement_source CHECK (engagement_source IN ('AUTO_PREFERRED','MANUAL_OVERFLOW','AXEL_KEEP','RATED')),
  ADD CONSTRAINT chk_dm_market_status CHECK (market_status IN ('AVAILABLE','ACTIVE','SENT','QUOTE_RECEIVED','DECLINED','NO_RESPONSE','SELECTED'));

ALTER TABLE dispatch_batches
  ADD COLUMN IF NOT EXISTS batch_kind text NOT NULL DEFAULT 'INITIAL',
  ADD COLUMN IF NOT EXISTS is_launch_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_deal_market_id uuid REFERENCES deal_markets(id);
DROP INDEX IF EXISTS uq_dispatch_batches_deal_live;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatch_batches_initial
  ON dispatch_batches(deal_id)
  WHERE batch_kind = 'INITIAL' AND status NOT IN ('CANCELLED','COMPLETE');
DROP INDEX IF EXISTS uq_dispatch_batches_promotion_market;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatch_batches_promotion_market
  ON dispatch_batches(promoted_deal_market_id)
  WHERE promoted_deal_market_id IS NOT NULL AND status <> 'CANCELLED';
ALTER TABLE dispatch_batches
  ADD CONSTRAINT chk_db_kind CHECK (batch_kind IN ('INITIAL','OVERFLOW')),
  ADD CONSTRAINT chk_db_promotion_kind CHECK ((batch_kind = 'OVERFLOW') = (promoted_deal_market_id IS NOT NULL));