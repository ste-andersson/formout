-- Owner-set "still relevant" flag, independent of publish status. Shown to
-- respondents to distinguish forms still in active use from outdated ones;
-- an outdated form remains fully published and fillable, this only affects
-- how it's listed.
ALTER TABLE forms ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
