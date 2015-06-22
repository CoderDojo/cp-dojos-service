DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN completed boolean;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column completed already exists in cd_dojoleads.';
        END;
    END;
$$