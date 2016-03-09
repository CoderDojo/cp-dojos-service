DO $$
	BEGIN
		BEGIN
			ALTER TABLE cd_dojos ADD COLUMN attendee smallint;
		EXCEPTION
			WHEN duplicate_column THEN RAISE NOTICE 'column attendee already exists in cd_dojos.';
		END;
	END;
$$