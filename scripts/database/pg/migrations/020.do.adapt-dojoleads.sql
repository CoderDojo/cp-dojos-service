DO $$
    BEGIN
        BEGIN
          ALTER TABLE cd_dojoleads ADD completed_at character varying;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column completedAt already exists in cd_dojoleads.';
          WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
        END;
    END;
$$
