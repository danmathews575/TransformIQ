BEGIN;

CREATE TABLE public.alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> aa8bd5c84595

CREATE TABLE assessments (
    id UUID NOT NULL, 
    input_data JSONB NOT NULL, 
    roi_results JSONB NOT NULL, 
    scoring_engine_version VARCHAR(30) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE opportunity_rankings (
    id SERIAL NOT NULL, 
    assessment_id UUID NOT NULL, 
    opportunity_name VARCHAR(200) NOT NULL, 
    score FLOAT NOT NULL, 
    rank INTEGER NOT NULL, 
    details JSONB NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(assessment_id) REFERENCES assessments (id) ON DELETE CASCADE
);

CREATE INDEX ix_opportunity_rankings_assessment_id ON opportunity_rankings (assessment_id);

INSERT INTO public.alembic_version (version_num) VALUES ('aa8bd5c84595') RETURNING public.alembic_version.version_num;

-- Running upgrade aa8bd5c84595 -> 007fbcd17f49

CREATE TABLE public.workspaces (
    id UUID DEFAULT gen_random_uuid() NOT NULL, 
    name TEXT NOT NULL, 
    slug TEXT NOT NULL, 
    industry TEXT, 
    country_code TEXT, 
    default_currency TEXT DEFAULT 'USD' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (slug)
);

ALTER TABLE public."workspaces" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."workspaces" FROM anon, authenticated;

CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() NOT NULL, 
    full_name TEXT, 
    role TEXT DEFAULT 'admin' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, 
    PRIMARY KEY (id)
);

ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."profiles" FROM anon, authenticated;

CREATE TABLE public.workspace_memberships (
    id UUID DEFAULT gen_random_uuid() NOT NULL, 
    workspace_id UUID NOT NULL, 
    profile_id UUID, 
    role TEXT DEFAULT 'admin' NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE, 
    CONSTRAINT uq_workspace_memberships_workspace_profile UNIQUE (workspace_id, profile_id)
);

ALTER TABLE public."workspace_memberships" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."workspace_memberships" FROM anon, authenticated;

ALTER TABLE public.workspaces ADD COLUMN source TEXT;

ALTER TABLE public.profiles ADD COLUMN source TEXT;

ALTER TABLE public.workspace_memberships ADD COLUMN source TEXT;

UPDATE public.alembic_version SET version_num='007fbcd17f49' WHERE public.alembic_version.version_num = 'aa8bd5c84595';

-- Running upgrade 007fbcd17f49 -> ce6a47d3ee49

ALTER TABLE public."assessments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."assessments" FROM anon, authenticated;

ALTER TABLE public."opportunity_rankings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."opportunity_rankings" FROM anon, authenticated;

UPDATE public.alembic_version SET version_num='ce6a47d3ee49' WHERE public.alembic_version.version_num = '007fbcd17f49';

COMMIT;

