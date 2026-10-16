BEGIN;

-- Preview for BE-03: align assessments with the wizard schema.
-- This is a review-only migration preview; it is not applied to the live database.

ALTER TABLE public.assessments ADD COLUMN workspace_id UUID NULL;
ALTER TABLE public.assessments ADD COLUMN name TEXT NULL;
ALTER TABLE public.assessments ADD COLUMN status TEXT NULL DEFAULT 'Draft';
ALTER TABLE public.assessments ADD COLUMN wizard_input JSONB NULL;
ALTER TABLE public.assessments ADD COLUMN updated_at TIMESTAMPTZ NULL DEFAULT NOW();
ALTER TABLE public.assessments ADD COLUMN source TEXT NULL DEFAULT 'wizard';
ALTER TABLE public.assessments ADD COLUMN currency TEXT NULL DEFAULT 'USD';

ALTER TABLE public.assessments
    ADD CONSTRAINT fk_assessments_workspace_id_workspaces
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.assessments ALTER COLUMN input_data DROP NOT NULL;
ALTER TABLE public.assessments ALTER COLUMN roi_results DROP NOT NULL;
ALTER TABLE public.assessments ALTER COLUMN scoring_engine_version SET DEFAULT 'wizard-v1-unscored';

ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_status_check
    CHECK (status IN ('Draft', 'In progress', 'Completed', 'Archived'));

ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_currency_check
    CHECK (currency = 'USD');

CREATE INDEX ix_assessments_workspace_id_created_at
    ON public.assessments (workspace_id, created_at DESC);

COMMIT;
