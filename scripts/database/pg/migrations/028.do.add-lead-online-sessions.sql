DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN online_sessions smallint NOT NULL DEFAULT 0;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column online_sessions already exists in cd_dojoleads.';
        END;
    END;
$$
