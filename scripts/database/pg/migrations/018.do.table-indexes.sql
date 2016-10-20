DO $$
  BEGIN
    BEGIN
       CREATE INDEX dojos_country ON cd_dojos((country->>'name'));
    EXCEPTION
        RAISE NOTICE 'table cd_dojos have problem with index creation on column country.';
    END;
    BEGIN
	   CREATE INDEX dojos_city ON cd_dojos((city->>'name'));
    EXCEPTION
        RAISE NOTICE 'table cd_dojos have problem with index creation on column city.';
    END;
    BEGIN
	  CREATE INDEX dojos_name ON cd_dojos(name);
    EXCEPTION
        RAISE NOTICE 'table cd_dojos have problem with index creation on column name.';
    END;
  END;
$$

