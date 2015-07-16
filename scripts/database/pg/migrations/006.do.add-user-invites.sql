DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN user_invites json[];
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column user_invites already exists in cd_dojos.';
        END;
    END;
$$
