DO $$
  BEGIN
    BEGIN
      ALTER TABLE cd_dojoleads ADD completed_at timestamp;
    EXCEPTION
      WHEN duplicate_column THEN RAISE NOTICE 'column completedAt already exists in cd_dojoleads.';
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;
    BEGIN
      ALTER TABLE cd_dojoleads ADD created_at timestamp;
    EXCEPTION
      WHEN duplicate_column THEN RAISE NOTICE 'column createdAt already exists in cd_dojoleads.';
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;
    BEGIN
      ALTER TABLE cd_dojoleads ADD updated_at timestamp;
    EXCEPTION
      WHEN duplicate_column THEN RAISE NOTICE 'column updatedAt already exists in cd_dojoleads.';
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;
  END;
$$
