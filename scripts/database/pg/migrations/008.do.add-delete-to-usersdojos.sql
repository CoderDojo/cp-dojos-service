DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_usersdojos ADD COLUMN deleted smallint NOT NULL DEFAULT 0;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column deleted already exists in cd_usersdojos.';
        END;

        BEGIN
            ALTER TABLE cd_usersdojos ADD COLUMN deleted_by character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column deleted_by already exists in cd_usersdojos.';
        END;

        BEGIN
            ALTER TABLE cd_usersdojos ADD COLUMN deleted_at timestamp with time zone;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column deleted_at already exists in cd_usersdojos.';
        END;
    END;
$$
