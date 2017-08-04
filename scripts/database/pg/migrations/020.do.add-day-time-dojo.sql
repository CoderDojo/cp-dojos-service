DO $$
    BEGIN
        BEGIN
          ALTER TABLE cd_dojos ADD day smallint
          CONSTRAINT day_range CHECK (day >= 1 AND day <= 7);
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

        BEGIN
          ALTER TABLE cd_dojos RENAME "time" TO alternative_frequency;
        EXCEPTION
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;

        BEGIN
          UPDATE cd_dojos SET frequency = 'other' WHERE alternative_frequency IS NOT NULL;
        EXCEPTION
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;

    END;
$$
