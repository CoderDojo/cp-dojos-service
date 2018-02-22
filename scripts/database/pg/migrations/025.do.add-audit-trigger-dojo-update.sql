DO $$
  BEGIN
    CREATE EXTENSION pgcrypto; 
    CREATE SCHEMA IF NOT EXISTS audit;
    CREATE OR REPLACE FUNCTION audit.dojo_stage_fn() RETURNS TRIGGER AS $body$
    BEGIN
      INSERT INTO audit.dojo_stage(id, dojo_id, stage)
        VALUES (public.gen_random_uuid(), NEW.id, NEW.stage);
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
          RAISE WARNING '[AUDIT.IF_MODIFIED_FUNC] - UDF ERROR [OTHER] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
          RETURN NULL;
    END;
    $body$
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, audit;
    
    DROP TRIGGER IF EXISTS t_dojo_stage_modified ON cd_dojos;
    CREATE TRIGGER t_dojo_stage_modified 
      AFTER UPDATE OF stage ON cd_dojos
      FOR EACH ROW WHEN (OLD.stage IS DISTINCT FROM NEW.stage) EXECUTE PROCEDURE audit.dojo_stage_fn();

    DROP TRIGGER IF EXISTS t_new_dojo_stage ON cd_dojos;
    CREATE TRIGGER t_new_dojo_stage
      AFTER INSERT ON cd_dojos
      FOR EACH ROW EXECUTE PROCEDURE audit.dojo_stage_fn();
    
    CREATE TABLE IF NOT EXISTS audit.dojo_stage (
      id CHARACTER varying NOT NULL,
      dojo_id CHARACTER varying NOT NULL,
      updated_at TIMESTAMP WITH TIME zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      stage smallint NOT NULL
    ) WITH (fillfactor=100);
 
    REVOKE ALL ON audit.dojo_stage FROM public;
 
    GRANT SELECT ON audit.dojo_stage TO public;
 
    CREATE INDEX dojo_stage_tstamp_idx 
      ON audit.dojo_stage(updated_at);
    CREATE INDEX dojo_stage_dojo_id_idx
      ON audit.dojo_stage(dojo_id);
  END;
$$
