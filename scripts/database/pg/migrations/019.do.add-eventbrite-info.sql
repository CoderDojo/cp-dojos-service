DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN eventbrite_token character varying ;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column eventbrite_token already exists in cd_dojos.';
        END;

        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN eventbrite_wh_id character varying ;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column eventbrite_wh_id already exists in cd_dojos.';
        END;

        BEGIN
          ALTER TABLE cd_dojos DROP COLUMN IF EXISTS eb_id;
        END;
    END;
$$
