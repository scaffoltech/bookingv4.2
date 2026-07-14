# Database Schema Migration Guide

## Problem Summary
The application is experiencing database errors because the code expects columns that don't exist in the current Supabase database schema:

- **Expenses**: Missing `payment_method` column
- **Invoices**: Missing customer-related columns and using wrong column names
- **Commissions**: Missing `quote_id` and many other columns

## Migration Files

### 1. `001_fix_schema_mismatches.sql`
Main migration file that adds all missing columns to fix the schema mismatches.

### 2. `validate_schema.sql`
Validation queries to verify the migration was successful.

## How to Apply the Migration

### Step 1: Backup Your Database (Recommended)
Before running any migrations, it's recommended to create a backup of your database.

### Step 2: Run the Migration

1. Open your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy the entire contents of `001_fix_schema_mismatches.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the migration

### Step 3: Validate the Migration

1. In the same SQL Editor
2. Copy the contents of `validate_schema.sql`
3. Run each query to verify all columns were created successfully
4. The last query should return **0 rows** if all required columns exist

### Step 4: Test Your Application

After migration, test the following features:
- Creating/updating expenses with payment methods
- Generating invoices from quotes
- Creating commissions from bookings
- Payment confirmations

## What This Migration Does

### Expenses Table
- ✅ Adds `payment_method` column with proper constraints

### Invoices Table
- ✅ Adds customer columns: `customer_id`, `customer_name`, `customer_email`, `customer_address`
- ✅ Adds `amount` as a generated column (alias for `total`)
- ✅ Adds financial columns: `items`, `subtotal`, `tax_rate`, `tax_amount`, `discount_amount`
- ✅ Adds tracking columns: `payments`, `sent_at`, `viewed_at`, `overdue_at`
- ✅ Adds `notes` and `terms` columns

### Commissions Table
- ✅ Adds `quote_id` and `invoice_id` columns
- ✅ Adds agent columns: `agent_id`, `agent_name`
- ✅ Adds customer columns: `customer_id`, `customer_name`
- ✅ Adds financial columns: `booking_amount`, `commission_rate`, `commission_amount`
- ✅ Adds payment columns: `payment_method`, `transaction_id`
- ✅ Adds `booking_type` column

## Safety Features

- All column additions use `IF NOT EXISTS` checks to prevent errors if columns already exist
- Migration is idempotent - safe to run multiple times
- Preserves existing data
- Adds proper foreign key constraints and indexes

## Troubleshooting

If you encounter errors:

1. **"relation does not exist"**: Make sure the base tables (expenses, invoices, commissions) exist first
2. **"column already exists"**: This is safe to ignore - the migration checks for existing columns
3. **Permission errors**: Ensure you're running the migration with proper database permissions

## Next Steps

After successful migration:
1. Monitor application logs for any remaining errors
2. Consider updating TypeScript types to match the new schema
3. Review and consolidate conflicting schema files in the codebase