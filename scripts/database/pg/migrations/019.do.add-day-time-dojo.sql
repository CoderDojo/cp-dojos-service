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
            ALTER TABLE cd_dojos ADD start_time time;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column start_time already exists in cd_dojos.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
        BEGIN
            ALTER TABLE cd_dojos ADD end_time time;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column end_time already exists in cd_dojos.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
        BEGIN
            ALTER TABLE cd_dojos ADD frequency character varying;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column frequency already exists in cd_dojos.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
    END;
$$
