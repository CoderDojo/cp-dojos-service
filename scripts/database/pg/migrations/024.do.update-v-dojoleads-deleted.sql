DO $$
  BEGIN
    CREATE OR REPLACE VIEW v_dojoleads AS (
        SELECT lead.id, lead.email,
        lead.completed,
        (CASE
          WHEN (dojo.id IS NOT NULL) THEN dojo.deleted
          ELSE lead.deleted
        END) as deleted, dojo.verified,
        (lead.application->'venue')->'country'->>'alpha2' as "alpha2",
        (lead.application->'dojo')->>'id' as "dojo_id",
        dojo.stage, dojo.name as "dojo_name", dojo.email as "dojo_email",
        lead.updated_at, lead.created_at, dojo.verified_at, lead.completed_at
        FROM cd_dojoleads as lead
        LEFT JOIN cd_dojos as dojo
        ON lead.id = dojo.dojo_lead_id
      );
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Unhandled error: % %', SQLERRM, SQLSTATE;
  END;
$$
