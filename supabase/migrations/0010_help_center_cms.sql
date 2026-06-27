CREATE TABLE IF NOT EXISTS public.help_contents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL,
  category text NOT NULL,
  visibility text NOT NULL,
  status text NOT NULL,
  audience text NOT NULL,
  summary text NOT NULL,
  content text,
  tags text[],
  level text,
  support text NOT NULL,
  context text NOT NULL,
  duration_minutes integer,
  reading_time_minutes integer,
  video_url text,
  video_storage_path text,
  thumbnail_url text,
  attachments jsonb,
  chapters jsonb,
  cta_label text,
  cta_url text,
  seo_title text,
  seo_description text,
  author text,
  published_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.help_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public contents are viewable by everyone"
  ON public.help_contents FOR SELECT
  USING ( status = 'published' AND visibility = 'public' AND audience = 'behar_customers' );

CREATE POLICY "All contents viewable by authenticated"
  ON public.help_contents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "All contents editable by authenticated"
  ON public.help_contents FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('help-center-media', 'help-center-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Media are viewable by everyone"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'help-center-media' );

CREATE POLICY "Media are insertable by authenticated"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK ( bucket_id = 'help-center-media' );

CREATE POLICY "Media are updatable by authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated USING ( bucket_id = 'help-center-media' ) WITH CHECK ( bucket_id = 'help-center-media' );

CREATE POLICY "Media are deletable by authenticated"
  ON storage.objects FOR DELETE
  TO authenticated USING ( bucket_id = 'help-center-media' );
