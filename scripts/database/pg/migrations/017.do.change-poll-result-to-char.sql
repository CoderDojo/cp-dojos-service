DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_polls_results ALTER COLUMN value TYPE character varying;
        EXCEPTION WHEN OTHERS THEN

            RAISE NOTICE 'The transaction is in an uncommittable state. '
                             'Transaction was rolled back';

            RAISE NOTICE 'Details: % %', SQLERRM, SQLSTATE;
        END;
    END;
$$
