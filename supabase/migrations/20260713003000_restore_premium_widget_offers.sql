-- Restore the two commercial offers requested for every existing widget while
-- preserving any workshop that already configured its own offer list.
do $$
declare
  default_offers jsonb := jsonb_build_object(
    'enabled', true,
    'title', 'Offres et avantages',
    'subtitle', 'Ajoutez une option à votre réparation',
    'introduction', 'Sélectionnez uniquement ce qui vous intéresse.',
    'layout', 'grid',
    'columns', 2,
    'offers', jsonb_build_array(
      jsonb_build_object(
        'id', 'qualirepar', 'title', 'Bonus QualiRépar',
        'description', 'Jusqu’à 25 € de remise sur une réparation éligible.',
        'conditionText', 'Éligibilité confirmée en boutique',
        'displayMode', 'icon', 'behavior', 'selectable',
        'fixedDiscount', 25, 'isPublished', true, 'displayOrder', 0
      ),
      jsonb_build_object(
        'id', 'verre-trempe', 'title', 'Verre trempé premium',
        'description', 'Protection posée en boutique.',
        'conditionText', 'Compatible selon le modèle',
        'displayMode', 'icon', 'behavior', 'selectable',
        'originalPrice', 20, 'promotionalPrice', 10,
        'isPublished', true, 'displayOrder', 1
      )
    )
  );
begin
  update public.widget_settings
  set draft_config = jsonb_set(coalesce(draft_config, '{}'::jsonb), '{offers}', default_offers, true),
      published_config = jsonb_set(coalesce(published_config, '{}'::jsonb), '{offers}', default_offers, true),
      updated_at = now()
  where jsonb_array_length(coalesce(published_config #> '{offers,offers}', '[]'::jsonb)) = 0;
end $$;
