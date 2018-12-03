DO $$
  BEGIN
    CREATE OR REPLACE VIEW v_dojoleads AS (
        SELECT lead.id, lead.email,
        lead.completed,
        lead.deleted, dojo.verified,
        COALESCE(dojo.alpha2, (lead.application->'venue')->'country'->>'alpha2')::text as "alpha2",
        COALESCE(dojo.id, (lead.application->'dojo')->>'id')::text as "dojo_id",
        dojo.stage, dojo.name as "dojo_name", dojo.email as "dojo_email",
        lead.updated_at, lead.created_at, dojo.verified_at, lead.completed_at
        FROM cd_dojoleads as lead
        LEFT JOIN cd_dojos as dojo
        ON lead.id = dojo.dojo_lead_id
      );
  END;
$$
