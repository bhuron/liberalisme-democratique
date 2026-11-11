window.__ModuleLoader__.load({
  id: '@local/tweet-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef } = React;

    const NS = 'tweet-studio';
    const PANEL_ID = 'tweet-studio';
    const ROUTE = '/api/tweet-studio';
    const FORM_KEY = 'dsh.tweet-studio.form.v1';
    const HISTORY_KEY = 'dsh.tweet-studio.history.v1';

    const EN = {
      'panel.label': 'Tweet studio',
      'hero.eyebrow': 'The desk · social',
      title: 'Tweet studio',
      intro:
        'Turn a captured article into a post that sounds like the blog, not a press release. Bluesky and X, in one place.',
      'setup.title': 'Channel and format',
      'setup.threadLength': 'Thread length',
      'platform.bluesky': 'Bluesky',
      'platform.twitter': 'X (Twitter)',
      'platform.limit': '{n} characters',
      'unit.chars': 'chars',
      'mode.single': 'Single post',
      'mode.thread': 'Thread',
      'mode.posts': '{n} posts',
      'source.title': 'Ground it in a source',
      'source.optional': 'Optional',
      'source.hint':
        'Search the bookmark digest by title or link. The studio reads the captured text, so the draft can use real numbers.',
      'source.placeholder': 'Article title or link…',
      'source.search': 'Find article',
      'source.searching': 'Searching…',
      'source.examples': 'Try',
      'source.examplesHint': 'No source? Write from the idea alone.',
      'source.noResults': 'No captured article matches that search.',
      'source.noResultsHint':
        'Capture it with the bookmark-digest extension, then search again.',
      'source.words': '{n} words',
      'source.coverage': 'coverage {level}',
      'source.open': 'Open article',
      'source.remove': 'Remove source',
      'source.loading': 'Reading the captured text…',
      'source.ready': 'Source ready',
      'source.deskMissing':
        'The desk CLI is missing in this workspace. You can still write from an idea.',
      'brief.title': 'The point',
      'brief.hint':
        'One fact, one consequence. The studio handles the voice; you bring the argument.',
      'brief.placeholder':
        "The UK's grid queue is now a bigger constraint on AI than chip supply.",
      'brief.angle': 'Angle',
      'brief.anglePlaceholder': 'Optional framing, e.g. the subsidy angle',
      'brief.instructions': 'Extra instructions',
      'brief.instructionsPlaceholder': 'Optional, e.g. mention the 2030 target',
      'generate.action': 'Draft with the tweet skill',
      'generate.generating': 'Writing…',
      'generate.hint': 'Uses the real tweet skill and the selected source.',
      'generate.kbd': 'to draft',
      'generate.openChat': 'Open in chat',
      'generate.openChatHint': 'Hand the same brief to a full agent session.',
      'draft.title': 'Draft',
      'draft.empty': 'Your draft will land here.',
      'draft.emptyHint':
        'Pick a source or write the point, then draft. One fact, one consequence, no emoji, no hashtags.',
      'draft.copy': 'Copy',
      'draft.copyAll': 'Copy thread',
      'draft.save': 'Save',
      'draft.new': 'New',
      'draft.regenerate': 'Regenerate',
      'draft.refinePlaceholder': 'Make it drier, add the missing number…',
      'draft.refine': 'Refine',
      'draft.threadOf': 'Post {index} of {total}',
      'draft.post': 'Post',
      'draft.overLimit': 'Over the limit',
      'draft.chars': '{n} / {limit}',
      'draft.waiting': 'Writing the draft…',
      'history.title': 'Recent drafts',
      'history.empty': 'Saved drafts show up here. They stay in this browser.',
      'history.clear': 'Clear',
      'history.use': 'Load this draft',
      'voice.title': 'Voice rules',
      'voice.one': 'One fact, one consequence. Not a summary.',
      'voice.two': 'Short sentences, active voice, British English.',
      'voice.three': 'No emoji, hashtags, hype, or rhetorical questions.',
      'voice.four': 'Reads the article; never invents a number.',
      'status.done': 'Draft ready.',
      'status.copied': 'Copied.',
      'status.saved': 'Saved.',
      'status.chatOpened': 'Prompt opened in a new chat — press send.',
      'status.sourceLoaded': 'Source loaded.',
      'status.noResults': 'No match in the digest.',
      'status.aborted': 'Draft cancelled.',
      'status.offline':
        'The studio service is not reachable. Reload the page or check the plugin.',
      'status.skillMissing':
        'The tweet skill file was not found; the built-in voice rules are used.',
      'status.historyLoaded': 'Draft loaded.',
      'error.title': 'The studio hit a problem',
      'error.generic': 'Something went wrong.',
      'error.network':
        'The studio service did not answer. Check that the plugin is active and reload.',
      'error.noInput': 'Add an idea or pick a source first.',
      'error.copy': 'Copy failed. Select the text and copy it manually.',
      'error.source': 'Could not read that source.',
      'footer.skill': 'Follows .agents/skills/tweet/SKILL.md',
      'footer.noPublish': 'Never publishes',
      'a11y.copyPost': 'Copy this post',
      'a11y.removeSource': 'Remove the selected source',
      'a11y.clearHistory': 'Clear saved drafts',
      'a11y.platform': 'Platform',
      'a11y.mode': 'Format',
      'a11y.charCount': 'Character count',
      'a11y.refine': 'Refinement instruction',
      'a11y.openChat': 'Open this brief in a chat session',
      'a11y.search': 'Search the bookmark digest',
      'a11y.dismiss': 'Dismiss',
      'a11y.draftText': 'Draft text',
    };

    const FR = {
      'panel.label': 'Studio de tweets',
      'hero.eyebrow': 'Le desk · social',
      title: 'Studio de tweets',
      intro:
        'Transformez un article capturé en un post qui sonne comme le blog, pas comme un communiqué. Bluesky et X, au même endroit.',
      'setup.title': 'Canal et format',
      'setup.threadLength': 'Longueur du thread',
      'platform.bluesky': 'Bluesky',
      'platform.twitter': 'X (Twitter)',
      'platform.limit': '{n} signes',
      'unit.chars': 'signes',
      'mode.single': 'Post unique',
      'mode.thread': 'Thread',
      'mode.posts': '{n} posts',
      'source.title': 'Ancré dans une source',
      'source.optional': 'Optionnel',
      'source.hint':
        'Cherchez dans le digest bookmark par titre ou lien. Le studio lit le texte capturé pour utiliser de vrais chiffres.',
      'source.placeholder': "Titre ou lien de l'article…",
      'source.search': "Trouver l'article",
      'source.searching': 'Recherche…',
      'source.examples': 'Essayez',
      'source.examplesHint': "Pas de source ? Écrivez à partir de l'idée.",
      'source.noResults': 'Aucun article capturé ne correspond.',
      'source.noResultsHint':
        "Capturez-le avec l'extension bookmark-digest, puis relancez la recherche.",
      'source.words': '{n} mots',
      'source.coverage': 'couverture {level}',
      'source.open': "Ouvrir l'article",
      'source.remove': 'Retirer la source',
      'source.loading': 'Lecture du texte capturé…',
      'source.ready': 'Source prête',
      'source.deskMissing':
        "Le CLI du desk est absent de ce workspace. Vous pouvez quand même écrire à partir d'une idée.",
      'brief.title': "L'idée",
      'brief.hint':
        "Un fait, une conséquence. Le studio s'occupe de la voix ; vous apportez l'argument.",
      'brief.placeholder':
        "La file d'attente du réseau britannique contraint désormais l'IA plus que les puces.",
      'brief.angle': 'Angle',
      'brief.anglePlaceholder':
        "Cadrage optionnel, ex. l'angle des subventions",
      'brief.instructions': 'Instructions',
      'brief.instructionsPlaceholder':
        "Optionnel, ex. mentionner l'objectif 2030",
      'generate.action': 'Rédiger avec la compétence tweet',
      'generate.generating': 'Rédaction…',
      'generate.hint':
        'Utilise la vraie compétence tweet et la source choisie.',
      'generate.kbd': 'pour rédiger',
      'generate.openChat': 'Ouvrir dans le chat',
      'generate.openChatHint':
        "Confie le même brief à une session d'agent complète.",
      'draft.title': 'Brouillon',
      'draft.empty': 'Votre brouillon apparaîtra ici.',
      'draft.emptyHint':
        "Choisissez une source ou écrivez l'idée, puis rédigez. Un fait, une conséquence, pas d'emoji, pas de hashtag.",
      'draft.copy': 'Copier',
      'draft.copyAll': 'Copier le thread',
      'draft.save': 'Enregistrer',
      'draft.new': 'Nouveau',
      'draft.regenerate': 'Régénérer',
      'draft.refinePlaceholder': 'Plus sec, ajoute le chiffre manquant…',
      'draft.refine': 'Affiner',
      'draft.threadOf': 'Post {index} sur {total}',
      'draft.post': 'Post',
      'draft.overLimit': 'Hors limite',
      'draft.chars': '{n} / {limit}',
      'draft.waiting': 'Rédaction du brouillon…',
      'history.title': 'Brouillons récents',
      'history.empty':
        'Les brouillons enregistrés apparaissent ici. Ils restent dans ce navigateur.',
      'history.clear': 'Effacer',
      'history.use': 'Charger ce brouillon',
      'voice.title': 'Règles de voix',
      'voice.one': 'Un fait, une conséquence. Pas un résumé.',
      'voice.two': 'Phrases courtes, voix active, anglais britannique.',
      'voice.three':
        "Pas d'emoji, de hashtag, de hype ni de question rhétorique.",
      'voice.four': "Lit l'article ; n'invente jamais un chiffre.",
      'status.done': 'Brouillon prêt.',
      'status.copied': 'Copié.',
      'status.saved': 'Enregistré.',
      'status.chatOpened':
        'Prompt ouvert dans un nouveau chat — appuyez sur envoyer.',
      'status.sourceLoaded': 'Source chargée.',
      'status.noResults': 'Aucun résultat dans le digest.',
      'status.aborted': 'Brouillon annulé.',
      'status.offline':
        'Le service du studio est injoignable. Rechargez la page ou vérifiez le plugin.',
      'status.skillMissing':
        'Le fichier de compétence tweet est introuvable ; les règles de voix intégrées sont utilisées.',
      'status.historyLoaded': 'Brouillon chargé.',
      'error.title': 'Le studio a rencontré un problème',
      'error.generic': 'Une erreur est survenue.',
      'error.network':
        "Le service du studio n'a pas répondu. Vérifiez que le plugin est actif et rechargez.",
      'error.noInput': 'Ajoutez une idée ou choisissez une source.',
      'error.copy':
        'La copie a échoué. Sélectionnez le texte et copiez-le à la main.',
      'error.source': 'Impossible de lire cette source.',
      'footer.skill': 'Suit .agents/skills/tweet/SKILL.md',
      'footer.noPublish': 'Ne publie jamais',
      'a11y.copyPost': 'Copier ce post',
      'a11y.removeSource': 'Retirer la source sélectionnée',
      'a11y.clearHistory': 'Effacer les brouillons enregistrés',
      'a11y.platform': 'Plateforme',
      'a11y.mode': 'Format',
      'a11y.charCount': 'Nombre de signes',
      'a11y.refine': "Instruction d'affinage",
      'a11y.openChat': 'Ouvrir ce brief dans une session de chat',
      'a11y.search': 'Chercher dans le digest bookmark',
      'a11y.dismiss': 'Fermer',
      'a11y.draftText': 'Texte du brouillon',
    };

    const CSS = `
      .dsh-ts-root {
        height: 100%;
        min-height: 0;
        overflow: auto;
        color: var(--dsw-alias-label-primary);
        background:
          radial-gradient(1100px 520px at 12% -10%, color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent), transparent 62%),
          var(--dsw-alias-bg-base);
        box-sizing: border-box;
      }
      .dsh-ts-root *, .dsh-ts-root *::before, .dsh-ts-root *::after { box-sizing: border-box; }
      .dsh-ts-wrap {
        width: 100%;
        max-width: 1120px;
        margin: 0 auto;
        padding: calc(clamp(22px, 4vw, 42px) + var(--dsh-frame-top-clearance, 0px))
          calc(clamp(16px, 3vw, 36px) + var(--dsh-frame-leading-clearance, 0px))
          56px
          clamp(16px, 3vw, 36px);
      }
      .dsh-ts-hero { display: flex; align-items: center; gap: 18px; margin: 0 0 26px; }
      .dsh-ts-mark {
        width: 58px; height: 58px; border-radius: 18px; flex: none;
        display: grid; place-items: center; color: var(--dsw-alias-bg-base);
        background: linear-gradient(145deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-bg-base)), var(--dsw-alias-brand-primary));
        box-shadow: 0 10px 30px color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
      }
      .dsh-ts-heroText { min-width: 0; flex: 1; }
      .dsh-ts-eyebrow {
        font-size: 11px; font-weight: 650; letter-spacing: .14em; text-transform: uppercase;
        color: color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);
      }
      .dsh-ts-title { margin: 4px 0 5px; font-size: clamp(23px, 2.6vw, 31px); line-height: 1.1; font-weight: 650; letter-spacing: -.025em; }
      .dsh-ts-intro { margin: 0; max-width: 66ch; color: var(--dsw-alias-label-secondary); font-size: 13.5px; line-height: 1.6; }
      .dsh-ts-heroBadge {
        display: inline-flex; align-items: center; gap: 8px; border: .5px solid var(--dsw-alias-border-l1);
        background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 80%, transparent);
        border-radius: 999px; padding: 7px 12px; color: var(--dsw-alias-label-secondary);
        font-size: 12px; white-space: nowrap;
      }
      .dsh-ts-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent); }
      .dsh-ts-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(280px, .85fr); gap: 20px; align-items: start; }
      .dsh-ts-col, .dsh-ts-aside { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
      .dsh-ts-card {
        border: .5px solid var(--dsw-alias-border-l1); border-radius: 16px;
        background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 94%, transparent);
        padding: 18px; min-width: 0;
        box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
      }
      .dsh-ts-cardHead { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .dsh-ts-cardTitle { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 650; min-width: 0; }
      .dsh-ts-cardTitle svg { color: color-mix(in srgb, var(--dsw-alias-brand-primary) 75%, var(--dsw-alias-label-secondary)); flex: none; }
      .dsh-ts-cardHint { margin: 0 0 12px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; line-height: 1.55; }
      .dsh-ts-optional { font-size: 11px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 62%, transparent); border: .5px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
      .dsh-ts-platforms { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
      .dsh-ts-platform {
        display: flex; align-items: center; gap: 10px; text-align: left;
        border: .5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        border-radius: 12px; padding: 10px 11px; cursor: pointer; color: var(--dsw-alias-label-primary);
        transition: border-color .16s, background .16s, transform .16s;
      }
      .dsh-ts-platform:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); transform: translateY(-1px); }
      .dsh-ts-platform[data-active="true"] {
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-border-l1));
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-2));
        box-shadow: inset 0 0 0 .5px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
      }
      .dsh-ts-platform:disabled { opacity: .6; cursor: default; }
      .dsh-ts-platformIcon { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: var(--dsw-alias-brand-primary); }
      .dsh-ts-platformText { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .dsh-ts-platformName { font-size: 13px; font-weight: 600; line-height: 1.2; }
      .dsh-ts-platformMeta { font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.2; }
      .dsh-ts-platformCheck { color: var(--dsw-alias-brand-primary); display: flex; flex: none; }
      .dsh-ts-modeRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
      .dsh-ts-seg { display: inline-flex; gap: 2px; padding: 3px; border: .5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); border-radius: 10px; }
      .dsh-ts-segBtn { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 7px; height: 28px; padding: 0 10px; font: inherit; font-size: 12px; font-weight: 550; cursor: pointer; }
      .dsh-ts-segBtn[data-active="true"] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
      .dsh-ts-segBtn:disabled { opacity: .55; cursor: default; }
      .dsh-ts-select {
        height: 34px; border: .5px solid var(--dsw-alias-border-l1); background-color: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary); border-radius: 9px; padding: 0 28px 0 10px; font: inherit;
        font-size: 12px; cursor: pointer; appearance: none;
        background-image: linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-secondary) 50%), linear-gradient(135deg, var(--dsw-alias-label-secondary) 50%, transparent 50%);
        background-position: calc(100% - 14px) 15px, calc(100% - 10px) 15px;
        background-size: 4px 4px, 4px 4px; background-repeat: no-repeat;
      }
      .dsh-ts-searchRow { display: flex; gap: 8px; align-items: center; }
      .dsh-ts-searchRow .dsh-ts-input { flex: 1; }
      .dsh-ts-input, .dsh-ts-textarea {
        width: 100%; border: .5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary); border-radius: 10px; padding: 9px 11px; font: inherit;
        font-size: 13px; line-height: 1.5; outline: none; transition: border-color .16s, box-shadow .16s;
      }
      .dsh-ts-input::placeholder, .dsh-ts-textarea::placeholder { color: color-mix(in srgb, var(--dsw-alias-label-secondary) 62%, transparent); }
      .dsh-ts-input:focus, .dsh-ts-textarea:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); }
      .dsh-ts-textarea { resize: vertical; min-height: 96px; }
      .dsh-ts-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 34px; padding: 0 12px;
        border: .5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary); border-radius: 9px; font: inherit; font-size: 12.5px;
        font-weight: 550; cursor: pointer; white-space: nowrap;
        transition: background .16s, border-color .16s, transform .16s, box-shadow .16s;
      }
      .dsh-ts-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }
      .dsh-ts-btn:active:not(:disabled) { transform: translateY(1px); }
      .dsh-ts-btn:disabled { opacity: .5; cursor: not-allowed; }
      .dsh-ts-btnPrimary {
        background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 86%, var(--dsw-alias-bg-base)), var(--dsw-alias-brand-primary));
        border-color: transparent; color: var(--dsw-alias-bg-base);
        box-shadow: 0 8px 20px color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent);
      }
      .dsh-ts-btnPrimary:hover:not(:disabled) {
        background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 78%, var(--dsw-alias-bg-base)), color-mix(in srgb, var(--dsw-alias-brand-primary) 92%, var(--dsw-alias-bg-base)));
      }
      .dsh-ts-btnLg { height: 40px; padding: 0 16px; font-size: 13px; border-radius: 10px; }
      .dsh-ts-textBtn { border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; font-weight: 550; cursor: pointer; padding: 4px 6px; border-radius: 7px; }
      .dsh-ts-textBtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .dsh-ts-link { display: inline-flex; align-items: center; gap: 5px; color: var(--dsw-alias-brand-primary); text-decoration: none; font-size: 12px; font-weight: 550; }
      .dsh-ts-link:hover { text-decoration: underline; text-underline-offset: 3px; }
      .dsh-ts-kbd { display: inline-flex; align-items: center; gap: 4px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 65%, transparent); font-size: 11.5px; }
      .dsh-ts-kbd kbd { border: .5px solid var(--dsw-alias-border-l1); border-bottom-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); border-radius: 5px; padding: 1px 5px; font-family: inherit; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-results { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; max-height: 280px; overflow: auto; }
      .dsh-ts-result { display: flex; flex-direction: column; gap: 3px; width: 100%; text-align: left; border: 0; background: transparent; border-radius: 9px; padding: 8px 9px; cursor: pointer; color: inherit; font: inherit; }
      .dsh-ts-result:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-ts-resultTop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
      .dsh-ts-resultSite { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
      .dsh-ts-resultMeta { font-size: 10.5px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 65%, transparent); white-space: nowrap; }
      .dsh-ts-resultTitle { font-size: 12.5px; font-weight: 550; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .dsh-ts-examples { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .dsh-ts-examplesLabel { font-size: 11px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 65%, transparent); margin-right: 2px; }
      .dsh-ts-chip { border: .5px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 4px 9px; font: inherit; font-size: 11.5px; cursor: pointer; }
      .dsh-ts-chip:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .dsh-ts-loading { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 10px 2px; }
      .dsh-ts-noResults { display: flex; gap: 9px; align-items: flex-start; padding: 10px 2px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.5; }
      .dsh-ts-noResults svg { flex: none; margin-top: 2px; }
      .dsh-ts-noResults strong { display: block; color: var(--dsw-alias-label-primary); font-size: 12.5px; font-weight: 600; margin-bottom: 2px; }
      .dsh-ts-sourceSelected { display: flex; gap: 11px; align-items: flex-start; border: .5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, var(--dsw-alias-border-l1)); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, var(--dsw-alias-bg-layer-2)); border-radius: 12px; padding: 12px; }
      .dsh-ts-sourceIcon { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: var(--dsw-alias-brand-primary); display: grid; place-items: center; flex: none; }
      .dsh-ts-sourceMain { min-width: 0; flex: 1; }
      .dsh-ts-sourceSite { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--dsw-alias-label-secondary); font-weight: 600; }
      .dsh-ts-sourceTitle { font-size: 13px; font-weight: 600; line-height: 1.4; margin-top: 1px; }
      .dsh-ts-sourceMeta { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
      .dsh-ts-sourceExcerpt { margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .dsh-ts-sourceActions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
      .dsh-ts-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 10.5px; font-weight: 600; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .dsh-ts-badgeGood { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 11%, transparent); color: var(--dsw-alias-state-success-primary); }
      .dsh-ts-field { display: flex; flex-direction: column; gap: 5px; }
      .dsh-ts-fieldLabel { font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-fieldHint { font-size: 11px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 65%, transparent); }
      .dsh-ts-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .dsh-ts-generateRow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: .5px solid var(--dsw-alias-border-l1); }
      .dsh-ts-generateRow .dsh-ts-kbd { margin-left: auto; }
      .dsh-ts-draftCard { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l1)); background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, var(--dsw-alias-bg-layer-1)), var(--dsw-alias-bg-layer-1)); }
      .dsh-ts-draftActions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
      .dsh-ts-draftActions .dsh-ts-textBtn { font-size: 11.5px; }
      .dsh-ts-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; border: 1px dashed color-mix(in srgb, var(--dsw-alias-border-l2) 75%, transparent); border-radius: 13px; padding: 30px 20px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent); }
      .dsh-ts-emptyIcon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--dsw-alias-bg-layer-2); color: color-mix(in srgb, var(--dsw-alias-brand-primary) 75%, var(--dsw-alias-label-secondary)); }
      .dsh-ts-emptyTitle { font-size: 13.5px; font-weight: 600; }
      .dsh-ts-emptyHint { max-width: 46ch; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; }
      .dsh-ts-stream { border: .5px solid var(--dsw-alias-border-l1); border-radius: 13px; background: var(--dsw-alias-bg-layer-2); padding: 13px 14px; }
      .dsh-ts-streamHead { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; font-weight: 550; margin-bottom: 8px; }
      .dsh-ts-streamHead .dsh-ts-meter { margin-left: auto; }
      .dsh-ts-streamText { white-space: pre-wrap; font-size: 14.5px; line-height: 1.65; color: var(--dsw-alias-label-primary); min-height: 1.65em; }
      .dsh-ts-caret { display: inline-block; width: 2px; height: 1em; background: var(--dsw-alias-brand-primary); margin-left: 2px; vertical-align: -2px; animation: dsh-ts-blink 1s steps(2, start) infinite; }
      @keyframes dsh-ts-blink { 50% { opacity: 0; } }
      .dsh-ts-post { border: .5px solid var(--dsw-alias-border-l1); border-radius: 13px; background: var(--dsw-alias-bg-layer-2); padding: 12px 13px; }
      .dsh-ts-post + .dsh-ts-post { margin-top: 10px; }
      .dsh-ts-post:focus-within { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }
      .dsh-ts-post[data-over="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l1)); }
      .dsh-ts-postHead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 7px; }
      .dsh-ts-postLabel { font-size: 10.5px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-postTools { display: flex; align-items: center; gap: 7px; }
      .dsh-ts-count { font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
      .dsh-ts-count[data-over="true"] { color: var(--dsw-alias-state-error-primary); font-weight: 600; }
      .dsh-ts-iconBtn { width: 26px; height: 26px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); display: inline-grid; place-items: center; cursor: pointer; }
      .dsh-ts-iconBtn:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
      .dsh-ts-postText { display: block; width: 100%; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 15px; line-height: 1.6; resize: none; outline: none; padding: 0; min-height: 86px; overflow: hidden; }
      .dsh-ts-over { display: flex; align-items: center; gap: 5px; color: var(--dsw-alias-state-error-primary); font-size: 11.5px; margin-top: 6px; }
      .dsh-ts-refine { display: flex; gap: 8px; align-items: center; margin-top: 12px; padding-top: 12px; border-top: .5px solid var(--dsw-alias-border-l1); }
      .dsh-ts-refine .dsh-ts-input { flex: 1; }
      .dsh-ts-history { display: flex; flex-direction: column; gap: 3px; }
      .dsh-ts-historyItem { display: flex; align-items: flex-start; gap: 9px; width: 100%; text-align: left; border: 0; background: transparent; border-radius: 9px; padding: 8px; cursor: pointer; color: inherit; font: inherit; }
      .dsh-ts-historyItem:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-ts-historyIcon { width: 26px; height: 26px; border-radius: 8px; flex: none; display: grid; place-items: center; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
      .dsh-ts-historyMain { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
      .dsh-ts-historyTitle { font-size: 12px; font-weight: 550; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .dsh-ts-historyMeta { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-voiceCard { background: linear-gradient(160deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, var(--dsw-alias-bg-layer-1)), var(--dsw-alias-bg-layer-1)); }
      .dsh-ts-voiceList { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
      .dsh-ts-voiceList li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-voiceList li::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--dsw-alias-brand-primary); margin-top: 6px; flex: none; }
      .dsh-ts-footer { margin: 2px 2px 0; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 62%, transparent); font-size: 11px; line-height: 1.6; }
      .dsh-ts-banner { display: flex; align-items: flex-start; gap: 9px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 11px; padding: 10px 12px; font-size: 12px; line-height: 1.5; margin: 0 0 14px; }
      .dsh-ts-banner svg { flex: none; margin-top: 1px; }
      .dsh-ts-bannerWarn { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent); color: var(--dsw-alias-state-warn-primary); }
      .dsh-ts-bannerInfo { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
      .dsh-ts-alert { display: flex; align-items: flex-start; gap: 10px; border: .5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent); border-radius: 11px; padding: 11px 12px; margin: 0 0 14px; }
      .dsh-ts-alertIcon { color: var(--dsw-alias-state-error-primary); flex: none; margin-top: 1px; }
      .dsh-ts-alertBody { flex: 1; min-width: 0; }
      .dsh-ts-alertTitle { font-size: 12.5px; font-weight: 650; color: var(--dsw-alias-state-error-primary); }
      .dsh-ts-alertText { margin: 2px 0 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
      .dsh-ts-alert .dsh-ts-iconBtn { margin-left: auto; color: var(--dsw-alias-label-secondary); }
      .dsh-ts-spinner { display: inline-block; border-radius: 50%; border: 2px solid color-mix(in srgb, currentColor 25%, transparent); border-top-color: currentColor; animation: dsh-ts-spin .7s linear infinite; flex: none; }
      @keyframes dsh-ts-spin { to { transform: rotate(360deg); } }
      .dsh-ts-meter { position: relative; display: inline-grid; place-items: center; width: 32px; height: 32px; flex: none; color: var(--dsw-alias-brand-primary); }
      .dsh-ts-meter[data-over="true"] { color: var(--dsw-alias-state-error-primary); }
      .dsh-ts-meterArc { transition: stroke-dashoffset .25s ease; }
      .dsh-ts-meterText { position: absolute; inset: 0; display: grid; place-items: center; font-size: 9px; font-weight: 650; color: currentColor; font-variant-numeric: tabular-nums; }
      .dsh-ts-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 8px; max-width: min(480px, calc(100vw - 32px)); border: .5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border-radius: 999px; padding: 8px 14px; font-size: 12px; box-shadow: 0 12px 34px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent); pointer-events: none; animation: dsh-ts-toastIn .18s ease-out; }
      .dsh-ts-toast svg { color: var(--dsw-alias-state-success-primary); flex: none; }
      @keyframes dsh-ts-toastIn { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
      .dsh-ts-modelPill { font-size: 10px; font-weight: 550; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); border-radius: 999px; padding: 2px 7px; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; margin-left: 4px; }
      .dsh-ts-root button:focus-visible, .dsh-ts-root a:focus-visible, .dsh-ts-root input:focus-visible, .dsh-ts-root textarea:focus-visible, .dsh-ts-root select:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
      @media (max-width: 980px) { .dsh-ts-grid { grid-template-columns: 1fr; } .dsh-ts-aside { order: 2; } }
      @media (max-width: 720px) {
        .dsh-ts-wrap {
          padding-left: calc(14px + var(--dsh-frame-leading-clearance, 0px));
          padding-right: 14px;
          padding-bottom: 40px;
        }
        .dsh-ts-hero { gap: 13px; }
        .dsh-ts-mark { width: 48px; height: 48px; border-radius: 15px; }
        .dsh-ts-platforms { grid-template-columns: 1fr; }
        .dsh-ts-two { grid-template-columns: 1fr; }
        .dsh-ts-card { padding: 15px; border-radius: 14px; }
        .dsh-ts-heroBadge { display: none; }
        .dsh-ts-generateRow .dsh-ts-kbd { display: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dsh-ts-root *, .dsh-ts-root *::before, .dsh-ts-root *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
      }
    `;

    const clientSegmenter =
      typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

    function countGraphemes(value) {
      const text = String(value ?? '');
      return clientSegmenter
        ? Array.from(clientSegmenter.segment(text)).length
        : Array.from(text).length;
    }

    function loadForm() {
      try {
        const raw = localStorage.getItem(FORM_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    function loadHistory() {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(
            (entry) =>
              entry &&
              typeof entry === 'object' &&
              Array.isArray(entry.posts) &&
              entry.posts.length > 0 &&
              entry.posts.every((post) => typeof post === 'string'),
          )
          .slice(0, 24);
      } catch {
        return [];
      }
    }

    function persistHistory(entries) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
      } catch {
        // Storage can be unavailable; history then lasts for this page only.
      }
    }

    function formatDate(timestamp) {
      try {
        return new Intl.DateTimeFormat(undefined, {
          month: 'short',
          day: 'numeric',
        }).format(new Date(timestamp));
      } catch {
        return '';
      }
    }

    function Svg({
      size = 18,
      fill = 'none',
      viewBox = '0 0 24 24',
      children,
      ...rest
    }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox,
          fill,
          stroke: fill === 'none' ? 'currentColor' : 'none',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          ...rest,
        },
        children,
      );
    }

    function IconFeather({ size = 18 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M5 19c6.5-.5 10.5-4 12-10l1-3-3 1C9.5 8 6 12 5 19Z' }),
        h('path', { d: 'M5 19l6-6' }),
        h('path', {
          d: 'M16.2 3.2l.5 1.7 1.7.5-1.7.5-.5 1.7-.5-1.7-1.7-.5 1.7-.5.5-1.7Z',
          fill: 'currentColor',
          stroke: 'none',
        }),
      );
    }

    function IconSearch({ size = 18 }) {
      return h(
        Svg,
        { size },
        h('circle', { cx: 11, cy: 11, r: 6.5 }),
        h('path', { d: 'M16 16l4.5 4.5' }),
      );
    }

    function IconSpark({ size = 18 }) {
      return h(
        Svg,
        { size },
        h('path', {
          d: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z',
        }),
        h('path', {
          d: 'M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z',
          fill: 'currentColor',
          stroke: 'none',
        }),
      );
    }

    function IconCopy({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('rect', { x: 9, y: 9, width: 10, height: 10, rx: 2 }),
        h('path', {
          d: 'M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2',
        }),
      );
    }

    function IconRefresh({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M20 11a8 8 0 1 0-2.3 6.4' }),
        h('path', { d: 'M20 4v7h-7' }),
      );
    }

    function IconExternal({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M14 4h6v6' }),
        h('path', { d: 'M20 4l-8 8' }),
        h('path', {
          d: 'M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4',
        }),
      );
    }

    function IconClose({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M6 6l12 12' }),
        h('path', { d: 'M18 6L6 18' }),
      );
    }

    function IconCheck({ size = 16 }) {
      return h(Svg, { size }, h('path', { d: 'M5 12.5l4.5 4.5L19 7' }));
    }

    function IconTrash({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M4 7h16' }),
        h('path', { d: 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' }),
        h('path', { d: 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12' }),
        h('path', { d: 'M10 11v6M14 11v6' }),
      );
    }

    function IconAlert({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M12 3.5 21 20H3L12 3.5Z' }),
        h('path', { d: 'M12 9v5' }),
        h('path', { d: 'M12 17.5h.01' }),
      );
    }

    function IconInfo({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M12 11v6' }),
        h('path', { d: 'M12 7.5h.01' }),
      );
    }

    function IconLink({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', {
          d: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6',
        }),
        h('path', {
          d: 'M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7L12.5 18',
        }),
      );
    }

    function IconClock({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M12 7v5l3 2' }),
      );
    }

    function IconSend({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M21 3 10.5 13.5' }),
        h('path', { d: 'M21 3l-6.5 18-4-7.5L3 9.5 21 3Z' }),
      );
    }

    function IconArticle({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M6 3h9l4 4v14H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z' }),
        h('path', { d: 'M14 3v5h5' }),
        h('path', { d: 'M8 12h7M8 16h7' }),
      );
    }

    function IconThread({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M5 6h14M5 12h14M5 18h9' }),
        h('circle', { cx: 3.5, cy: 6, r: 0.6, fill: 'currentColor' }),
        h('circle', { cx: 3.5, cy: 12, r: 0.6, fill: 'currentColor' }),
        h('circle', { cx: 3.5, cy: 18, r: 0.6, fill: 'currentColor' }),
      );
    }

    function IconQuote({ size = 16 }) {
      return h(
        Svg,
        { size },
        h('path', {
          d: 'M9 7H5.5A1.5 1.5 0 0 0 4 8.5V12h4.5A1.5 1.5 0 0 1 10 13.5V16a1 1 0 0 1-1 1H5',
        }),
        h('path', {
          d: 'M20 7h-3.5A1.5 1.5 0 0 0 15 8.5V12h4.5a1.5 1.5 0 0 1 1.5 1.5V16a1 1 0 0 1-1 1h-4',
        }),
      );
    }

    function PlatformMark({ platform, size = 18 }) {
      if (platform === 'twitter') {
        return h(
          Svg,
          { size, fill: 'currentColor', strokeWidth: 0 },
          h('path', {
            d: 'M4 3.5h4.3l4.2 5.6 4.8-5.6H21l-6.4 7.4L21.4 20.5h-4.3l-4.6-6.1-5.2 6.1H3.6l7-8.2L4 3.5Z',
          }),
        );
      }
      return h(
        Svg,
        { size, fill: 'currentColor', strokeWidth: 0 },
        h('path', {
          d: 'M12 10.4c1.2-2.3 3.4-4.5 5.1-4.5 1.5 0 2.5 1.1 2.5 2.7 0 2.3-1.7 5.1-3.5 6.5-.7.5-1.4.8-2 .8-.8 0-1.5-.4-2.1-1.2-.6.8-1.3 1.2-2.1 1.2-.6 0-1.3-.3-2-.8-1.8-1.4-3.5-4.2-3.5-6.5 0-1.6 1-2.7 2.5-2.7 1.7 0 3.9 2.2 5.1 4.5Z',
        }),
      );
    }

    function TweetStudioIcon({ size }) {
      return h(
        Svg,
        { size },
        h('path', { d: 'M5 19c6.5-.5 10.5-4 12-10l1-3-3 1C9.5 8 6 12 5 19Z' }),
        h('path', { d: 'M5 19l6-6' }),
        h('path', {
          d: 'M16.4 3l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2Z',
          fill: 'currentColor',
          stroke: 'none',
        }),
      );
    }

    function Spinner({ size = 16 }) {
      return h('span', {
        className: 'dsh-ts-spinner',
        style: { width: size, height: size },
        'aria-hidden': 'true',
      });
    }

    function LimitMeter({ count, limit }) {
      const over = count > limit;
      const ratio = Math.min(1, limit > 0 ? count / limit : 0);
      const radius = 13;
      const circumference = 2 * Math.PI * radius;
      return h(
        'span',
        {
          className: 'dsh-ts-meter',
          'data-over': over ? 'true' : 'false',
          title: `${count} / ${limit}`,
        },
        h(
          'svg',
          {
            width: 32,
            height: 32,
            viewBox: '0 0 32 32',
            'aria-hidden': 'true',
          },
          h('circle', {
            cx: 16,
            cy: 16,
            r: radius,
            fill: 'none',
            stroke: 'currentColor',
            strokeOpacity: 0.14,
            strokeWidth: 3,
          }),
          h('circle', {
            cx: 16,
            cy: 16,
            r: radius,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 3,
            strokeLinecap: 'round',
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: String(circumference * (1 - ratio)),
            transform: 'rotate(-90 16 16)',
            className: 'dsh-ts-meterArc',
          }),
        ),
        h('span', { className: 'dsh-ts-meterText' }, String(count)),
      );
    }

    function Segmented({ value, options, onChange, disabled, ariaLabel }) {
      return h(
        'div',
        { className: 'dsh-ts-seg', role: 'group', 'aria-label': ariaLabel },
        options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              type: 'button',
              className: 'dsh-ts-segBtn',
              'data-active': value === option.value ? 'true' : 'false',
              'aria-pressed': value === option.value,
              disabled,
              onClick: () => onChange(option.value),
            },
            option.icon ? h(option.icon, { size: 14 }) : null,
            option.label,
          ),
        ),
      );
    }

    function PostCard({
      index,
      total,
      text,
      limit,
      isThread,
      onChange,
      onCopy,
      t,
    }) {
      const ref = useRef(null);
      const count = countGraphemes(text);
      const over = count > limit;

      useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${Math.min(420, Math.max(88, element.scrollHeight))}px`;
      }, [text]);

      return h(
        'div',
        { className: 'dsh-ts-post', 'data-over': over ? 'true' : 'false' },
        h(
          'div',
          { className: 'dsh-ts-postHead' },
          h(
            'span',
            { className: 'dsh-ts-postLabel' },
            isThread
              ? t('draft.threadOf', { index: index + 1, total })
              : t('draft.post'),
          ),
          h(
            'div',
            { className: 'dsh-ts-postTools' },
            h(
              'span',
              {
                className: 'dsh-ts-count',
                'data-over': over ? 'true' : 'false',
                'aria-label': t('a11y.charCount'),
              },
              t('draft.chars', { n: count, limit }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-ts-iconBtn',
                onClick: () => onCopy(text),
                title: t('draft.copy'),
                'aria-label': t('a11y.copyPost'),
              },
              h(IconCopy, { size: 15 }),
            ),
          ),
        ),
        h('textarea', {
          ref,
          className: 'dsh-ts-postText',
          value: text,
          rows: 3,
          spellCheck: true,
          onChange: (event) => onChange(event.target.value),
          'aria-label': isThread
            ? t('draft.threadOf', { index: index + 1, total })
            : t('a11y.draftText'),
        }),
        over
          ? h(
              'div',
              { className: 'dsh-ts-over' },
              h(IconAlert, { size: 13 }),
              t('draft.overLimit'),
            )
          : null,
      );
    }

    function TweetStudioPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const uiWorkspace = props.uiWorkspace;

      const [initial] = useState(loadForm);
      const [platform, setPlatform] = useState(
        initial.platform === 'twitter' ? 'twitter' : 'bluesky',
      );
      const [mode, setMode] = useState(
        initial.mode === 'thread' ? 'thread' : 'single',
      );
      const [threadCount, setThreadCount] = useState(
        [3, 4, 5].includes(initial.threadCount) ? initial.threadCount : 3,
      );
      const [query, setQuery] = useState(
        typeof initial.query === 'string' ? initial.query : '',
      );
      const [results, setResults] = useState(null);
      const [searching, setSearching] = useState(false);
      const [source, setSource] = useState(
        initial.source &&
          typeof initial.source === 'object' &&
          typeof initial.source.path === 'string' &&
          initial.source.path
          ? initial.source
          : null,
      );
      const [sourceExcerpt, setSourceExcerpt] = useState(
        typeof initial.sourceExcerpt === 'string' ? initial.sourceExcerpt : '',
      );
      const [sourceLoading, setSourceLoading] = useState(false);
      const [idea, setIdea] = useState(
        typeof initial.idea === 'string' ? initial.idea : '',
      );
      const [angle, setAngle] = useState(
        typeof initial.angle === 'string' ? initial.angle : '',
      );
      const [instructions, setInstructions] = useState(
        typeof initial.instructions === 'string' ? initial.instructions : '',
      );
      const [posts, setPosts] = useState([]);
      const [streamText, setStreamText] = useState('');
      const [generating, setGenerating] = useState(false);
      const [modelInfo, setModelInfo] = useState(null);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [history, setHistory] = useState(loadHistory);
      const [refineText, setRefineText] = useState('');
      const [limits, setLimits] = useState({ bluesky: 300, twitter: 280 });
      const [service, setService] = useState({
        status: 'loading',
        desk: true,
        skill: true,
      });

      const abortRef = useRef(null);
      const busyRef = useRef(false);
      const draftRef = useRef(null);
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform || '');
      const kbdHint = isMac ? '⌘ ↵' : 'Ctrl ↵';

      const limitFor = (value) => {
        const candidate = limits[value];
        return Number.isFinite(candidate)
          ? candidate
          : value === 'twitter'
            ? 280
            : 300;
      };
      const limit = limitFor(platform);
      const combined = useMemo(
        () => posts.join(mode === 'thread' ? '\n\n---\n\n' : '\n\n'),
        [posts, mode],
      );
      const canGenerate = Boolean(idea.trim() || source) && !generating;
      const canRefine =
        posts.length > 0 && !generating && Boolean(refineText.trim());
      const deskReady = service.status !== 'ready' || service.desk;

      useEffect(() => {
        let alive = true;
        fetch(`${ROUTE}/health`)
          .then((response) =>
            response.ok
              ? response.json()
              : Promise.reject(new Error('offline')),
          )
          .then((data) => {
            if (!alive) return;
            if (data && data.ok) {
              if (data.limits) {
                setLimits({
                  bluesky: Number(data.limits.bluesky) || 300,
                  twitter: Number(data.limits.twitter) || 280,
                });
              }
              setService({
                status: 'ready',
                desk: data.desk !== false,
                skill: data.skill !== false,
              });
            } else {
              setService({ status: 'offline', desk: false, skill: false });
            }
          })
          .catch(() => {
            if (alive)
              setService({ status: 'offline', desk: false, skill: false });
          });
        return () => {
          alive = false;
        };
      }, []);

      useEffect(() => {
        try {
          localStorage.setItem(
            FORM_KEY,
            JSON.stringify({
              platform,
              mode,
              threadCount,
              query,
              idea,
              angle,
              instructions,
              source,
              sourceExcerpt,
            }),
          );
        } catch {
          // Ignore storage failures.
        }
      }, [
        platform,
        mode,
        threadCount,
        query,
        idea,
        angle,
        instructions,
        source,
        sourceExcerpt,
      ]);

      useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), 2800);
        return () => clearTimeout(timer);
      }, [notice]);

      useEffect(
        () => () => {
          if (abortRef.current) abortRef.current.abort();
        },
        [],
      );

      function friendly(value) {
        const message = value && value.message ? String(value.message) : '';
        if (
          !message ||
          /failed to fetch|networkerror|load failed/i.test(message)
        ) {
          return t('error.network');
        }
        return message;
      }

      async function api(url, options) {
        let response;
        try {
          response = await fetch(url, options);
        } catch {
          throw new Error(t('error.network'));
        }
        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }
        if (!response.ok || (data && data.ok === false)) {
          throw new Error((data && data.error) || t('error.generic'));
        }
        return data;
      }

      async function search(explicit) {
        const value = String(explicit ?? query ?? '').trim();
        if (!value || searching) return;
        setQuery(value);
        setSearching(true);
        setError('');
        try {
          const data = await api(
            `${ROUTE}/find?q=${encodeURIComponent(value)}`,
          );
          const rows = Array.isArray(data.results) ? data.results : [];
          setResults(rows);
          if (!rows.length) setNotice(t('status.noResults'));
        } catch (caught) {
          setResults([]);
          setError(friendly(caught));
        } finally {
          setSearching(false);
        }
      }

      async function chooseSource(result) {
        if (!result || !result.path || sourceLoading) return;
        setSourceLoading(true);
        setError('');
        try {
          const data = await api(
            `${ROUTE}/source?path=${encodeURIComponent(result.path)}`,
          );
          const text = typeof data.text === 'string' ? data.text : '';
          setSource(result);
          setSourceExcerpt(text.replace(/\s+/g, ' ').trim().slice(0, 520));
          setResults(null);
          setNotice(t('status.sourceLoaded'));
        } catch (caught) {
          setError(`${t('error.source')} ${friendly(caught)}`);
        } finally {
          setSourceLoading(false);
        }
      }

      function clearSource() {
        setSource(null);
        setSourceExcerpt('');
        setResults(null);
      }

      function saveToHistory(nextPosts, info) {
        const list = Array.isArray(nextPosts) ? nextPosts.filter(Boolean) : [];
        if (!list.length) return;
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          posts: list,
          platform,
          mode,
          threadCount,
          source: source
            ? {
                title: source.title,
                site: source.site,
                url: source.url,
                path: source.path,
              }
            : null,
          model: info && info.model ? info.model : '',
          limit: info && Number.isFinite(info.limit) ? info.limit : limit,
          createdAt: Date.now(),
        };
        setHistory((previous) => {
          const next = [entry, ...previous].slice(0, 24);
          persistHistory(next);
          return next;
        });
      }

      async function copyText(value) {
        const text = String(value ?? '');
        if (!text) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            throw new Error('no clipboard');
          }
          setNotice(t('status.copied'));
        } catch {
          setError(t('error.copy'));
        }
      }

      async function runGeneration(options) {
        const opts = options || {};
        const previous =
          typeof opts.previous === 'string' ? opts.previous : combined;
        const instruction = String(opts.instruction ?? '').trim();
        const variation = Boolean(opts.variation);
        if (busyRef.current) return;
        if (!idea.trim() && !source && !previous) {
          setError(t('error.noInput'));
          return;
        }
        busyRef.current = true;

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setGenerating(true);
        setError('');
        setNotice('');
        setStreamText('');
        setPosts([]);
        setModelInfo(null);
        if (draftRef.current) {
          setTimeout(() => {
            if (draftRef.current && draftRef.current.scrollIntoView) {
              draftRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }
          }, 40);
        }

        try {
          const body = {
            platform,
            mode,
            threadPosts: threadCount,
            idea: idea.trim(),
            angle: angle.trim(),
            instructions: instructions.trim(),
            source: source
              ? {
                  title: source.title,
                  site: source.site,
                  url: source.url,
                  path: source.path,
                }
              : null,
            previous: instruction || variation ? previous : '',
            variation,
            instruction,
          };

          let response;
          try {
            response = await fetch(`${ROUTE}/generate`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
              signal: controller.signal,
            });
          } catch (caught) {
            if (caught && caught.name === 'AbortError') throw caught;
            throw new Error(t('error.network'));
          }

          if (!response.ok) {
            let message = t('error.generic');
            try {
              const data = await response.json();
              if (data && data.error) message = data.error;
            } catch {
              // Keep the generic message.
            }
            throw new Error(message);
          }

          if (!response.body) throw new Error(t('error.generic'));
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulated = '';
          let settled = false;

          const handleMessage = (message) => {
            if (!message || typeof message !== 'object') return;
            if (message.type === 'meta') {
              setModelInfo({
                model: message.model || '',
                provider: message.provider || '',
                limit: message.limit,
              });
            } else if (message.type === 'delta') {
              accumulated += String(message.text ?? '');
              setStreamText(accumulated);
            } else if (message.type === 'done') {
              const nextPosts = Array.isArray(message.posts)
                ? message.posts.filter(Boolean)
                : [message.draft].filter(Boolean);
              setPosts(nextPosts);
              setStreamText('');
              setModelInfo({
                model: message.model || '',
                provider: message.provider || '',
                limit: message.limit,
              });
              if (nextPosts.length) {
                saveToHistory(nextPosts, {
                  model: message.model,
                  limit: message.limit,
                });
                setNotice(t('status.done'));
              }
              settled = true;
            } else if (message.type === 'error') {
              throw new Error(message.message || t('error.generic'));
            }
          };

          while (!settled) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            let index;
            while ((index = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, index).trim();
              buffer = buffer.slice(index + 1);
              if (!line) continue;
              let message;
              try {
                message = JSON.parse(line);
              } catch {
                continue;
              }
              handleMessage(message);
              if (settled) break;
            }
          }

          if (!settled) {
            const tail = buffer.trim();
            if (tail) {
              try {
                handleMessage(JSON.parse(tail));
              } catch {
                // Ignore a partial final line.
              }
            }
          }
          if (!settled) throw new Error(t('error.network'));
        } catch (caught) {
          setStreamText('');
          if (caught && caught.name === 'AbortError') {
            setNotice(t('status.aborted'));
          } else {
            setError(friendly(caught));
          }
        } finally {
          busyRef.current = false;
          setGenerating(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }

      function openInChat() {
        try {
          if (!uiWorkspace || typeof uiWorkspace.startSession !== 'function') {
            throw new Error(t('error.generic'));
          }
          const parts = [];
          const label = platform === 'twitter' ? 'X (Twitter)' : 'Bluesky';
          const shape =
            mode === 'thread'
              ? `a thread of exactly ${threadCount} posts`
              : 'a single post';
          parts.push(
            `Use the tweet skill. Write ${shape} for ${label} (${limit} characters maximum per post).`,
          );
          if (source) {
            parts.push(
              `Source article: ${source.title}${source.url ? ` — ${source.url}` : ''}${
                source.path ? `\nCaptured text: ${source.path}` : ''
              }`,
            );
          } else if (idea.trim()) {
            parts.push(`Idea: ${idea.trim()}`);
          }
          if (angle.trim()) parts.push(`Angle: ${angle.trim()}`);
          if (instructions.trim())
            parts.push(`Additional instructions: ${instructions.trim()}`);
          if (posts.length)
            parts.push(`Current draft:\n${combined}\n\nRevise it.`);
          parts.push(
            'Write in English with British spelling, in the blog voice. Return only the final post(s), no commentary.',
          );
          uiWorkspace.startSession(undefined, {
            prompt: parts.join('\n\n'),
            clearPreviousDraft: true,
          });
          setNotice(t('status.chatOpened'));
        } catch (caught) {
          setError(friendly(caught));
        }
      }

      function loadHistoryEntry(entry) {
        if (!entry || !Array.isArray(entry.posts) || !entry.posts.length)
          return;
        setPosts(entry.posts);
        setPlatform(entry.platform === 'twitter' ? 'twitter' : 'bluesky');
        setMode(entry.mode === 'thread' ? 'thread' : 'single');
        setThreadCount(
          [3, 4, 5].includes(entry.threadCount) ? entry.threadCount : 3,
        );
        setSource(
          entry.source && typeof entry.source === 'object' && entry.source.path
            ? entry.source
            : null,
        );
        setSourceExcerpt('');
        setStreamText('');
        setError('');
        setModelInfo({
          model: entry.model || '',
          provider: '',
          limit: Number.isFinite(entry.limit)
            ? entry.limit
            : limitFor(entry.platform),
        });
        setNotice(t('status.historyLoaded'));
        if (draftRef.current && draftRef.current.scrollIntoView) {
          draftRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }

      function clearHistory() {
        setHistory([]);
        persistHistory([]);
      }

      function saveCurrent() {
        if (!posts.length) return;
        saveToHistory(posts, modelInfo);
        setNotice(t('status.saved'));
      }

      function newDraft() {
        setPosts([]);
        setStreamText('');
        setModelInfo(null);
        setRefineText('');
        setError('');
        if (draftRef.current && draftRef.current.scrollIntoView) {
          draftRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }

      function refine() {
        if (!canRefine) return;
        const instruction = refineText.trim();
        setRefineText('');
        runGeneration({ previous: combined, instruction });
      }

      const examples = ['AI data centre', 'Microsoft Nscale', 'backlash'];

      function renderResults() {
        if (source) return null;
        if (sourceLoading) {
          return h(
            'div',
            { className: 'dsh-ts-loading' },
            h(Spinner, { size: 14 }),
            t('source.loading'),
          );
        }
        if (searching) {
          return h(
            'div',
            { className: 'dsh-ts-loading' },
            h(Spinner, { size: 14 }),
            t('source.searching'),
          );
        }
        if (results === null) {
          return h(
            'div',
            null,
            h(
              'div',
              { className: 'dsh-ts-examples' },
              h(
                'span',
                { className: 'dsh-ts-examplesLabel' },
                t('source.examples'),
              ),
              examples.map((term) =>
                h(
                  'button',
                  {
                    key: term,
                    type: 'button',
                    className: 'dsh-ts-chip',
                    disabled: !deskReady || generating,
                    onClick: () => search(term),
                  },
                  term,
                ),
              ),
            ),
            h(
              'p',
              { className: 'dsh-ts-fieldHint', style: { marginTop: 7 } },
              t('source.examplesHint'),
            ),
          );
        }
        if (!results.length) {
          return h(
            'div',
            { className: 'dsh-ts-noResults' },
            h(IconSearch, { size: 16 }),
            h(
              'div',
              null,
              h('strong', null, t('source.noResults')),
              h('span', null, t('source.noResultsHint')),
            ),
          );
        }
        return h(
          'div',
          { className: 'dsh-ts-results' },
          results.map((result) =>
            h(
              'button',
              {
                key: `${result.id}-${result.path}`,
                type: 'button',
                className: 'dsh-ts-result',
                onClick: () => chooseSource(result),
                disabled: generating || sourceLoading,
              },
              h(
                'span',
                { className: 'dsh-ts-resultTop' },
                h(
                  'span',
                  { className: 'dsh-ts-resultSite' },
                  result.site || result.url || '',
                ),
                h(
                  'span',
                  { className: 'dsh-ts-resultMeta' },
                  [
                    result.words
                      ? t('source.words', { n: result.words })
                      : null,
                    result.coverage || null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                ),
              ),
              h('span', { className: 'dsh-ts-resultTitle' }, result.title),
            ),
          ),
        );
      }

      const sourceCard = h(
        'div',
        { className: 'dsh-ts-card' },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconLink, { size: 15 }),
            t('source.title'),
          ),
          source
            ? h(
                'span',
                { className: 'dsh-ts-badge dsh-ts-badgeGood' },
                h(IconCheck, { size: 12 }),
                t('source.ready'),
              )
            : h('span', { className: 'dsh-ts-optional' }, t('source.optional')),
        ),
        h('p', { className: 'dsh-ts-cardHint' }, t('source.hint')),
        source
          ? h(
              'div',
              { className: 'dsh-ts-sourceSelected' },
              h(
                'div',
                { className: 'dsh-ts-sourceIcon' },
                h(IconArticle, { size: 18 }),
              ),
              h(
                'div',
                { className: 'dsh-ts-sourceMain' },
                h('div', { className: 'dsh-ts-sourceSite' }, source.site || ''),
                h(
                  'div',
                  { className: 'dsh-ts-sourceTitle' },
                  source.title || '',
                ),
                h(
                  'div',
                  { className: 'dsh-ts-sourceMeta' },
                  [
                    source.words
                      ? t('source.words', { n: source.words })
                      : null,
                    source.coverage
                      ? t('source.coverage', { level: source.coverage })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                ),
                sourceExcerpt
                  ? h('p', { className: 'dsh-ts-sourceExcerpt' }, sourceExcerpt)
                  : null,
                h(
                  'div',
                  { className: 'dsh-ts-sourceActions' },
                  source.url
                    ? h(
                        'a',
                        {
                          className: 'dsh-ts-link',
                          href: source.url,
                          target: '_blank',
                          rel: 'noreferrer noopener',
                        },
                        t('source.open'),
                        h(IconExternal, { size: 12 }),
                      )
                    : null,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-ts-textBtn',
                      onClick: clearSource,
                      disabled: generating,
                      'aria-label': t('a11y.removeSource'),
                    },
                    t('source.remove'),
                  ),
                ),
              ),
            )
          : h(
              'form',
              {
                className: 'dsh-ts-searchRow',
                onSubmit: (event) => {
                  event.preventDefault();
                  search();
                },
              },
              h('input', {
                className: 'dsh-ts-input',
                value: query,
                onChange: (event) => setQuery(event.target.value),
                placeholder: t('source.placeholder'),
                'aria-label': t('a11y.search'),
                disabled: generating,
              }),
              h(
                'button',
                {
                  type: 'submit',
                  className: 'dsh-ts-btn',
                  disabled:
                    searching || !deskReady || generating || !query.trim(),
                },
                searching
                  ? h(Spinner, { size: 14 })
                  : h(IconSearch, { size: 15 }),
                searching ? t('source.searching') : t('source.search'),
              ),
            ),
        renderResults(),
        service.status === 'ready' && !service.desk
          ? h(
              'p',
              { className: 'dsh-ts-fieldHint', style: { marginTop: 8 } },
              t('source.deskMissing'),
            )
          : null,
      );

      const setupCard = h(
        'div',
        { className: 'dsh-ts-card' },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconSpark, { size: 15 }),
            t('setup.title'),
          ),
          h(
            'span',
            { className: 'dsh-ts-optional' },
            `${limit} ${t('unit.chars')}`,
          ),
        ),
        h(
          'div',
          {
            className: 'dsh-ts-platforms',
            role: 'group',
            'aria-label': t('a11y.platform'),
          },
          [
            { value: 'bluesky', label: t('platform.bluesky') },
            { value: 'twitter', label: t('platform.twitter') },
          ].map((option) =>
            h(
              'button',
              {
                key: option.value,
                type: 'button',
                className: 'dsh-ts-platform',
                'data-active': platform === option.value ? 'true' : 'false',
                'aria-pressed': platform === option.value,
                disabled: generating,
                onClick: () => setPlatform(option.value),
              },
              h(
                'span',
                { className: 'dsh-ts-platformIcon' },
                h(PlatformMark, { platform: option.value, size: 20 }),
              ),
              h(
                'span',
                { className: 'dsh-ts-platformText' },
                h('span', { className: 'dsh-ts-platformName' }, option.label),
                h(
                  'span',
                  { className: 'dsh-ts-platformMeta' },
                  t('platform.limit', { n: limitFor(option.value) }),
                ),
              ),
              platform === option.value
                ? h(
                    'span',
                    { className: 'dsh-ts-platformCheck' },
                    h(IconCheck, { size: 14 }),
                  )
                : null,
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-ts-modeRow' },
          h(Segmented, {
            value: mode,
            ariaLabel: t('a11y.mode'),
            disabled: generating,
            onChange: setMode,
            options: [
              { value: 'single', label: t('mode.single'), icon: IconFeather },
              { value: 'thread', label: t('mode.thread'), icon: IconThread },
            ],
          }),
          mode === 'thread'
            ? h(
                'label',
                { className: 'dsh-ts-kbd' },
                t('setup.threadLength'),
                h(
                  'select',
                  {
                    className: 'dsh-ts-select',
                    value: threadCount,
                    onChange: (event) =>
                      setThreadCount(Number(event.target.value)),
                    disabled: generating,
                    'aria-label': t('setup.threadLength'),
                  },
                  [3, 4, 5].map((value) =>
                    h(
                      'option',
                      { key: value, value },
                      t('mode.posts', { n: value }),
                    ),
                  ),
                ),
              )
            : null,
        ),
      );

      const briefCard = h(
        'div',
        { className: 'dsh-ts-card' },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconQuote, { size: 15 }),
            t('brief.title'),
          ),
          source
            ? h('span', { className: 'dsh-ts-badge' }, source.site || '')
            : null,
        ),
        h('p', { className: 'dsh-ts-cardHint' }, t('brief.hint')),
        h(
          'div',
          { className: 'dsh-ts-field' },
          h(
            'label',
            { className: 'dsh-ts-fieldLabel', htmlFor: 'dsh-ts-idea' },
            t('brief.title'),
          ),
          h('textarea', {
            id: 'dsh-ts-idea',
            className: 'dsh-ts-textarea',
            value: idea,
            onChange: (event) => setIdea(event.target.value),
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                if (canGenerate) runGeneration({});
              }
            },
            placeholder: t('brief.placeholder'),
            rows: 3,
            disabled: generating,
          }),
        ),
        h(
          'div',
          { className: 'dsh-ts-two' },
          h(
            'div',
            { className: 'dsh-ts-field' },
            h(
              'label',
              { className: 'dsh-ts-fieldLabel', htmlFor: 'dsh-ts-angle' },
              t('brief.angle'),
            ),
            h('input', {
              id: 'dsh-ts-angle',
              className: 'dsh-ts-input',
              value: angle,
              onChange: (event) => setAngle(event.target.value),
              placeholder: t('brief.anglePlaceholder'),
              disabled: generating,
            }),
          ),
          h(
            'div',
            { className: 'dsh-ts-field' },
            h(
              'label',
              {
                className: 'dsh-ts-fieldLabel',
                htmlFor: 'dsh-ts-instructions',
              },
              t('brief.instructions'),
            ),
            h('input', {
              id: 'dsh-ts-instructions',
              className: 'dsh-ts-input',
              value: instructions,
              onChange: (event) => setInstructions(event.target.value),
              placeholder: t('brief.instructionsPlaceholder'),
              disabled: generating,
            }),
          ),
        ),
        h(
          'div',
          { className: 'dsh-ts-generateRow' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-ts-btn dsh-ts-btnPrimary dsh-ts-btnLg',
              onClick: () => runGeneration({}),
              disabled: !canGenerate,
              title: canGenerate ? t('generate.hint') : t('error.noInput'),
            },
            generating ? h(Spinner, { size: 15 }) : h(IconSpark, { size: 16 }),
            generating ? t('generate.generating') : t('generate.action'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-ts-btn',
              onClick: openInChat,
              disabled: !canGenerate && !posts.length,
              title: t('generate.openChatHint'),
              'aria-label': t('a11y.openChat'),
            },
            h(IconSend, { size: 15 }),
            t('generate.openChat'),
          ),
          h(
            'span',
            { className: 'dsh-ts-kbd' },
            h('kbd', null, kbdHint),
            t('generate.kbd'),
          ),
        ),
      );

      const draftHeaderActions = posts.length
        ? h(
            'div',
            { className: 'dsh-ts-draftActions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-ts-textBtn',
                onClick: () => copyText(combined),
              },
              t(mode === 'thread' ? 'draft.copyAll' : 'draft.copy'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-ts-textBtn',
                onClick: saveCurrent,
              },
              t('draft.save'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-ts-textBtn',
                onClick: () =>
                  runGeneration({ previous: combined, variation: true }),
                disabled: generating,
              },
              t('draft.regenerate'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-ts-textBtn',
                onClick: newDraft,
                disabled: generating,
              },
              t('draft.new'),
            ),
          )
        : null;

      const draftBody = generating
        ? h(
            'div',
            { className: 'dsh-ts-stream' },
            h(
              'div',
              { className: 'dsh-ts-streamHead' },
              h(Spinner, { size: 14 }),
              t('draft.waiting'),
              h(LimitMeter, { count: countGraphemes(streamText), limit }),
            ),
            h(
              'div',
              { className: 'dsh-ts-streamText' },
              streamText || t('draft.waiting'),
              h('span', { className: 'dsh-ts-caret' }),
            ),
          )
        : posts.length
          ? h(
              'div',
              null,
              posts.map((post, index) =>
                h(PostCard, {
                  key: `${index}-${posts.length}`,
                  index,
                  total: posts.length,
                  text: post,
                  limit,
                  isThread: mode === 'thread',
                  onChange: (value) =>
                    setPosts((previous) =>
                      previous.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    ),
                  onCopy: copyText,
                  t,
                }),
              ),
            )
          : h(
              'div',
              { className: 'dsh-ts-empty' },
              h(
                'div',
                { className: 'dsh-ts-emptyIcon' },
                h(IconFeather, { size: 26 }),
              ),
              h('div', { className: 'dsh-ts-emptyTitle' }, t('draft.empty')),
              h('p', { className: 'dsh-ts-emptyHint' }, t('draft.emptyHint')),
            );

      const draftCard = h(
        'div',
        {
          className: 'dsh-ts-card dsh-ts-draftCard',
          ref: draftRef,
          'aria-busy': generating,
        },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconFeather, { size: 15 }),
            t('draft.title'),
            modelInfo && modelInfo.model
              ? h(
                  'span',
                  { className: 'dsh-ts-modelPill', title: modelInfo.model },
                  modelInfo.model,
                )
              : null,
          ),
          draftHeaderActions,
        ),
        draftBody,
        posts.length
          ? h(
              'form',
              {
                className: 'dsh-ts-refine',
                onSubmit: (event) => {
                  event.preventDefault();
                  refine();
                },
              },
              h('input', {
                className: 'dsh-ts-input',
                value: refineText,
                onChange: (event) => setRefineText(event.target.value),
                placeholder: t('draft.refinePlaceholder'),
                'aria-label': t('a11y.refine'),
                disabled: generating,
              }),
              h(
                'button',
                {
                  type: 'submit',
                  className: 'dsh-ts-btn',
                  disabled: !canRefine,
                },
                h(IconSpark, { size: 14 }),
                t('draft.refine'),
              ),
            )
          : null,
      );

      const voiceCard = h(
        'div',
        { className: 'dsh-ts-card dsh-ts-voiceCard' },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconSpark, { size: 15 }),
            t('voice.title'),
          ),
        ),
        h(
          'ul',
          { className: 'dsh-ts-voiceList' },
          ['voice.one', 'voice.two', 'voice.three', 'voice.four'].map((key) =>
            h('li', { key }, t(key)),
          ),
        ),
      );

      const historyCard = h(
        'div',
        { className: 'dsh-ts-card' },
        h(
          'div',
          { className: 'dsh-ts-cardHead' },
          h(
            'div',
            { className: 'dsh-ts-cardTitle' },
            h(IconClock, { size: 15 }),
            t('history.title'),
          ),
          history.length
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-ts-textBtn',
                  onClick: clearHistory,
                  'aria-label': t('a11y.clearHistory'),
                },
                t('history.clear'),
              )
            : null,
        ),
        history.length
          ? h(
              'div',
              { className: 'dsh-ts-history' },
              history.slice(0, 7).map((entry) =>
                h(
                  'button',
                  {
                    key: entry.id,
                    type: 'button',
                    className: 'dsh-ts-historyItem',
                    onClick: () => loadHistoryEntry(entry),
                    title: t('history.use'),
                  },
                  h(
                    'span',
                    { className: 'dsh-ts-historyIcon' },
                    h(PlatformMark, { platform: entry.platform, size: 14 }),
                  ),
                  h(
                    'span',
                    { className: 'dsh-ts-historyMain' },
                    h(
                      'span',
                      { className: 'dsh-ts-historyTitle' },
                      (entry.source && entry.source.title) ||
                        entry.posts[0] ||
                        '',
                    ),
                    h(
                      'span',
                      { className: 'dsh-ts-historyMeta' },
                      [
                        entry.mode === 'thread'
                          ? t('mode.posts', { n: entry.posts.length })
                          : t('mode.single'),
                        entry.limit
                          ? `${entry.limit} ${t('unit.chars')}`
                          : null,
                        formatDate(entry.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ),
                  ),
                ),
              ),
            )
          : h(
              'p',
              { className: 'dsh-ts-cardHint', style: { margin: 0 } },
              t('history.empty'),
            ),
      );

      return h(
        'section',
        { className: 'dsh-ts-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dsh-ts-wrap' },
          h(
            'header',
            { className: 'dsh-ts-hero', 'data-window-drag': true },
            h(
              'div',
              { className: 'dsh-ts-mark' },
              h(IconFeather, { size: 28 }),
            ),
            h(
              'div',
              { className: 'dsh-ts-heroText' },
              h('div', { className: 'dsh-ts-eyebrow' }, t('hero.eyebrow')),
              h('h1', { className: 'dsh-ts-title' }, t('title')),
              h('p', { className: 'dsh-ts-intro' }, t('intro')),
            ),
            h(
              'div',
              { className: 'dsh-ts-heroBadge' },
              h('span', { className: 'dsh-ts-dot' }),
              h(
                'span',
                null,
                `${t('platform.bluesky')} ${limits.bluesky} · ${t('platform.twitter')} ${limits.twitter}`,
              ),
            ),
          ),
          service.status === 'offline'
            ? h(
                'div',
                {
                  className: 'dsh-ts-banner dsh-ts-bannerWarn',
                  role: 'status',
                },
                h(IconAlert, { size: 16 }),
                h('span', null, t('status.offline')),
              )
            : null,
          service.status === 'ready' && !service.skill
            ? h(
                'div',
                {
                  className: 'dsh-ts-banner dsh-ts-bannerInfo',
                  role: 'status',
                },
                h(IconInfo, { size: 16 }),
                h('span', null, t('status.skillMissing')),
              )
            : null,
          error
            ? h(
                'div',
                { className: 'dsh-ts-alert', role: 'alert' },
                h(
                  'span',
                  { className: 'dsh-ts-alertIcon' },
                  h(IconAlert, { size: 17 }),
                ),
                h(
                  'div',
                  { className: 'dsh-ts-alertBody' },
                  h(
                    'div',
                    { className: 'dsh-ts-alertTitle' },
                    t('error.title'),
                  ),
                  h('p', { className: 'dsh-ts-alertText' }, error),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-ts-iconBtn',
                    onClick: () => setError(''),
                    'aria-label': t('a11y.dismiss'),
                  },
                  h(IconClose, { size: 14 }),
                ),
              )
            : null,
          h(
            'div',
            { className: 'dsh-ts-grid' },
            h(
              'div',
              { className: 'dsh-ts-col' },
              setupCard,
              sourceCard,
              briefCard,
              draftCard,
            ),
            h(
              'aside',
              { className: 'dsh-ts-aside' },
              voiceCard,
              historyCard,
              h(
                'p',
                { className: 'dsh-ts-footer' },
                `${t('footer.skill')} · ${t('footer.noPublish')}`,
              ),
            ),
          ),
        ),
        notice
          ? h(
              'div',
              { className: 'dsh-ts-toast', role: 'status' },
              h(IconCheck, { size: 15 }),
              h('span', null, notice),
            )
          : null,
      );
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => {
          const en = ctx.locale.register(NS, 'en', EN);
          const fr = ctx.locale.register(NS, 'fr', FR);
          return () => {
            en();
            fr();
          };
        }, 'tweet-studio: dictionaries');

        const t = ctx.locale.bind(NS);
        const uiWorkspace = ctx.uiWorkspace;

        function Page(props) {
          return h(TweetStudioPage, { ...props, t, uiWorkspace });
        }
        Page.displayName = 'TweetStudioPage';

        function SidebarIcon(props) {
          return h(TweetStudioIcon, { size: props.size });
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            Page,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 20,
              label: () => t('panel.label'),
              locale: NS,
            },
            SidebarIcon,
          ),
        );
      },
    };
  },
});
