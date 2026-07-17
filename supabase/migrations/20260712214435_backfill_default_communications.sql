update public.communication_settings c
set sms_templates = jsonb_build_object(
      'repair_received', 'Bonjour {{client}}, votre {{appareil}} a bien été pris en charge par {{atelier}}. Dossier {{dossier}}.',
      'diagnosis_ready', 'Bonjour {{client}}, le diagnostic de votre {{appareil}} est terminé. Consultez votre suivi : {{lien_suivi}}',
      'repair_ready', 'Bonne nouvelle {{client}} : votre {{appareil}} est prêt à être récupéré chez {{atelier}}.',
      'review_request', 'Merci pour votre confiance. N''hésitez pas à nous laisser 5 étoiles : {{lien_avis}}'
    ) || coalesce(c.sms_templates, '{}'::jsonb),
    email_templates = jsonb_build_object(
      'repair_received_subject', 'Votre appareil a bien été pris en charge',
      'repair_received_body', 'Bonjour {{client}},\n\nNous avons bien pris en charge votre {{appareil}} sous le dossier {{dossier}}.\n\nSuivez son avancement ici : {{lien_suivi}}',
      'repair_ready_subject', 'Votre appareil est prêt',
      'repair_ready_body', 'Bonjour {{client}},\n\nVotre {{appareil}} est prêt à être récupéré chez {{atelier}}.\n\nMerci pour votre confiance.',
      'review_subject', 'Votre avis compte pour nous',
      'review_body', 'Merci d''avoir choisi {{atelier}}. N''hésitez pas à nous laisser 5 étoiles : {{lien_avis}}'
    ) || coalesce(c.email_templates, '{}'::jsonb),
    sender_name = coalesce(nullif(c.sender_name, ''), w.commercial_name, w.name),
    reply_to = coalesce(nullif(c.reply_to, ''), nullif(w.email, '')),
    email_signature = coalesce(nullif(c.email_signature, ''), 'L''équipe ' || coalesce(w.commercial_name, w.name)),
    updated_at = now()
from public.workshops w
where w.id = c.workshop_id;
