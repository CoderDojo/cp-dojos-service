DO $$
	BEGIN
		BEGIN
			ALTER TABLE cd_polls ADD COLUMN started_at timestamp with time zone;
		EXCEPTION
			WHEN duplicate_column THEN RAISE NOTICE 'column started_at already exists in cd_polls.';
		END;
	END;
$$
