DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_usersdojos ADD COLUMN background_checked boolean DEFAULT false;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column background_checked already exists in cd_usersdojos.';
        END;
    END;
$$