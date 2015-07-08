DO $$ 
    BEGIN
        BEGIN
            ALTER TABLE cd_dojos DROP COLUMN location RESTRICT;
        EXCEPTION WHEN OTHERS THEN
         
            RAISE NOTICE 'The transaction is in an uncommittable state. '
                             'Transaction was rolled back';
         
            RAISE NOTICE 'Details: % %', SQLERRM, SQLSTATE;
        END;
    END;
$$