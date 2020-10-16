DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN safeguarding_sponsor_name character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column safeguarding_sponsor_name already exists in cd_dojos.';
        END;
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN safeguarding_sponsor_email character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column safeguarding_sponsor_email already exists in cd_dojos.';
        END;
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN safeguarding_sponsor_name character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column safeguarding_sponsor_name already exists in cd_dojoleads.';
        END;
        BEGIN
            ALTER TABLE cd_dojoleads ADD COLUMN safeguarding_sponsor_email character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column safeguarding_sponsor_email already exists in cd_dojoleads.';
        END;
    END;
$$
