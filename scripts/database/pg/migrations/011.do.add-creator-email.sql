DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN creator_email character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column creator_email already exists in cd_dojos.';
        END;
    END;
$$