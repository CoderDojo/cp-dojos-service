DO $$
    BEGIN
        BEGIN
        -- TODO: This should be added later on : NOT NULL DEFAULT 0
            ALTER TABLE cd_dojos ADD day smallint
            CONSTRAINT day_range CHECK (day >= 0 AND day <= 6);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column day already exists in cd_dojos.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
        BEGIN
        -- TODO: This should be added later on : NOT NULL DEFAULT NOW()
            ALTER TABLE cd_dojos ADD hour timestamp;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column time already exists in cd_dojos.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
    END;
$$
