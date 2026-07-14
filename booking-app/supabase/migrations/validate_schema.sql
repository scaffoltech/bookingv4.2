-- =====================================================
-- SCHEMA VALIDATION QUERIES
-- Run these after migration to verify all columns exist
-- =====================================================

-- Check Expenses Table Columns
SELECT
  'EXPENSES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expenses'
  AND column_name IN (
    'payment_method',
    'category',
    'amount',
    'status',
    'vendor',
    'supplier_id'
  )
ORDER BY column_name;

-- Check Invoices Table Columns
SELECT
  'INVOICES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name IN (
    'amount',
    'total',
    'customer_id',
    'customer_name',
    'customer_email',
    'customer_address',
    'items',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'discount_amount',
    'payments',
    'sent_at',
    'viewed_at',
    'overdue_at'
  )
ORDER BY column_name;

-- Check Commissions Table Columns
SELECT
  'COMMISSIONS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'commissions'
  AND column_name IN (
    'quote_id',
    'invoice_id',
    'agent_id',
    'agent_name',
    'customer_id',
    'customer_name',
    'booking_amount',
    'commission_rate',
    'commission_amount',
    'payment_method',
    'transaction_id',
    'booking_type'
  )
ORDER BY column_name;

-- Summary of all tables
SELECT
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('expenses', 'invoices', 'commissions')
GROUP BY table_name
ORDER BY table_name;

-- Check for missing critical columns (should return 0 rows if migration successful)
WITH required_columns AS (
  SELECT 'expenses' as table_name, 'payment_method' as column_name
  UNION ALL SELECT 'invoices', 'customer_id'
  UNION ALL SELECT 'invoices', 'customer_name'
  UNION ALL SELECT 'invoices', 'customer_email'
  UNION ALL SELECT 'invoices', 'amount'
  UNION ALL SELECT 'commissions', 'quote_id'
  UNION ALL SELECT 'commissions', 'agent_id'
  UNION ALL SELECT 'commissions', 'customer_id'
)
SELECT
  rc.table_name,
  rc.column_name,
  'MISSING!' as status
FROM required_columns rc
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = rc.table_name
    AND c.column_name = rc.column_name
);