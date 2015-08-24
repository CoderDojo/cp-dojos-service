DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN migration character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column migration already exists in cd_dojoleads.';
        END;
    END;
$$
