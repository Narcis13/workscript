-- FlexDB Full-Text Search Index
-- This migration adds a FULLTEXT index on flex_records.search_text
-- Required for performant MATCH AGAINST queries in FlexQueryBuilder
-- Drizzle doesn't support FULLTEXT indexes natively, hence raw SQL

CREATE FULLTEXT INDEX IF NOT EXISTS flex_records_search_idx ON flex_records(search_text);
