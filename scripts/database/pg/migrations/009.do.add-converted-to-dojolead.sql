DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN converted boolean;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column converted already exists in cd_dojoleads.';
        END;
    END;
$$
