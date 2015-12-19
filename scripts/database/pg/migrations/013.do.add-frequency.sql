DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN frequency character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column frequency already exists in cd_dojos.';
        END;
    END;
$$
