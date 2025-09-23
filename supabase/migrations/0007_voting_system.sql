-- Create voting tables for property governance
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('maintenance', 'rent_change', 'property_sale', 'other')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.proposal_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.proposal_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  weight INTEGER NOT NULL CHECK (weight > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- Create RLS policies
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Proposals are viewable by authenticated users"
ON public.proposals FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Proposals can be created by property owners"
ON public.proposals FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.ownership_ledger ol
    WHERE ol.property_id = property_id AND ol.user_id = auth.uid()
  )
);

CREATE POLICY "Proposals can be updated by their creators"
ON public.proposals FOR UPDATE
USING (auth.uid() = created_by);

-- Proposal options policies
CREATE POLICY "Proposal options are viewable by authenticated users"
ON public.proposal_options FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Proposal options can be created by proposal creators"
ON public.proposal_options FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Proposal options can be updated by proposal creators"
ON public.proposal_options FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id AND p.created_by = auth.uid()
  )
);

-- Votes policies
CREATE POLICY "Votes are viewable by authenticated users"
ON public.votes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can vote on active proposals if they own shares"
ON public.votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.proposals p
    JOIN public.ownership_ledger ol ON p.property_id = ol.property_id
    WHERE p.id = proposal_id
    AND ol.user_id = auth.uid()
    AND p.status = 'active'
    AND now() BETWEEN p.start_date AND p.end_date
  )
);

CREATE POLICY "Users can update their own votes"
ON public.votes FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to calculate vote weight based on ownership
CREATE OR REPLACE FUNCTION public.calculate_vote_weight(
  _user_id UUID,
  _property_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _weight INTEGER;
BEGIN
  SELECT shares_owned INTO _weight
  FROM public.ownership_ledger
  WHERE user_id = _user_id AND property_id = _property_id;

  RETURN COALESCE(_weight, 0);
END;
$$;

-- Create function to check if a proposal has ended and update its status
CREATE OR REPLACE FUNCTION public.check_proposal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status to 'completed' if end_date has passed
  UPDATE public.proposals
  SET status = 'completed', updated_at = now()
  WHERE id = NEW.id AND status = 'active' AND end_date < now();

  RETURN NEW;
END;
$$;

-- Create trigger to automatically update proposal status
CREATE TRIGGER update_proposal_status
AFTER INSERT OR UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.check_proposal_status();

-- Create view to get proposal results
CREATE OR REPLACE VIEW public.proposal_results AS
SELECT
  p.id AS proposal_id,
  p.property_id,
  p.title AS proposal_title,
  p.status,
  po.id AS option_id,
  po.title AS option_title,
  COALESCE(SUM(v.weight), 0) AS total_votes,
  COUNT(v.id) AS vote_count
FROM
  public.proposals p
LEFT JOIN
  public.proposal_options po ON p.id = po.proposal_id
LEFT JOIN
  public.votes v ON po.id = v.option_id
GROUP BY
  p.id, p.property_id, p.title, p.status, po.id, po.title
ORDER BY
  p.id, total_votes DESC;
