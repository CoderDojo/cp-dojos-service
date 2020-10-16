DO $$
    BEGIN
      BEGIN
        ALTER TABLE cd_dojoleads DROP online_sessions;
      EXCEPTION
        WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
      END;
      BEGIN
        ALTER TABLE cd_dojoleads DROP safeguarding_sponsor_name;
      EXCEPTION
        WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
      END;
      BEGIN
        ALTER TABLE cd_dojoleads DROP safeguarding_sponsor_email;
      EXCEPTION
        WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
      END;
    END;
$$
