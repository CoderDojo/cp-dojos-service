CREATE TABLE IF NOT EXISTS cd_polls
(
  id character varying NOT NULL,
	question character varying NOT NULL,
  value_unity character varying NOT NULL,
	max_answers integer,
	end_date timestamp with time zone,
	CONSTRAINT pk_cd_polls_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE TABLE IF NOT EXISTS cd_polls_results
(
  id character varying NOT NULL,
	poll_id character varying NOT NULL,
	dojo_id character varying NOT NULL REFERENCES cd_dojos (id),
  created_at timestamp with time zone,
	value integer NOT NULL,
  CONSTRAINT pk_cd_polls_answers_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
