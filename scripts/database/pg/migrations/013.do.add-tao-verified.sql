DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos ADD COLUMN tao_verified smallint NOT NULL DEFAULT 0;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column tao_verified already exists in cd_dojos.';
        END;
    END;
$$
