**Comparison target**

- Source visual truth: `/var/folders/y2/0l9d6j_50gz9723lgrnl6lyw0000gn/T/codex-clipboard-6f39b7ea-09dc-4829-a94f-71583775ff9b.png`
- Browser-rendered implementation: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-1-desktop-final.png`
- Local URL: `http://127.0.0.1:3000/widget/wdg_b8d8c22875f0499b97929660fc7bbdd0/?host=https%3A%2F%2Fbehartechpro.fr`
- Viewport: 1440 × 960 for the primary comparison; responsive checks at 768 × 1024 and 375 × 812.
- State: first step, no device selected. The source crop shows the same first step with Smartphone selected; selection styling was checked separately in the live implementation.
- Full-view comparison evidence: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/reference-vs-widget-step-1-final.png`
- Focused region comparison evidence: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/reference-vs-widget-step-1-focus-final.png`
- Additional states: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-4-desktop.png`, `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-5-desktop.png`, `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-1-tablet.png`, `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-1-mobile-375.png`.

**Findings**

- No actionable P0, P1, or P2 visual mismatch remains.
- Typography: the implementation keeps the product's existing sans-serif stack and matches the reference hierarchy, compact labels, bold headings, and muted helper text. Wrapping remains controlled at all checked widths.
- Spacing and layout: the reference's modal, five-step progress, card grid, separators, rounded borders, and bottom action area are preserved. The implementation intentionally uses the requested 1100–1250 px desktop modal instead of reproducing the smaller presentation-board panel.
- Colors and tokens: surfaces, borders, muted text, primary state, focus rings, and shadows are mapped to the widget theme tokens so CMS colors remain authoritative.
- Image quality: existing device catalog assets are sharp and use `object-contain`; missing watch/audio/other raster assets use Lucide library icons rather than placeholders or handcrafted drawings.
- Copy: the flow and labels follow the supplied French direction. The currently published demo configuration still supplies its older configurable title, `Réparez votre appareil`; newly initialized configurations use `Demande de devis ou rendez-vous`.
- Responsive behavior: desktop, tablet, and 375 px mobile were visually checked. At 375 px, `innerWidth`, document `scrollWidth`, and body `scrollWidth` all equal 375 px.
- Accessibility and interaction: semantic buttons, pressed states, progressbar values, keyboard-close handling, focus rings, consent gating, and reduced-motion handling are present.

**Comparison history**

- Initial mobile pass: the primary action could fall below the visible viewport. Fix: the action block became sticky on mobile with safe-area padding. Post-fix evidence: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-1-mobile-375.png`.
- Initial device-card pass: watch, audio, and other categories reused a generic phone image. Fix: replaced those mismatched assets with the closest icons from the established Lucide library. Post-fix evidence: `/Users/belmin/Downloads/BeharTecjSaaS-main/scratch/widget-qa/widget-step-1-desktop-final.png` and the final focused comparison.
- Final comparison: card rhythm, progress hierarchy, controls, modal proportions, asset treatment, and footer alignment were checked together in the final focused comparison. No P0/P1/P2 issue remained.

**Primary interactions tested**

- Smartphone → Apple → iPhone 15 Pro Max from the global catalog.
- Unconfigured-model reassurance while allowing the flow to continue.
- Global issue selection with on-request pricing.
- Appointment slots loading and quote path without a slot.
- Customer summary, required contact fields, consent gating, and enabled final CTA.
- The final mutation was deliberately not submitted, to avoid creating production-like test data.
- Browser console errors checked: none.

**Open Questions**

- The demo widget's published title differs from the new default because published CMS content remains authoritative. This is expected and can be updated by republishing from the CMS without code changes.

**Implementation Checklist**

- [x] Five-step public flow and responsive modal.
- [x] Global device, brand, model, and issue fallbacks.
- [x] Dynamic appointment/offers step and no-offer empty-state suppression.
- [x] CMS offer creation, ordering, visibility, pricing, conditions, links, and responsive display controls.
- [x] Public offer sanitization and immutable selected-offer snapshot in the submission payload.
- [x] Responsive and accessibility checks.

**Follow-up Polish**

- P3: republish the demo CMS configuration if the reference title should replace the currently published custom title.

final result: passed
