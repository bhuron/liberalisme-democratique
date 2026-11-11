window.__ModuleLoader__.load({
  id: '@local/bureau',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef } = React;

    const NS = 'bureau';
    const PANEL_ID = 'bureau';
    const ROUTE = '/api/bureau';

    const EN = {
      'panel.label': 'The desk',
      'new.button': '+ New article',
      'pieces.label': 'Articles',
      'pieces.empty': 'No article yet.',
      'agent.ready': 'agent: {model}',
      'agent.noSession': 'agent: no session',
      'agent.noDesk': 'agent: desk not found',
      'agent.offline': 'agent: offline',
      'agent.fake': 'agent: demonstration',
      'new.eyebrow': 'New article',
      'new.title': 'What do you want to write about?',
      'new.lede':
        'Start from the articles you just read. The desk freezes them, then opens a fresh conversation with them.',
      'new.step1': '1. Articles',
      'new.count': '{n} capture(s)',
      'new.filter': 'Filter by title or site…',
      'new.step2': '2. Intent',
      'new.intentLabel':
        'What you want to say, in one or two sentences. Optional.',
      'new.intentPlaceholder':
        'Example: the financial fragility I described in January now shows up politically.',
      'new.titleLabel': 'Working title. Optional.',
      'new.titlePlaceholder': 'The AI bubble meets its legitimacy crisis',
      'new.submit': 'Start the conversation',
      'new.summaryNone': 'Pick at least one article.',
      'new.summaryMany': '{n} article(s)',
      'new.emptyTitle': 'Nothing to read yet.',
      'new.emptyHint':
        'Capture one or two articles with the bookmark-digest extension, then come back.',
      'new.refresh': 'Refresh',
      'new.loading': 'Loading captures…',
      'new.used': 'already in “{title}”',
      'coverage.full': 'full text',
      'coverage.partial': 'partial',
      'coverage.failed': 'failed',
      'piece.choose': 'Pick an article on the left.',
      'piece.sources': '{n} source(s) · {sites}',
      'piece.noSources': 'No frozen source',
      'piece.delete': 'Delete',
      'piece.deleteConfirm':
        'Move this piece to editorial/archive? The draft in src/content/blog is kept.',
      'tab.chat': 'Discussion',
      'tab.research': 'Research',
      'tab.draft': 'Draft',
      'chat.startHint':
        'The discussion has not started. The first message sends the agent the frozen sources, the intent and the charter.',
      'chat.start': 'Start the discussion',
      'chat.placeholder': 'Say what you mean, or ask a question…',
      'chat.send': 'Send',
      'chat.you': 'You',
      'chat.agent': 'Agent',
      'chat.context': 'Context sent to the agent',
      'chat.working': 'the agent is working…',
      'chat.stop': 'Stop',
      'chat.retry': 'Retry',
      'chat.cancelled': 'Answer cancelled.',
      'doc.researchLabel': 'Research',
      'doc.draftLabel': 'Draft',
      'doc.researchEmpty': 'No research yet. Ask for it in the discussion.',
      'doc.draftEmpty': 'No draft yet. Ask for it in the discussion.',
      'doc.reload': 'Reload',
      'doc.copy': 'Copy',
      'doc.copied': 'Copied',
      'doc.loading': 'Reading the document…',
      'doc.empty': 'The document is empty.',
      'a11y.pieces': 'Articles',
      'a11y.new': 'Create a new article',
      'a11y.delete': 'Delete the piece',
      'a11y.filter': 'Filter captured articles',
      'a11y.message': 'Message to the agent',
      'a11y.context': 'Context sent to the agent',
      'a11y.reload': 'Reload the document',
      'a11y.copy': 'Copy the document',
    };

    const FR = {
      'panel.label': 'Le bureau',
      'new.button': '+ Nouvel article',
      'pieces.label': 'Articles',
      'pieces.empty': 'Aucun article pour l’instant.',
      'agent.ready': 'agent : {model}',
      'agent.noSession': 'agent : aucune session',
      'agent.noDesk': 'agent : desk introuvable',
      'agent.offline': 'agent : hors ligne',
      'agent.fake': 'agent : démonstration',
      'new.eyebrow': 'Nouvel article',
      'new.title': 'Sur quoi voulez-vous écrire ?',
      'new.lede':
        'Partez des articles que vous venez de lire. Le bureau les fige, puis ouvre une conversation neuve avec eux.',
      'new.step1': '1. Les articles',
      'new.count': '{n} capture(s)',
      'new.filter': 'Filtrer par titre ou par site…',
      'new.step2': '2. L’intention',
      'new.intentLabel':
        'Ce que vous voulez dire, en une ou deux phrases. Facultatif.',
      'new.intentPlaceholder':
        'Exemple : la fragilité financière que j’ai décrite en janvier se manifeste maintenant par le politique.',
      'new.titleLabel': 'Titre de travail. Facultatif.',
      'new.titlePlaceholder': 'La bulle IA rencontre sa crise de légitimité',
      'new.submit': 'Commencer la discussion',
      'new.summaryNone': 'Sélectionnez au moins un article.',
      'new.summaryMany': '{n} article(s)',
      'new.emptyTitle': 'Rien à se mettre sous la dent.',
      'new.emptyHint':
        'Capturez d’abord un ou deux articles avec l’extension bookmark-digest, puis revenez ici.',
      'new.refresh': 'Rafraîchir',
      'new.loading': 'Chargement des captures…',
      'new.used': 'déjà dans « {title} »',
      'coverage.full': 'texte complet',
      'coverage.partial': 'partiel',
      'coverage.failed': 'échec',
      'piece.choose': 'Choisissez un article à gauche.',
      'piece.sources': '{n} source(s) · {sites}',
      'piece.noSources': 'Aucune source figée',
      'piece.delete': 'Supprimer',
      'piece.deleteConfirm':
        'Déplacer cette pièce dans editorial/archive ? Le brouillon dans src/content/blog est conservé.',
      'tab.chat': 'Discussion',
      'tab.research': 'Recherche',
      'tab.draft': 'Brouillon',
      'chat.startHint':
        'La discussion n’a pas encore commencé. Le premier message envoie à l’agent les sources figées, l’intention et la charte.',
      'chat.start': 'Démarrer la discussion',
      'chat.placeholder':
        'Dites ce que vous voulez dire, ou posez une question…',
      'chat.send': 'Envoyer',
      'chat.you': 'Vous',
      'chat.agent': 'Agent',
      'chat.context': 'Contexte envoyé à l’agent',
      'chat.working': 'l’agent travaille…',
      'chat.stop': 'Arrêter',
      'chat.retry': 'Relancer',
      'chat.cancelled': 'Réponse annulée.',
      'doc.researchLabel': 'Recherche',
      'doc.draftLabel': 'Brouillon',
      'doc.researchEmpty':
        'Pas encore de recherche. Demandez-la dans la discussion.',
      'doc.draftEmpty':
        'Pas encore de brouillon. Demandez-le dans la discussion.',
      'doc.reload': 'Recharger',
      'doc.copy': 'Copier',
      'doc.copied': 'Copié',
      'doc.loading': 'Lecture du document…',
      'doc.empty': 'Le document est vide.',
      'a11y.pieces': 'Articles',
      'a11y.new': 'Créer un nouvel article',
      'a11y.delete': 'Supprimer la pièce',
      'a11y.filter': 'Filtrer les articles capturés',
      'a11y.message': 'Message à l’agent',
      'a11y.context': 'Contexte envoyé à l’agent',
      'a11y.reload': 'Recharger le document',
      'a11y.copy': 'Copier le document',
    };

    const CSS = `
@font-face {
  font-family: 'BureauInter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('${ROUTE}/font') format('woff2');
}
.dsh-bu-root {
  height: 100%;
  overflow-y: auto;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: 'BureauInter', Inter, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  font-feature-settings: 'cv02' on, 'cv03' on, 'cv04' on, 'cv11' on;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.dsh-bu-root, .dsh-bu-root * { box-sizing: border-box; }
.dsh-bu-root :where(button, input, textarea) { font: inherit; }
.dsh-bu-root :where(input, textarea) { color: inherit; }
.dsh-bu-root button { cursor: pointer; }
.dsh-bu-root :focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dsh-bu-app {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  min-height: 100%;
}
.dsh-bu-side {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 100dvh;
  padding: 24px 16px;
  border-right: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
}
.dsh-bu-main { min-width: 0; }
.dsh-bu-wrap { width: 100%; max-width: 820px; margin: 0 auto; padding: 48px 40px 96px; }

.dsh-bu-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 38px; padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary));
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 14px; font-weight: 500; text-decoration: none;
  transition: opacity .15s ease;
}
.dsh-bu-primary:hover { opacity: .88; }
.dsh-bu-primary:disabled { opacity: .45; cursor: not-allowed; }
.dsh-bu-block { width: 100%; }
.dsh-bu-small {
  min-height: 30px; padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 12px; font-weight: 500;
}
.dsh-bu-small:hover { background: var(--dsw-alias-bg-layer-1); }
.dsh-bu-ghost {
  min-height: 30px; padding: 0 9px;
  border: 1px solid transparent; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 12px; font-weight: 500;
}
.dsh-bu-ghost:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dsh-bu-danger { color: var(--dsw-alias-state-error-primary); }
.dsh-bu-danger:hover { background: color-mix(in oklab, var(--dsw-alias-state-error-primary) 9%, transparent); color: var(--dsw-alias-state-error-primary); }

.dsh-bu-pieces { display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; overflow-y: auto; }
.dsh-bu-row {
  display: block; width: 100%; padding: 7px 10px;
  border: 0; border-radius: 6px; background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px; line-height: 1.35; text-align: left;
}
.dsh-bu-row:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dsh-bu-rowActive { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 500; }
.dsh-bu-hint { margin: 0; padding: 0 10px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.dsh-bu-agent {
  display: flex; align-items: center; gap: 6px;
  margin-top: auto; padding: 12px 4px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary); font-size: 12px;
}
.dsh-bu-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-label-secondary); flex: none; }
.dsh-bu-dot[data-tone="ok"] { background: var(--dsw-alias-state-success-primary); }
.dsh-bu-dot[data-tone="warn"] { background: var(--dsw-alias-state-warn-primary); }
.dsh-bu-dot[data-tone="bad"] { background: var(--dsw-alias-state-error-primary); }

.dsh-bu-eyebrow {
  margin: 0 0 8px; color: var(--dsw-alias-label-secondary);
  font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
}
.dsh-bu-root h1 {
  margin: 0 0 12px;
  font-family: inherit;
  font-size: clamp(1.75rem, 2.5vw, 2rem);
  line-height: 1.2; font-weight: 600; letter-spacing: -.025em;
  text-wrap: balance;
}
.dsh-bu-root h2 {
  margin: 0; font-family: inherit;
  font-size: 1.125rem; line-height: 1.3; font-weight: 600; letter-spacing: -.015em;
}
.dsh-bu-lede {
  max-width: 60ch; margin: 0 0 32px;
  color: var(--dsw-alias-label-secondary);
  font-size: 1.0625rem; line-height: 1.6; text-wrap: pretty;
}
.dsh-bu-error {
  margin: 0 0 20px; padding: 10px 12px;
  border: 1px solid color-mix(in oklab, var(--dsw-alias-state-error-primary) 40%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-base));
  color: var(--dsw-alias-state-error-primary);
  font-size: 14px;
}
.dsh-bu-loading { color: var(--dsw-alias-label-secondary); font-size: 14px; }

.dsh-bu-step { margin: 0 0 32px; }
.dsh-bu-stepHead { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.dsh-bu-count { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dsh-bu-filter {
  width: 100%; max-width: 420px; height: 40px; margin-bottom: 12px; padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px;
  background: var(--dsw-alias-bg-base); font-size: 16px;
}
.dsh-bu-filter:focus { outline: none; border-color: var(--dsw-alias-label-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--dsw-alias-label-primary) 8%, transparent); }
.dsh-bu-sources { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dsh-bu-source {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px;
  background: var(--dsw-alias-bg-base);
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.dsh-bu-source:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
.dsh-bu-source[data-selected="1"] { border-color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.dsh-bu-source input { width: 16px; height: 16px; margin: 3px 0 0; accent-color: var(--dsw-alias-label-primary); flex: none; }
.dsh-bu-sourceMain { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsh-bu-sourceSite { color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.dsh-bu-sourceTitle { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 1.4; }
.dsh-bu-sourceMeta { margin-top: 2px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dsh-bu-used { color: var(--dsw-alias-state-warn-primary); font-size: 11px; }
.dsh-bu-badge {
  display: inline-block; padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px;
  color: var(--dsw-alias-label-secondary); font-size: 11px;
}
.dsh-bu-badge[data-tone="warn"] { border-color: color-mix(in oklab, var(--dsw-alias-state-warn-primary) 40%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dsh-bu-badge[data-tone="bad"] { border-color: color-mix(in oklab, var(--dsw-alias-state-error-primary) 40%, transparent); color: var(--dsw-alias-state-error-primary); }
.dsh-bu-field { margin-bottom: 18px; }
.dsh-bu-field label { display: block; margin-bottom: 6px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.dsh-bu-field input, .dsh-bu-field textarea {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px;
  background: var(--dsw-alias-bg-base); font-size: 16px; line-height: 1.5;
}
.dsh-bu-field textarea { min-height: 96px; resize: vertical; }
.dsh-bu-field input:focus, .dsh-bu-field textarea:focus {
  outline: none; border-color: var(--dsw-alias-label-primary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--dsw-alias-label-primary) 8%, transparent);
}
.dsh-bu-newActions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 8px; }
.dsh-bu-summary { color: var(--dsw-alias-label-secondary); font-size: 13px; }

.dsh-bu-pieceHead { margin: 0 0 20px; }
.dsh-bu-titleRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.dsh-bu-titleRow h1 { flex: 1; margin: 0; }
.dsh-bu-sourceLine { margin: 6px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; }

.dsh-bu-tabs {
  display: flex; gap: 24px; margin: 0 0 28px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  overflow-x: auto; scrollbar-width: none;
}
.dsh-bu-tabs::-webkit-scrollbar { display: none; }
.dsh-bu-tabs button {
  padding: 0 0 10px;
  border: 0; border-bottom: 2px solid transparent; background: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px; font-weight: 500; white-space: nowrap;
}
.dsh-bu-tabs button:hover { color: var(--dsw-alias-label-primary); }
.dsh-bu-tabs button[aria-selected="true"] { border-bottom-color: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary); }

.dsh-bu-progress {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 20px; padding: 8px 12px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary); font-size: 13px;
}
.dsh-bu-progress::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--dsw-alias-label-primary); flex: none;
  animation: dsh-bu-pulse 1.2s ease-in-out infinite;
}
@keyframes dsh-bu-pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }

.dsh-bu-chat { display: flex; flex-direction: column; gap: 24px; }
.dsh-bu-msg { min-width: 0; }
.dsh-bu-who {
  margin-bottom: 4px; color: var(--dsw-alias-label-secondary);
  font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
}
.dsh-bu-msgUser { align-self: flex-end; max-width: 85%; padding: 10px 14px; border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dsh-bu-msgUser .dsh-bu-who { display: none; }
.dsh-bu-msgUser .dsh-bu-text { white-space: pre-wrap; }
.dsh-bu-msgAssistant { max-width: 100%; }
.dsh-bu-msgError { padding: 10px 12px; border-left: 2px solid var(--dsw-alias-state-error-primary); border-radius: 0 6px 6px 0; background: color-mix(in oklab, var(--dsw-alias-state-error-primary) 7%, transparent); }
.dsh-bu-text { overflow-wrap: anywhere; font-size: 16px; line-height: 1.65; }
.dsh-bu-msgAssistant .dsh-bu-text { max-width: 68ch; }
.dsh-bu-typing { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.dsh-bu-typing i { width: 4px; height: 4px; border-radius: 50%; background: var(--dsw-alias-label-secondary); animation: dsh-bu-pulse 1.2s ease-in-out infinite; }
.dsh-bu-typing i:nth-child(2) { animation-delay: .15s; }
.dsh-bu-typing i:nth-child(3) { animation-delay: .3s; }
.dsh-bu-stop { margin-left: auto; }
.dsh-bu-retry { margin: 10px 0 0; }
.dsh-bu-flash { margin: 10px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dsh-bu-context { margin: 0 0 24px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; }
.dsh-bu-context summary { padding: 8px 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsh-bu-context pre {
  max-height: 280px; margin: 0; padding: 0 12px 12px; overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 11px; line-height: 1.5; white-space: pre-wrap;
}
.dsh-bu-empty { max-width: 56ch; padding: 48px 0; color: var(--dsw-alias-label-secondary); font-size: 15px; }
.dsh-bu-empty p { margin: 0 0 18px; }

.dsh-bu-composer { position: sticky; bottom: 0; margin-top: 32px; padding: 12px 0 24px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); }
.dsh-bu-composerBox {
  display: flex; align-items: flex-end; gap: 8px; padding: 6px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px;
  background: var(--dsw-alias-bg-base);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.dsh-bu-composerBox:focus-within { border-color: var(--dsw-alias-label-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--dsw-alias-label-primary) 8%, transparent); }
.dsh-bu-composerBox textarea {
  flex: 1; min-height: 40px; max-height: 200px; padding: 8px 6px;
  border: 0; background: transparent; font-size: 16px; line-height: 1.5;
  resize: vertical; outline: none;
}
.dsh-bu-composerBox .dsh-bu-primary { flex: none; min-height: 40px; padding: 0 16px; }

.dsh-bu-docHead {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin: 0 0 24px; padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-bu-docLabel { color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.dsh-bu-docActions { display: flex; align-items: center; gap: 12px; min-width: 0; }
.dsh-bu-path { overflow: hidden; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.dsh-bu-md h2 { margin: 1.4em 0 .4em; font-size: 1.15rem; line-height: 1.3; font-weight: 600; }
.dsh-bu-md h3, .dsh-bu-md h4 { margin: 1.2em 0 .3em; font-size: 1.05rem; line-height: 1.35; font-weight: 600; }
.dsh-bu-doc { max-width: 68ch; color: var(--dsw-alias-label-primary); font-size: 16px; line-height: 1.7; }
.dsh-bu-doc h2, .dsh-bu-doc h3, .dsh-bu-doc h4 { color: var(--dsw-alias-label-primary); }
.dsh-bu-doc h2 { margin: 1.6em 0 .5em; font-size: 1.5rem; line-height: 1.25; font-weight: 600; letter-spacing: -.02em; }
.dsh-bu-doc h3 { margin: 1.6em 0 .5em; font-size: 1.25rem; line-height: 1.3; font-weight: 600; letter-spacing: -.015em; }
.dsh-bu-doc h4 { margin: 1.4em 0 .4em; font-size: 1.0625rem; font-weight: 600; }
.dsh-bu-md p { margin: 0 0 1em; text-wrap: pretty; }
.dsh-bu-md ul, .dsh-bu-md ol { margin: 0 0 1em; padding-left: 1.25em; }
.dsh-bu-md li { margin: .25em 0; }
.dsh-bu-md blockquote { margin: 0 0 1em; padding-left: 12px; border-left: 2px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
.dsh-bu-md hr { margin: 1.5em 0; border: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.dsh-bu-md a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.dsh-bu-md code, .dsh-bu-text code { padding: 1px 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .875em; }
.dsh-bu-md pre, .dsh-bu-text pre { margin: 0 0 1em; padding: 12px 14px; overflow: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
.dsh-bu-md pre code, .dsh-bu-text pre code { padding: 0; background: none; font-size: inherit; }
.dsh-bu-md > :last-child { margin-bottom: 0; }

@media (max-width: 820px) {
  .dsh-bu-app { grid-template-columns: 1fr; }
  .dsh-bu-side { position: static; max-height: none; gap: 12px; padding: 16px; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .dsh-bu-pieces { flex-direction: row; gap: 4px; overflow-x: auto; padding-bottom: 2px; }
  .dsh-bu-row { white-space: nowrap; }
  .dsh-bu-agent { margin-top: 0; padding: 0 4px; border-top: 0; }
  .dsh-bu-wrap { padding: 28px 20px 80px; }
  .dsh-bu-sources { grid-template-columns: 1fr; }
  .dsh-bu-titleRow { gap: 16px; }
}
@media (max-width: 560px) {
  .dsh-bu-wrap { padding: 24px 16px 64px; }
  .dsh-bu-tabs { gap: 18px; }
  .dsh-bu-msgUser { max-width: 100%; }
  .dsh-bu-docHead { align-items: flex-start; flex-direction: column; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-bu-root *, .dsh-bu-root *::before, .dsh-bu-root *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

    /* -------------------------------------------------------------- */
    /* Icons                                                           */
    /* -------------------------------------------------------------- */

    function IconDesk(props) {
      return h(
        'svg',
        {
          width: props.size,
          height: props.size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M4 20h16' }),
        h('path', { d: 'M6 20V9l6-4 6 4v11' }),
        h('path', { d: 'M9.5 20v-5.5h5V20' }),
        h('path', { d: 'M9.5 10.5h5' }),
      );
    }

    /* -------------------------------------------------------------- */
    /* Helpers                                                         */
    /* -------------------------------------------------------------- */

    async function api(pathname, options) {
      return fetch(ROUTE + pathname, {
        ...options,
        headers: {
          'content-type': 'application/json',
          ...(options?.headers ?? {}),
        },
      });
    }

    async function readNdjson(response, onEvent) {
      if (!response.body) throw new Error('Streaming unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index = buffer.indexOf('\n');
        while (index !== -1) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          if (line) {
            try {
              onEvent(JSON.parse(line));
            } catch {
              /* partial line */
            }
          }
          index = buffer.indexOf('\n');
        }
      }
      const rest = buffer.trim();
      if (rest) {
        try {
          onEvent(JSON.parse(rest));
        } catch {
          /* ignore */
        }
      }
    }

    function errorOf(payload) {
      if (payload && typeof payload === 'object' && payload.error) {
        return String(payload.error);
      }
      return '';
    }

    function formatDate(value) {
      if (!value) return '';
      const date = new Date(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
          ? `${value.replace(' ', 'T')}Z`
          : value,
      );
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
      }).format(date);
    }

    function coverageTone(coverage) {
      if (!coverage) return null;
      if (coverage.level === 'full')
        return { tone: 'ok', key: 'coverage.full' };
      if (coverage.level === 'partial') {
        return { tone: 'warn', key: 'coverage.partial' };
      }
      return { tone: 'bad', key: 'coverage.failed' };
    }

    function inline(text, keyPrefix) {
      const nodes = [];
      const regex =
        /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
      let last = 0;
      let match;
      let index = 0;
      while ((match = regex.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index));
        if (match[1] !== undefined) {
          nodes.push(h('strong', { key: `${keyPrefix}-b${index}` }, match[1]));
          index += 1;
        } else if (match[2] !== undefined) {
          nodes.push(h('code', { key: `${keyPrefix}-c${index}` }, match[2]));
          index += 1;
        } else if (match[3] !== undefined) {
          nodes.push(
            h(
              'a',
              {
                key: `${keyPrefix}-a${index}`,
                href: match[4],
                target: '_blank',
                rel: 'noreferrer',
              },
              match[3],
            ),
          );
          index += 1;
        }
        last = match.index + match[0].length;
      }
      if (last < text.length) nodes.push(text.slice(last));
      return nodes;
    }

    function Markdown({ text }) {
      const blocks = useMemo(() => {
        const lines = String(text ?? '')
          .replace(/\r\n/g, '\n')
          .split('\n');
        const out = [];
        let list = null;
        let listTag = 'ul';
        let code = null;
        let quote = null;

        const flushList = () => {
          if (list) {
            out.push(h(listTag, { key: `l-${out.length}` }, list));
            list = null;
          }
        };
        const flushCode = () => {
          if (code) {
            out.push(
              h(
                'pre',
                { key: `p-${out.length}` },
                h('code', null, code.join('\n')),
              ),
            );
            code = null;
          }
        };
        const flushQuote = () => {
          if (quote) {
            out.push(
              h(
                'blockquote',
                { key: `q-${out.length}` },
                inline(quote.join(' '), `q-${out.length}`),
              ),
            );
            quote = null;
          }
        };

        for (const line of lines) {
          if (line.startsWith('```')) {
            if (code) flushCode();
            else {
              flushList();
              flushQuote();
              code = [];
            }
            continue;
          }
          if (code) {
            code.push(line);
            continue;
          }
          if (/^\s*>/.test(line)) {
            flushList();
            if (!quote) quote = [];
            quote.push(line.replace(/^\s*>\s?/, ''));
            continue;
          }
          flushQuote();
          if (!line.trim()) {
            flushList();
            continue;
          }
          if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
            flushList();
            out.push(h('hr', { key: `hr-${out.length}` }));
            continue;
          }
          const heading = line.match(/^(#{1,4})\s+(.*)$/);
          if (heading) {
            flushList();
            const level = Math.min(4, heading[1].length + 1);
            out.push(
              h(
                `h${level}`,
                { key: `h-${out.length}` },
                inline(heading[2], `h-${out.length}`),
              ),
            );
            continue;
          }
          const bullet = line.match(/^\s*[-*]\s+(.*)$/);
          if (bullet) {
            if (!list) {
              list = [];
              listTag = 'ul';
            }
            list.push(
              h(
                'li',
                { key: `i-${out.length}-${list.length}` },
                inline(bullet[1], `i-${out.length}-${list.length}`),
              ),
            );
            continue;
          }
          const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
          if (ordered) {
            if (!list) {
              list = [];
              listTag = 'ol';
            }
            list.push(
              h(
                'li',
                { key: `i-${out.length}-${list.length}` },
                inline(ordered[1], `i-${out.length}-${list.length}`),
              ),
            );
            continue;
          }
          flushList();
          out.push(
            h('p', { key: `p-${out.length}` }, inline(line, `p-${out.length}`)),
          );
        }
        flushList();
        flushCode();
        flushQuote();
        return out;
      }, [text]);

      return h('div', { className: 'dsh-bu-md' }, blocks);
    }

    function useElapsed(active) {
      const [seconds, setSeconds] = useState(0);
      const start = useRef(0);
      useEffect(() => {
        if (!active) {
          setSeconds(0);
          return undefined;
        }
        start.current = Date.now();
        setSeconds(0);
        const timer = setInterval(
          () => setSeconds(Math.round((Date.now() - start.current) / 1000)),
          1000,
        );
        return () => clearInterval(timer);
      }, [active]);
      return seconds;
    }

    /* -------------------------------------------------------------- */
    /* Page                                                            */
    /* -------------------------------------------------------------- */

    function BureauPage({ t }) {
      const [health, setHealth] = useState(null);
      const [pieces, setPieces] = useState([]);
      const [loaded, setLoaded] = useState(false);
      const [slug, setSlug] = useState('');
      const [detail, setDetail] = useState(null);
      const [tab, setTab] = useState('chat');
      const [artifact, setArtifact] = useState({
        name: '',
        text: null,
        loading: false,
      });
      const [reloadKey, setReloadKey] = useState(0);
      const [error, setError] = useState('');
      const [busy, setBusy] = useState(false);
      const [busySlug, setBusySlug] = useState('');
      const [activity, setActivity] = useState('');
      const [draft, setDraft] = useState('');
      const [streamText, setStreamText] = useState('');
      const [creating, setCreating] = useState(false);
      const [inbox, setInbox] = useState(null);
      const [inboxQuery, setInboxQuery] = useState('');
      const [picked, setPicked] = useState([]);
      const [newTitle, setNewTitle] = useState('');
      const [newIntent, setNewIntent] = useState('');
      const [saving, setSaving] = useState(false);
      const [copied, setCopied] = useState(false);
      const [flash, setFlash] = useState('');

      const elapsed = useElapsed(busy);
      const bottomRef = useRef(null);
      const mounted = useRef(true);
      const abortRef = useRef(null);
      const runningRef = useRef(false);
      const slugRef = useRef(slug);
      slugRef.current = slug;

      useEffect(() => {
        mounted.current = true;
        return () => {
          mounted.current = false;
        };
      }, []);

      useEffect(() => {
        if (!flash) return undefined;
        const timer = setTimeout(() => setFlash(''), 3200);
        return () => clearTimeout(timer);
      }, [flash]);

      async function loadHealth() {
        try {
          const response = await api('/health');
          const payload = await response.json();
          if (mounted.current) setHealth(payload);
        } catch {
          if (mounted.current) setHealth({ ok: false, offline: true });
        }
      }

      async function loadPieces() {
        try {
          const response = await api('/pieces');
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(
              errorOf(payload) || 'Chargement des pièces impossible.',
            );
          }
          const list = payload.pieces ?? [];
          if (mounted.current) setPieces(list);
          return list;
        } catch (cause) {
          if (mounted.current) setError(String(cause.message ?? cause));
          return [];
        }
      }

      async function loadDetail(target) {
        if (!target) return null;
        try {
          const response = await api(`/pieces/${target}`);
          const payload = await response.json();
          if (!response.ok) {
            if (response.status === 404) {
              if (mounted.current && slugRef.current === target)
                setDetail(null);
              return null;
            }
            throw new Error(
              errorOf(payload) || 'Chargement de la pièce impossible.',
            );
          }
          if (mounted.current && slugRef.current === target) setDetail(payload);
          return payload;
        } catch (cause) {
          if (mounted.current) setError(String(cause.message ?? cause));
          return null;
        }
      }

      async function loadInbox() {
        try {
          const response = await api('/inbox');
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(
              errorOf(payload) || 'Chargement des captures impossible.',
            );
          }
          if (mounted.current) setInbox(payload.articles ?? []);
        } catch (cause) {
          if (mounted.current) {
            setInbox([]);
            setError(String(cause.message ?? cause));
          }
        }
      }

      useEffect(() => {
        (async () => {
          await loadHealth();
          const list = await loadPieces();
          if (!mounted.current) return;
          setLoaded(true);
          if (list.length) {
            setSlug(list[0].slug);
          } else {
            setCreating(true);
            await loadInbox();
          }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useEffect(() => {
        if (!slug) return;
        loadDetail(slug);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [slug]);

      useEffect(() => {
        if (!slug) return;
        if (tab !== 'research' && tab !== 'draft') return undefined;
        const present = Boolean(detail?.artifacts?.[tab]);
        if (!present) {
          setArtifact({ name: tab, text: null, loading: false });
          return undefined;
        }
        let cancelled = false;
        setArtifact({ name: tab, text: null, loading: true });
        (async () => {
          try {
            const response = await api(`/pieces/${slug}/artifact?name=${tab}`);
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(errorOf(payload) || 'Lecture impossible.');
            }
            if (!cancelled) {
              setArtifact({
                name: tab,
                text: payload.text ?? '',
                loading: false,
              });
            }
          } catch (cause) {
            if (!cancelled) {
              setArtifact({ name: tab, text: '', loading: false });
              setError(String(cause.message ?? cause));
            }
          }
        })();
        return () => {
          cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [slug, tab, reloadKey, detail?.piece?.updated_at]);

      useEffect(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ block: 'nearest' });
        }
      }, [detail?.messages?.length, streamText]);

      const messages = detail?.messages ?? [];
      const contextMessage = messages.find(
        (message) => message.role === 'context',
      );
      const visible = messages.filter((message) => message.role !== 'context');
      const lastVisible = visible[visible.length - 1];
      const lastError = lastVisible?.error ? lastVisible : null;
      let retryText = '';
      if (lastError) {
        for (let index = visible.length - 2; index >= 0; index -= 1) {
          if (visible[index].role === 'user') {
            retryText = visible[index].text;
            break;
          }
        }
      }

      function openPiece(next) {
        setCreating(false);
        setError('');
        setTab('chat');
        setStreamText('');
        setArtifact({ name: '', text: null, loading: false });
        setSlug(next);
      }

      async function openNew() {
        setCreating(true);
        setError('');
        setPicked([]);
        setNewTitle('');
        setNewIntent('');
        setInboxQuery('');
        if (inbox === null) await loadInbox();
      }

      async function reloadDetail(target = slug) {
        const payload = await loadDetail(target);
        if (payload) {
          setPieces((current) => {
            const rest = current.filter(
              (item) => item.slug !== payload.piece.slug,
            );
            return [payload.piece, ...rest].sort((a, b) =>
              String(b.updated_at ?? '').localeCompare(
                String(a.updated_at ?? ''),
              ),
            );
          });
        }
      }

      async function sendChat(bootstrap, override) {
        const target = slug;
        if (!target || runningRef.current) return;
        const text = (typeof override === 'string' ? override : draft).trim();
        if (!bootstrap && !text) return;

        runningRef.current = true;
        setBusy(true);
        setBusySlug(target);
        setActivity('');
        setStreamText('');
        setError('');
        setFlash('');
        if (typeof override !== 'string') setDraft('');

        const controller = new AbortController();
        abortRef.current = controller;
        let cancelled = false;

        try {
          const response = await api(`/pieces/${target}/chat`, {
            method: 'POST',
            body: JSON.stringify({ text, bootstrap }),
            signal: controller.signal,
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(errorOf(payload) || 'Envoi impossible.');
          }
          await readNdjson(response, (event) => {
            if (event.type === 'delta') {
              setStreamText((current) => current + event.text);
            } else if (event.type === 'role' && event.status === 'start') {
              setActivity(event.label || event.role);
            } else if (event.type === 'tool') {
              setActivity(
                event.detail
                  ? `${event.label || event.tool} · ${event.detail}`
                  : event.label || event.tool,
              );
            } else if (event.type === 'error') {
              setError(event.message);
            } else if (event.type === 'done') {
              setStreamText('');
            }
          });
        } catch (cause) {
          if (controller.signal.aborted) {
            cancelled = true;
            setFlash(t('chat.cancelled'));
          } else {
            setError(String(cause.message ?? cause));
          }
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
          runningRef.current = false;
          if (mounted.current) {
            setBusy(false);
            setBusySlug('');
            setActivity('');
            setStreamText('');
          }
          // The host appends its own cancelled message; give it a moment.
          if (cancelled) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          if (mounted.current && slugRef.current === target) {
            await reloadDetail(target);
          }
        }
      }

      function stopChat() {
        abortRef.current?.abort();
      }

      async function createPiece(event) {
        if (event) event.preventDefault();
        if (!picked.length || saving) return;
        setSaving(true);
        setError('');
        try {
          const response = await api('/pieces', {
            method: 'POST',
            body: JSON.stringify({
              sourceIds: picked,
              title: newTitle,
              intent: newIntent,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(errorOf(payload) || 'Création impossible.');
          }
          const list = await loadPieces();
          const next = payload.piece?.slug ?? list[0]?.slug;
          setCreating(false);
          setPicked([]);
          setNewTitle('');
          setNewIntent('');
          if (next) {
            setSlug(next);
            setTab('chat');
          }
        } catch (cause) {
          setError(String(cause.message ?? cause));
        } finally {
          setSaving(false);
        }
      }

      async function deletePiece() {
        if (!slug) return;
        if (
          typeof window !== 'undefined' &&
          !window.confirm(t('piece.deleteConfirm'))
        ) {
          return;
        }
        try {
          const response = await api(`/pieces/${slug}`, { method: 'DELETE' });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(errorOf(payload) || 'Suppression impossible.');
          }
          setDetail(null);
          const list = await loadPieces();
          if (list.length) {
            setSlug(list[0].slug);
          } else {
            setSlug('');
            setCreating(true);
            await loadInbox();
          }
        } catch (cause) {
          setError(String(cause.message ?? cause));
        }
      }

      function togglePicked(id) {
        setPicked((current) =>
          current.includes(id)
            ? current.filter((value) => value !== id)
            : [...current, id],
        );
      }

      async function copyArtifact() {
        if (!artifact.text) return;
        try {
          await navigator.clipboard?.writeText(artifact.text);
          setCopied(true);
          setTimeout(() => {
            if (mounted.current) setCopied(false);
          }, 1600);
        } catch {
          /* clipboard unavailable */
        }
      }

      const filteredInbox = (inbox ?? []).filter((article) => {
        const query = inboxQuery.trim().toLowerCase();
        if (!query) return true;
        return `${article.title} ${article.site ?? ''}`
          .toLowerCase()
          .includes(query);
      });

      /* ------------------------------------------------------------ */
      /* Sidebar                                                      */
      /* ------------------------------------------------------------ */

      let agentTone = 'ok';
      let agentLabel = t('agent.ready', {
        model: health?.model || '—',
      });
      if (!health || health.offline) {
        agentTone = 'bad';
        agentLabel = t('agent.offline');
      } else if (!health.desk) {
        agentTone = 'bad';
        agentLabel = t('agent.noDesk');
      } else if (health.mode === 'fake') {
        agentTone = 'warn';
        agentLabel = t('agent.fake');
      } else if (health.roots === 0) {
        agentTone = 'warn';
        agentLabel = t('agent.noSession');
      }

      const side = h(
        'aside',
        { className: 'dsh-bu-side', 'aria-label': t('a11y.pieces') },
        h(
          'button',
          {
            type: 'button',
            className: 'dsh-bu-primary dsh-bu-block',
            onClick: openNew,
            'aria-label': t('a11y.new'),
          },
          t('new.button'),
        ),
        pieces.length
          ? h(
              'nav',
              { className: 'dsh-bu-pieces' },
              pieces.map((entry) =>
                h(
                  'button',
                  {
                    key: entry.slug,
                    type: 'button',
                    className: `dsh-bu-row${
                      entry.slug === slug && !creating
                        ? ' dsh-bu-rowActive'
                        : ''
                    }`,
                    onClick: () => openPiece(entry.slug),
                  },
                  entry.title,
                ),
              ),
            )
          : h('p', { className: 'dsh-bu-hint' }, t('pieces.empty')),
        h(
          'div',
          { className: 'dsh-bu-agent', role: 'status', 'aria-live': 'polite' },
          h('span', { className: 'dsh-bu-dot', 'data-tone': agentTone }),
          h('span', null, agentLabel),
        ),
      );

      /* ------------------------------------------------------------ */
      /* New article                                                  */
      /* ------------------------------------------------------------ */

      const newView = h(
        'div',
        { className: 'dsh-bu-wrap' },
        error
          ? h('div', { className: 'dsh-bu-error', role: 'alert' }, error)
          : null,
        h('p', { className: 'dsh-bu-eyebrow' }, t('new.eyebrow')),
        h('h1', null, t('new.title')),
        h('p', { className: 'dsh-bu-lede' }, t('new.lede')),
        inbox === null
          ? h('p', { className: 'dsh-bu-loading' }, t('new.loading'))
          : inbox.length === 0
            ? h(
                'div',
                null,
                h('h1', null, t('new.emptyTitle')),
                h('p', { className: 'dsh-bu-lede' }, t('new.emptyHint')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-primary',
                    onClick: loadInbox,
                  },
                  t('new.refresh'),
                ),
              )
            : [
                h(
                  'section',
                  { className: 'dsh-bu-step', key: 'sources' },
                  h(
                    'div',
                    { className: 'dsh-bu-stepHead' },
                    h('h2', null, t('new.step1')),
                    h(
                      'span',
                      { className: 'dsh-bu-count' },
                      t('new.count', { n: inbox.length }),
                    ),
                  ),
                  h('input', {
                    className: 'dsh-bu-filter',
                    type: 'search',
                    value: inboxQuery,
                    placeholder: t('new.filter'),
                    'aria-label': t('a11y.filter'),
                    onChange: (event) => setInboxQuery(event.target.value),
                  }),
                  h(
                    'div',
                    { className: 'dsh-bu-sources' },
                    filteredInbox.map((article) => {
                      const selected = picked.includes(article.id);
                      const coverage = coverageTone(article.coverage);
                      return h(
                        'label',
                        {
                          key: article.id,
                          className: 'dsh-bu-source',
                          'data-selected': selected ? '1' : '0',
                        },
                        h('input', {
                          type: 'checkbox',
                          checked: selected,
                          onChange: () => togglePicked(article.id),
                        }),
                        h(
                          'span',
                          { className: 'dsh-bu-sourceMain' },
                          h(
                            'span',
                            { className: 'dsh-bu-sourceSite' },
                            article.site ?? 'sans site',
                          ),
                          h(
                            'span',
                            { className: 'dsh-bu-sourceTitle' },
                            article.title,
                          ),
                          h(
                            'span',
                            { className: 'dsh-bu-sourceMeta' },
                            `${article.word_count ?? 0} mots · ${formatDate(
                              article.created_at,
                            )}`,
                            coverage
                              ? h(
                                  'span',
                                  {
                                    className: 'dsh-bu-badge',
                                    'data-tone': coverage.tone,
                                    style: { marginLeft: '6px' },
                                  },
                                  t(coverage.key),
                                )
                              : null,
                          ),
                          article.usedIn && article.usedIn.length
                            ? h(
                                'span',
                                { className: 'dsh-bu-used' },
                                t('new.used', {
                                  title: article.usedIn[0].title,
                                }),
                              )
                            : null,
                        ),
                      );
                    }),
                  ),
                ),
                h(
                  'form',
                  {
                    className: 'dsh-bu-step',
                    key: 'intent',
                    onSubmit: createPiece,
                  },
                  h(
                    'div',
                    { className: 'dsh-bu-stepHead' },
                    h('h2', null, t('new.step2')),
                  ),
                  h(
                    'div',
                    { className: 'dsh-bu-field' },
                    h('label', null, t('new.intentLabel')),
                    h('textarea', {
                      value: newIntent,
                      placeholder: t('new.intentPlaceholder'),
                      onChange: (event) => setNewIntent(event.target.value),
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dsh-bu-field' },
                    h('label', null, t('new.titleLabel')),
                    h('input', {
                      type: 'text',
                      value: newTitle,
                      placeholder: t('new.titlePlaceholder'),
                      onChange: (event) => setNewTitle(event.target.value),
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dsh-bu-newActions' },
                    h(
                      'button',
                      {
                        type: 'submit',
                        className: 'dsh-bu-primary',
                        disabled: saving || picked.length === 0,
                      },
                      t('new.submit'),
                    ),
                    h(
                      'span',
                      { className: 'dsh-bu-summary' },
                      picked.length
                        ? t('new.summaryMany', { n: picked.length })
                        : t('new.summaryNone'),
                    ),
                  ),
                ),
              ],
      );

      /* ------------------------------------------------------------ */
      /* Piece                                                        */
      /* ------------------------------------------------------------ */

      const piece = detail?.piece ?? null;
      const sources = detail?.sources ?? [];
      const sourceLine = sources.length
        ? t('piece.sources', {
            n: sources.length,
            sites: sources
              .map((source) => source.site ?? 'sans site')
              .join(' · '),
          })
        : t('piece.noSources');

      const tabs = h(
        'nav',
        {
          className: 'dsh-bu-tabs',
          role: 'tablist',
          'aria-label': 'Sections de la pièce',
        },
        [
          ['chat', t('tab.chat')],
          ['research', t('tab.research')],
          ['draft', t('tab.draft')],
        ].map(([id, label]) =>
          h(
            'button',
            {
              key: id,
              type: 'button',
              role: 'tab',
              'data-tab': id,
              'aria-selected': tab === id,
              onClick: () => {
                setTab(id);
                setError('');
              },
            },
            label,
          ),
        ),
      );

      let tabBody = null;
      if (tab === 'chat') {
        const bubbles = visible.map((message, index) => {
          const role = message.role === 'user' ? 'user' : 'assistant';
          return h(
            'div',
            {
              key: `${index}-${message.at ?? ''}`,
              className: `dsh-bu-msg ${
                role === 'user' ? 'dsh-bu-msgUser' : 'dsh-bu-msgAssistant'
              }${message.error ? ' dsh-bu-msgError' : ''}`,
            },
            h(
              'div',
              { className: 'dsh-bu-who' },
              role === 'user' ? t('chat.you') : t('chat.agent'),
            ),
            h(
              'div',
              { className: 'dsh-bu-text' },
              role === 'user'
                ? message.text
                : h(Markdown, { text: message.text }),
            ),
          );
        });

        const typingRow =
          busy && busySlug === slug
            ? h(
                'div',
                { className: 'dsh-bu-typing' },
                h('i'),
                h('i'),
                h('i'),
                h(
                  'span',
                  { 'aria-live': 'polite' },
                  `${activity || t('chat.working')} · ${elapsed} s`,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-ghost dsh-bu-stop',
                    onClick: stopChat,
                  },
                  t('chat.stop'),
                ),
              )
            : null;

        if (!messages.length) {
          tabBody = h(
            'div',
            null,
            typingRow ||
              h(
                'div',
                { className: 'dsh-bu-empty' },
                h('p', null, t('chat.startHint')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-primary',
                    onClick: () => sendChat(true),
                  },
                  t('chat.start'),
                ),
              ),
            flash
              ? h('div', { className: 'dsh-bu-flash', role: 'status' }, flash)
              : null,
            h('div', { ref: bottomRef }),
          );
        } else {
          tabBody = h(
            'div',
            null,
            contextMessage
              ? h(
                  'details',
                  { className: 'dsh-bu-context' },
                  h('summary', null, t('chat.context')),
                  h('pre', null, contextMessage.text),
                )
              : null,
            h(
              'div',
              { className: 'dsh-bu-chat' },
              bubbles,
              streamText
                ? h(
                    'div',
                    { className: 'dsh-bu-msg dsh-bu-msgAssistant' },
                    h('div', { className: 'dsh-bu-who' }, t('chat.agent')),
                    h(
                      'div',
                      { className: 'dsh-bu-text' },
                      h(Markdown, { text: streamText }),
                    ),
                  )
                : null,
              typingRow,
            ),
            flash
              ? h('div', { className: 'dsh-bu-flash', role: 'status' }, flash)
              : null,
            lastError && !busy
              ? h(
                  'div',
                  { className: 'dsh-bu-retry' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bu-small',
                      onClick: () =>
                        retryText ? sendChat(false, retryText) : sendChat(true),
                    },
                    t('chat.retry'),
                  ),
                )
              : null,
            h(
              'form',
              {
                className: 'dsh-bu-composer',
                onSubmit: (event) => {
                  event.preventDefault();
                  sendChat(false);
                },
              },
              h(
                'div',
                { className: 'dsh-bu-composerBox' },
                h('textarea', {
                  value: draft,
                  placeholder: t('chat.placeholder'),
                  'aria-label': t('a11y.message'),
                  disabled: busy,
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (
                      event.key === 'Enter' &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      sendChat(false);
                    }
                  },
                }),
                h(
                  'button',
                  {
                    type: 'submit',
                    className: 'dsh-bu-primary',
                    disabled: busy || !draft.trim(),
                  },
                  t('chat.send'),
                ),
              ),
            ),
            h('div', { ref: bottomRef }),
          );
        }
      } else {
        const label =
          tab === 'research' ? t('doc.researchLabel') : t('doc.draftLabel');
        const pathLabel =
          tab === 'research'
            ? `editorial/pieces/${slug}/research.md`
            : `src/content/blog/${slug}.mdx`;
        const emptyText =
          tab === 'research' ? t('doc.researchEmpty') : t('doc.draftEmpty');

        if (!piece) {
          tabBody = null;
        } else if (!detail?.artifacts?.[tab]) {
          tabBody = h(
            'div',
            { className: 'dsh-bu-empty' },
            h('p', null, emptyText),
          );
        } else if (artifact.loading || artifact.name !== tab) {
          tabBody = h('p', { className: 'dsh-bu-loading' }, t('doc.loading'));
        } else if (!artifact.text || !artifact.text.trim()) {
          tabBody = h(
            'div',
            { className: 'dsh-bu-empty' },
            h('p', null, t('doc.empty')),
          );
        } else {
          tabBody = h(
            'div',
            null,
            h(
              'div',
              { className: 'dsh-bu-docHead' },
              h('span', { className: 'dsh-bu-docLabel' }, label),
              h(
                'div',
                { className: 'dsh-bu-docActions' },
                h('span', { className: 'dsh-bu-path' }, pathLabel),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-small',
                    onClick: () => setReloadKey((key) => key + 1),
                    'aria-label': t('a11y.reload'),
                  },
                  t('doc.reload'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-small',
                    onClick: copyArtifact,
                    'aria-label': t('a11y.copy'),
                  },
                  copied ? t('doc.copied') : t('doc.copy'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'dsh-bu-doc' },
              h(Markdown, { text: artifact.text }),
            ),
          );
        }
      }

      const pieceView = piece
        ? h(
            'div',
            { className: 'dsh-bu-wrap' },
            h(
              'header',
              { className: 'dsh-bu-pieceHead' },
              h(
                'div',
                { className: 'dsh-bu-titleRow' },
                h('h1', null, piece.title),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bu-ghost dsh-bu-danger',
                    onClick: deletePiece,
                    disabled: busy,
                    'aria-label': t('a11y.delete'),
                  },
                  t('piece.delete'),
                ),
              ),
              h('p', { className: 'dsh-bu-sourceLine' }, sourceLine),
            ),
            tabs,
            error
              ? h('div', { className: 'dsh-bu-error', role: 'alert' }, error)
              : null,
            busy && busySlug === slug && tab !== 'chat'
              ? h(
                  'div',
                  { className: 'dsh-bu-progress' },
                  h(
                    'span',
                    { 'aria-live': 'polite' },
                    `${activity || t('chat.working')} · ${elapsed} s`,
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bu-ghost dsh-bu-stop',
                      onClick: stopChat,
                    },
                    t('chat.stop'),
                  ),
                )
              : null,
            tabBody,
          )
        : h(
            'div',
            { className: 'dsh-bu-wrap' },
            error
              ? h('div', { className: 'dsh-bu-error', role: 'alert' }, error)
              : h('p', { className: 'dsh-bu-lede' }, t('piece.choose')),
          );

      if (!loaded) {
        return h(
          'section',
          { className: 'dsh-bu-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'dsh-bu-wrap' },
            h('p', { className: 'dsh-bu-loading' }, t('new.loading')),
          ),
        );
      }

      return h(
        'section',
        { className: 'dsh-bu-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dsh-bu-app' },
          side,
          h(
            'main',
            { className: 'dsh-bu-main' },
            creating ? newView : pieceView,
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const en = ctx.locale.register(NS, 'en', EN);
          const fr = ctx.locale.register(NS, 'fr', FR);
          return () => {
            en();
            fr();
          };
        }, 'bureau: dictionaries');

        const t = ctx.locale.bind(NS);

        function Page(props) {
          return h(BureauPage, { ...props, t });
        }
        Page.displayName = 'BureauPage';

        function SidebarIcon(props) {
          return h(IconDesk, { size: props.size });
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
              order: 30,
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
