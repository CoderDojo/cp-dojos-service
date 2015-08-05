DO $$
    BEGIN
        BEGIN
            CREATE EXTENSION IF NOT EXISTS cube;
        END;
        BEGIN
            CREATE EXTENSION IF NOT EXISTS earthdistance;
        END;
        BEGIN
            DROP INDEX IF EXISTS nearest_dojos;
            CREATE INDEX nearest_dojos on cd_dojos USING gist(ll_to_earth( (geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8));
        END;
    END;
$$
