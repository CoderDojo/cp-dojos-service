DO $$
	BEGIN
		BEGIN
			ALTER TABLE cd_dojos ADD COLUMN expected_attendees smallint;
		EXCEPTION
			WHEN duplicate_column THEN RAISE NOTICE 'column expected_attendees already exists in cd_dojos.';
		END;
	END;
$$