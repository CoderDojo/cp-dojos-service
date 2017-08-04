DO $$
  BEGIN
    BEGIN
      ALTER TABLE cd_dojoleads DROP converted;
    EXCEPTION
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;
    BEGIN
      ALTER TABLE cd_dojoleads DROP current_step;
    EXCEPTION
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;
    BEGIN
      ALTER TABLE cd_dojoleads DROP migration;
    EXCEPTION
      WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
    END;

  END;
$$
