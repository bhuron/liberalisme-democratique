window.__ModuleLoader__.load({
  id: '@local/bureau',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const NS = 'bureau';
    const PANEL_ID = 'bureau';
    const API = '/api/bureau';

    const EN = {
      'panel.label': 'The desk',
      'new.button': 'New piece',
      'instructions.button': 'Instructions',
      'instructions.back': 'Back to pieces',
      'pieces.empty': 'No piece yet.',
      'piece.empty': 'Pick a piece on the left.',
      'piece.open': 'Open the discussion',
      'piece.pipeline': 'Pipeline',
      'piece.archive': 'Archive',
      'piece.archiveConfirm':
        'Move this piece to editorial/archive? The draft in src/content/blog is kept.',
      'status.new': 'new',
      'status.briefed': 'briefed',
      'status.approved': 'approved',
      'status.drafted': 'drafted',
      'status.reviewed': 'reviewed',
      'status.published': 'published',
      'stage.launch': 'Run',
      'stage.again': 'Run again',
      'stage.running': 'Running…',
      'stage.done': 'done',
      'stage.error': 'error',
      'stage.cancelled': 'stopped',
      'stage.missing': 'missing',
      'stage.stop': 'Stop',
      'stage.research': 'Research',
      'stage.brief': 'Brief',
      'stage.draft': 'Draft',
      'stage.style': 'Style review',
      'stage.package': 'Package',
      'tab.draft': 'Draft',
      'tab.research': 'Research',
      'tab.brief': 'Brief',
      'tab.relecture': 'Style review',
      'tab.package': 'Package',
      'tab.sources': 'Sources',
      'tab.checks': 'Checks',
      'doc.label': 'Document',
      'pipeline.status': 'Status',
      'pipeline.close': 'Close',
      'angle.label': 'Angle',
      'angle.empty': 'No angle recorded yet.',
      'angle.add': 'Set the angle',
      'angle.edit': 'Edit',
      'angle.save': 'Save',
      'angle.cancel': 'Cancel',
      'angle.placeholder':
        'Two or three sentences: the thesis, what you set aside, what remains to check.',
      'artifact.missing': 'This piece has no document yet.',
      'artifact.hint':
        'Open the discussion to set the angle, or use Pipeline to run a stage.',
      'source.open': 'Open the captured text',
      'source.empty': 'No frozen source.',
      'checks.run': 'Refresh',
      'checks.empty': 'No draft to measure yet.',
      'new.title': 'New piece',
      'new.lede': 'Freeze a few captures, then open a fresh discussion.',
      'new.captures': 'Captures',
      'new.intent': 'Intent',
      'new.search': 'Filter by title or site…',
      'new.titleLabel': 'Working title (optional)',
      'new.titlePlaceholder': 'The AI bubble meets its legitimacy crisis',
      'new.intentLabel': 'What you want to say (optional)',
      'new.intentPlaceholder':
        'The financial fragility I described in January now shows up politically.',
      'new.submit': 'Create the piece',
      'new.selected': '{n} selected',
      'new.used': 'already in “{title}”',
      'new.unavailable': 'Captures are unavailable.',
      'new.none': 'No capture. You can add sources later.',
      'coverage.full': 'full text',
      'coverage.partial': 'partial',
      'coverage.failed': 'failed',
      'instructions.title': 'The desk instructions',
      'instructions.lede':
        'Read live from editorial/agent and editorial/style.',
      'common.refresh': 'Refresh',
      'common.close': 'Close',
      'common.loading': 'Loading…',
      'common.retry': 'Retry',
      'common.cancel': 'Cancel',
      'common.words': 'words',
      'common.back': 'Back',
    };

    const FR = {
      'panel.label': 'Le bureau',
      'new.button': 'Nouvelle pièce',
      'instructions.button': 'Instructions',
      'instructions.back': 'Retour aux pièces',
      'pieces.empty': 'Aucune pièce.',
      'piece.empty': 'Choisissez une pièce à gauche.',
      'piece.open': 'Ouvrir la discussion',
      'piece.pipeline': 'Pipeline',
      'piece.archive': 'Archiver',
      'piece.archiveConfirm':
        'Déplacer cette pièce dans editorial/archive ? Le brouillon dans src/content/blog est conservé.',
      'status.new': 'nouvelle',
      'status.briefed': 'briefée',
      'status.approved': 'angle validé',
      'status.drafted': 'rédigée',
      'status.reviewed': 'relue',
      'status.published': 'publiée',
      'stage.launch': 'Lancer',
      'stage.again': 'Relancer',
      'stage.running': 'En cours…',
      'stage.done': 'fait',
      'stage.error': 'erreur',
      'stage.cancelled': 'arrêtée',
      'stage.missing': 'manque',
      'stage.stop': 'Arrêter',
      'stage.research': 'Recherche',
      'stage.brief': 'Brief',
      'stage.draft': 'Brouillon',
      'stage.style': 'Relecture',
      'stage.package': 'Paquet',
      'tab.draft': 'Brouillon',
      'tab.research': 'Recherche',
      'tab.brief': 'Brief',
      'tab.relecture': 'Relecture',
      'tab.package': 'Paquet',
      'tab.sources': 'Sources',
      'tab.checks': 'Mesures',
      'doc.label': 'Document',
      'pipeline.status': 'Statut',
      'pipeline.close': 'Fermer',
      'angle.label': 'Angle',
      'angle.empty': 'Aucun angle consigné.',
      'angle.add': "Définir l'angle",
      'angle.edit': 'Modifier',
      'angle.save': 'Enregistrer',
      'angle.cancel': 'Annuler',
      'angle.placeholder':
        "Deux ou trois phrases : ce que la pièce veut dire, ce qu'on écarte, ce qui reste à vérifier.",
      'artifact.missing': "Cette pièce n'a pas encore de document.",
      'artifact.hint':
        "Ouvrez la discussion pour définir l'angle, ou utilisez Pipeline pour lancer une étape.",
      'source.open': 'Ouvrir le texte capturé',
      'source.empty': 'Aucune source figée.',
      'checks.run': 'Recharger',
      'checks.empty': 'Aucun brouillon à mesurer.',
      'new.title': 'Nouvelle pièce',
      'new.lede': 'Figez quelques captures, puis ouvrez une discussion neuve.',
      'new.captures': 'Captures',
      'new.intent': 'Intention',
      'new.search': 'Filtrer par titre ou site…',
      'new.titleLabel': 'Titre de travail (facultatif)',
      'new.titlePlaceholder': 'La bulle IA rencontre sa crise de légitimité',
      'new.intentLabel': 'Ce que vous voulez dire (facultatif)',
      'new.intentPlaceholder':
        'La fragilité financière de janvier devient politique.',
      'new.submit': 'Créer la pièce',
      'new.selected': '{n} sélectionnée(s)',
      'new.used': 'déjà dans « {title} »',
      'new.unavailable': 'Captures indisponibles.',
      'new.none': 'Aucune capture. Vous pourrez ajouter des sources plus tard.',
      'coverage.full': 'texte intégral',
      'coverage.partial': 'partiel',
      'coverage.failed': 'échoué',
      'instructions.title': 'Les instructions du bureau',
      'instructions.lede':
        'Lues en direct depuis editorial/agent et editorial/style.',
      'common.refresh': 'Recharger',
      'common.close': 'Fermer',
      'common.loading': 'Chargement…',
      'common.retry': 'Réessayer',
      'common.cancel': 'Annuler',
      'common.words': 'mots',
      'common.back': 'Retour',
    };

    function formatDate(value) {
      if (!value) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
    }

    async function api(path, options = {}) {
      const init = { ...options, headers: { ...(options.headers ?? {}) } };
      if (options.body !== undefined) {
        init.headers['content-type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }
      const response = await fetch(`${API}${path}`, init);
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text };
      }
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    }

    function useApi(path, deps = []) {
      const [state, setState] = useState({
        loading: Boolean(path),
        data: null,
        error: null,
      });
      const load = useCallback(() => {
        if (!path) {
          setState({ loading: false, data: null, error: null });
          return undefined;
        }
        let cancelled = false;
        setState((current) => ({ ...current, loading: true, error: null }));
        api(path)
          .then((data) => {
            if (!cancelled) setState({ loading: false, data, error: null });
          })
          .catch((error) => {
            if (!cancelled) {
              setState({ loading: false, data: null, error: error.message });
            }
          });
        return () => {
          cancelled = true;
        };
      }, [path, ...deps]);
      useEffect(() => load(), [load]);
      return [state, load];
    }

    /* ------------------------------------------------------------------ */
    /* Markdown                                                            */
    /* ------------------------------------------------------------------ */

    const INLINE_PATTERN =
      /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)\s]+\))/g;

    function inline(text, keyPrefix = 'i') {
      const value = String(text ?? '');
      const parts = [];
      let last = 0;
      let index = 0;
      for (const match of value.matchAll(INLINE_PATTERN)) {
        const start = match.index ?? 0;
        if (start > last) parts.push(value.slice(last, start));
        const token = match[0];
        const key = `${keyPrefix}-${index++}`;
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(h('strong', { key }, token.slice(2, -2)));
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(h('code', { key }, token.slice(1, -1)));
        } else if (token.startsWith('[')) {
          const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
          if (link) {
            parts.push(
              h(
                'a',
                {
                  key,
                  href: link[2],
                  target: '_blank',
                  rel: 'noreferrer noopener',
                },
                link[1],
              ),
            );
          } else {
            parts.push(token);
          }
        } else if (token.startsWith('*') && token.endsWith('*')) {
          parts.push(h('em', { key }, token.slice(1, -1)));
        } else {
          parts.push(token);
        }
        last = start + token.length;
      }
      if (last < value.length) parts.push(value.slice(last));
      return parts.length ? parts : value;
    }

    function splitRow(line) {
      return line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map((cell) => cell.trim());
    }

    function isTableSeparator(line) {
      return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
    }

    const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;

    function collectItem(lines, start, marker) {
      let text = lines[start].replace(marker, '');
      let index = start + 1;
      while (index < lines.length) {
        const next = lines[index];
        if (!next.trim()) break;
        if (LIST_MARKER.test(next)) break;
        if (
          /^#{1,4}\s+/.test(next) ||
          /^```/.test(next.trim()) ||
          /^\s*\|/.test(next) ||
          /^\s*>\s?/.test(next)
        ) {
          break;
        }
        text += ` ${next.trim()}`;
        index += 1;
      }
      return { text, index };
    }

    function markdown(text) {
      const source = String(text ?? '').replace(
        /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
        '',
      );
      const lines = source.replace(/\r\n/g, '\n').split('\n');
      const blocks = [];
      let index = 0;

      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          continue;
        }

        if (/^```/.test(line.trim())) {
          const language = line.trim().slice(3).trim();
          const code = [];
          index += 1;
          while (index < lines.length && !/^```/.test(lines[index].trim())) {
            code.push(lines[index]);
            index += 1;
          }
          index += 1;
          blocks.push(
            h(
              'pre',
              { key: `code-${blocks.length}`, className: 'bureau-code' },
              h(
                'code',
                language ? { 'data-language': language } : null,
                code.join('\n'),
              ),
            ),
          );
          continue;
        }

        const heading = /^(#{1,4})\s+(.+)$/.exec(line);
        if (heading) {
          const level = Math.min(heading[1].length, 4);
          blocks.push(
            h(
              `h${level}`,
              { key: `h-${blocks.length}` },
              inline(heading[2], `h-${blocks.length}`),
            ),
          );
          index += 1;
          continue;
        }

        if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
          blocks.push(h('hr', { key: `hr-${blocks.length}` }));
          index += 1;
          continue;
        }

        if (
          /^\s*\|/.test(line) &&
          index + 1 < lines.length &&
          isTableSeparator(lines[index + 1])
        ) {
          const header = splitRow(line);
          index += 2;
          const rows = [];
          while (index < lines.length && /^\s*\|/.test(lines[index])) {
            rows.push(splitRow(lines[index]));
            index += 1;
          }
          blocks.push(
            h(
              'div',
              {
                key: `table-${blocks.length}`,
                className: 'bureau-table-wrap',
              },
              h(
                'table',
                { className: 'bureau-table' },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    header.map((cell, cellIndex) =>
                      h(
                        'th',
                        { key: cellIndex },
                        inline(cell, `th-${cellIndex}`),
                      ),
                    ),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  rows.map((row, rowIndex) =>
                    h(
                      'tr',
                      { key: rowIndex },
                      header.map((_, cellIndex) =>
                        h(
                          'td',
                          { key: cellIndex },
                          inline(
                            row[cellIndex] ?? '',
                            `td-${rowIndex}-${cellIndex}`,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          continue;
        }

        if (/^\s*>\s?/.test(line)) {
          const quote = [];
          while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
            quote.push(lines[index].replace(/^\s*>\s?/, ''));
            index += 1;
          }
          blocks.push(
            h(
              'blockquote',
              { key: `quote-${blocks.length}` },
              inline(quote.join(' '), `quote-${blocks.length}`),
            ),
          );
          continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
          const items = [];
          while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
            const item = collectItem(lines, index, /^\s*[-*+]\s+/);
            items.push(item.text);
            index = item.index;
          }
          blocks.push(
            h(
              'ul',
              { key: `ul-${blocks.length}` },
              items.map((item, itemIndex) =>
                h(
                  'li',
                  { key: itemIndex },
                  inline(item, `ul-${blocks.length}-${itemIndex}`),
                ),
              ),
            ),
          );
          continue;
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = [];
          while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
            const item = collectItem(lines, index, /^\s*\d+[.)]\s+/);
            items.push(item.text);
            index = item.index;
          }
          blocks.push(
            h(
              'ol',
              { key: `ol-${blocks.length}` },
              items.map((item, itemIndex) =>
                h(
                  'li',
                  { key: itemIndex },
                  inline(item, `ol-${blocks.length}-${itemIndex}`),
                ),
              ),
            ),
          );
          continue;
        }

        const paragraph = [];
        while (
          index < lines.length &&
          lines[index].trim() &&
          !/^(#{1,4})\s+/.test(lines[index]) &&
          !/^```/.test(lines[index].trim()) &&
          !/^\s*\|/.test(lines[index]) &&
          !/^\s*>\s?/.test(lines[index]) &&
          !/^\s*[-*+]\s+/.test(lines[index]) &&
          !/^\s*\d+[.)]\s+/.test(lines[index])
        ) {
          paragraph.push(lines[index]);
          index += 1;
        }
        blocks.push(
          h(
            'p',
            { key: `p-${blocks.length}` },
            inline(paragraph.join(' '), `p-${blocks.length}`),
          ),
        );
      }

      return h('div', { className: 'bureau-prose' }, blocks);
    }

    /* ------------------------------------------------------------------ */
    /* Small pieces                                                        */
    /* ------------------------------------------------------------------ */

    function Spinner() {
      return h('span', { className: 'bureau-spinner', 'aria-hidden': true });
    }

    function ErrorLine({ error, onRetry, t }) {
      if (!error) return null;
      return h(
        'div',
        { className: 'bureau-error', role: 'alert' },
        h('span', null, error),
        onRetry
          ? h(
              'button',
              {
                type: 'button',
                className: 'bureau-textbutton',
                onClick: onRetry,
              },
              t('common.retry'),
            )
          : null,
      );
    }

    function Empty({ title, hint }) {
      return h(
        'div',
        { className: 'bureau-empty' },
        h('strong', null, title),
        hint ? h('span', null, hint) : null,
      );
    }

    function Coverage({ coverage, t }) {
      if (!coverage) return null;
      const tone =
        coverage.level === 'full'
          ? 'ok'
          : coverage.level === 'partial'
            ? 'warn'
            : 'bad';
      return h(
        'span',
        { className: `bureau-coverage bureau-coverage-${tone}` },
        t(`coverage.${coverage.level}`),
      );
    }

    function Modal({ title, children, onClose, wide }) {
      useEffect(() => {
        function onKey(event) {
          if (event.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);

      return h(
        'div',
        {
          className: 'bureau-overlay',
          role: 'presentation',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose();
          },
        },
        h(
          'div',
          {
            className: `bureau-dialog${wide ? ' bureau-dialog-wide' : ''}`,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': title,
          },
          h(
            'header',
            { className: 'bureau-dialog-header' },
            h('h2', null, title),
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-close',
                onClick: onClose,
                'aria-label': 'Fermer',
              },
              '×',
            ),
          ),
          h('div', { className: 'bureau-dialog-body' }, children),
        ),
      );
    }

    function IconDesk({ size = 16 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          className: 'bureau-panel-icon',
        },
        h('rect', {
          x: 4.5,
          y: 3.5,
          width: 15,
          height: 17,
          rx: 2,
          stroke: 'currentColor',
          strokeWidth: 1.6,
        }),
        h('path', {
          d: 'M8 8h8M8 11h8M8 14h5',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M8 17.5h3.5',
          stroke: '#c4553d',
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Instructions                                                        */
    /* ------------------------------------------------------------------ */

    function InstructionsPanel({ t }) {
      const [listState, reloadList] = useApi('/instructions');
      const [activeId, setActiveId] = useState(null);
      const [docState, reloadDoc] = useApi(
        activeId ? `/instructions/${encodeURIComponent(activeId)}` : null,
        [activeId],
      );

      const docs = listState.data?.instructions ?? [];
      const groups = useMemo(() => {
        const map = new Map();
        for (const doc of docs) {
          if (!map.has(doc.group)) map.set(doc.group, []);
          map.get(doc.group).push(doc);
        }
        return [...map.entries()];
      }, [docs]);

      useEffect(() => {
        if (!activeId && docs.length) setActiveId(docs[0].id);
      }, [docs, activeId]);

      return h(
        'div',
        { className: 'bureau-instructions' },
        h(
          'aside',
          { className: 'bureau-instructions-list' },
          h(
            'div',
            { className: 'bureau-instructions-head' },
            h('h2', null, t('instructions.title')),
          ),
          h('p', { className: 'bureau-muted' }, t('instructions.lede')),
          listState.loading ? h(Spinner) : null,
          h(ErrorLine, { error: listState.error, onRetry: reloadList, t }),
          groups.map(([group, entries]) =>
            h(
              'div',
              { key: group, className: 'bureau-instruction-group' },
              h('p', { className: 'bureau-group-label' }, group),
              entries.map((doc) =>
                h(
                  'button',
                  {
                    key: doc.id,
                    type: 'button',
                    className: `bureau-instruction-link${doc.id === activeId ? ' is-active' : ''}`,
                    onClick: () => setActiveId(doc.id),
                  },
                  doc.title,
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'bureau-instructions-doc' },
          activeId && docState.data
            ? h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'bureau-doc-header' },
                  h('h2', null, docState.data.title),
                  h('span', { className: 'bureau-muted' }, docState.data.path),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'bureau-textbutton',
                      onClick: reloadDoc,
                    },
                    t('common.refresh'),
                  ),
                ),
                markdown(docState.data.text),
              )
            : docState.loading
              ? h(Spinner)
              : null,
          h(ErrorLine, { error: docState.error, onRetry: reloadDoc, t }),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* New piece                                                           */
    /* ------------------------------------------------------------------ */

    function NewPieceDialog({ t, onClose, onCreated }) {
      const [inboxState, reloadInbox] = useApi('/inbox?limit=80');
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(() => new Set());
      const [title, setTitle] = useState('');
      const [intent, setIntent] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);

      const articles = inboxState.data?.articles ?? [];
      const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return articles;
        return articles.filter((article) =>
          `${article.title} ${article.site ?? ''}`
            .toLowerCase()
            .includes(needle),
        );
      }, [articles, query]);

      function toggle(id) {
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }

      async function submit() {
        if (!title.trim() && !intent.trim()) {
          setError('Indiquez un titre ou une intention.');
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const result = await api('/pieces', {
            method: 'POST',
            body: {
              title: title.trim(),
              intent: intent.trim(),
              sourceIds: [...selected],
            },
          });
          onCreated(result.piece.slug);
        } catch (submitError) {
          setError(submitError.message);
        } finally {
          setBusy(false);
        }
      }

      return h(
        Modal,
        { title: t('new.title'), onClose, wide: true },
        h('p', { className: 'bureau-muted bureau-lede' }, t('new.lede')),
        h(
          'div',
          { className: 'bureau-new-grid' },
          h(
            'section',
            null,
            h(
              'div',
              { className: 'bureau-section-head' },
              h('h3', null, t('new.captures')),
              h(
                'span',
                { className: 'bureau-muted' },
                t('new.selected', { n: selected.size }),
              ),
            ),
            h('input', {
              className: 'bureau-input',
              type: 'search',
              value: query,
              placeholder: t('new.search'),
              onChange: (event) => setQuery(event.target.value),
            }),
            inboxState.loading ? h(Spinner) : null,
            inboxState.error
              ? h(ErrorLine, {
                  error: inboxState.error,
                  onRetry: reloadInbox,
                  t,
                })
              : null,
            inboxState.data && !inboxState.data.available
              ? h(
                  'div',
                  { className: 'bureau-note' },
                  h('p', null, t('new.unavailable')),
                  h('p', { className: 'bureau-muted' }, inboxState.data.error),
                )
              : null,
            inboxState.data?.available
              ? h(
                  'div',
                  { className: 'bureau-source-list' },
                  articles.length === 0
                    ? h(Empty, { title: t('new.none') })
                    : filtered.map((article) =>
                        h(
                          'label',
                          {
                            key: article.id,
                            className: `bureau-source-row${selected.has(article.id) ? ' is-selected' : ''}`,
                          },
                          h('input', {
                            type: 'checkbox',
                            checked: selected.has(article.id),
                            onChange: () => toggle(article.id),
                          }),
                          h(
                            'span',
                            { className: 'bureau-source-main' },
                            h(
                              'span',
                              { className: 'bureau-source-title' },
                              article.title,
                            ),
                            h(
                              'span',
                              { className: 'bureau-source-meta' },
                              `${article.site ?? 'sans site'} · ${formatDate(article.captured_at)} · ${article.word_count ?? '?'} ${t('common.words')}`,
                            ),
                            article.used_by?.length
                              ? h(
                                  'span',
                                  { className: 'bureau-source-used' },
                                  t('new.used', {
                                    title: article.used_by[0].title,
                                  }),
                                )
                              : null,
                          ),
                          h(Coverage, { coverage: article.coverage, t }),
                        ),
                      ),
                )
              : null,
          ),
          h(
            'section',
            null,
            h(
              'div',
              { className: 'bureau-section-head' },
              h('h3', null, t('new.intent')),
            ),
            h('label', { className: 'bureau-field' }, t('new.titleLabel')),
            h('input', {
              className: 'bureau-input',
              value: title,
              placeholder: t('new.titlePlaceholder'),
              onChange: (event) => setTitle(event.target.value),
            }),
            h('label', { className: 'bureau-field' }, t('new.intentLabel')),
            h('textarea', {
              className: 'bureau-textarea',
              rows: 6,
              value: intent,
              placeholder: t('new.intentPlaceholder'),
              onChange: (event) => setIntent(event.target.value),
            }),
          ),
        ),
        error
          ? h('p', { className: 'bureau-error', role: 'alert' }, error)
          : null,
        h(
          'footer',
          { className: 'bureau-dialog-footer' },
          h(
            'button',
            {
              type: 'button',
              className: 'bureau-textbutton',
              onClick: onClose,
            },
            t('common.cancel'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'bureau-primary',
              onClick: submit,
              disabled: busy,
            },
            busy ? h(Spinner) : null,
            t('new.submit'),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Source reader                                                       */
    /* ------------------------------------------------------------------ */

    function SourceReader({ id, t, onClose }) {
      const [state, reload] = useApi(`/sources/${encodeURIComponent(id)}`);
      const source = state.data;
      return h(
        Modal,
        { title: source?.title ?? t('source.open'), onClose, wide: true },
        state.loading ? h(Spinner) : null,
        h(ErrorLine, { error: state.error, onRetry: reload, t }),
        source
          ? h(
              React.Fragment,
              null,
              h(
                'p',
                { className: 'bureau-muted' },
                `${source.site ?? ''} · ${source.author ?? ''} · ${source.word_count ?? '?'} ${t('common.words')} · ${formatDate(source.captured_at)}`,
              ),
              h(
                'div',
                { className: 'bureau-source-links' },
                source.url
                  ? h(
                      'a',
                      {
                        href: source.url,
                        target: '_blank',
                        rel: 'noreferrer noopener',
                      },
                      source.url,
                    )
                  : null,
                h(Coverage, { coverage: source.coverage, t }),
              ),
              h('pre', { className: 'bureau-source-text' }, source.text),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Checks                                                              */
    /* ------------------------------------------------------------------ */

    function ChecksPanel({ slug, t }) {
      const [state, reload] = useApi(
        `/pieces/${encodeURIComponent(slug)}/checks`,
      );
      if (state.loading) return h(Spinner);
      if (state.error) {
        return h(ErrorLine, { error: state.error, onRetry: reload, t });
      }
      const data = state.data;
      if (!data) return h(Empty, { title: t('checks.empty') });

      return h(
        'div',
        { className: 'bureau-checks' },
        h(
          'p',
          { className: 'bureau-muted' },
          `${data.summary.words} mots · ${data.summary.errors} erreur(s) · ${data.summary.warnings} avertissement(s) · ${data.summary.overBudget} budget(s) dépassé(s)`,
        ),
        h('h3', null, 'Style'),
        h(
          'ul',
          { className: 'bureau-check-list' },
          data.style.metrics.map((metric) =>
            h(
              'li',
              { key: metric.id, className: metric.over ? 'is-over' : '' },
              h('span', null, metric.label),
              h(
                'span',
                { className: 'bureau-check-value' },
                `${metric.count}${metric.over ? ' · dépassé' : ''}`,
              ),
            ),
          ),
        ),
        h(
          'p',
          { className: 'bureau-muted' },
          `Phrase médiane ${data.style.structure.sentenceMedian} mots · paragraphe médian ${data.style.structure.paragraphMedian} · attaque ${data.style.structure.leadWords} mots · ${data.style.structure.headings} intertitre(s).`,
        ),
        h('h3', null, 'Typographie'),
        data.lint.findings.length === 0
          ? h('p', { className: 'bureau-muted' }, 'Aucun défaut.')
          : h(
              'ul',
              { className: 'bureau-check-list' },
              data.lint.findings.slice(0, 80).map((finding, index) =>
                h(
                  'li',
                  {
                    key: index,
                    className: finding.severity === 'error' ? 'is-over' : '',
                  },
                  h('span', null, `ligne ${finding.line} · ${finding.message}`),
                  h(
                    'span',
                    { className: 'bureau-check-value bureau-muted' },
                    finding.excerpt,
                  ),
                ),
              ),
            ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Piece                                                               */
    /* ------------------------------------------------------------------ */

    const STATUSES = [
      'new',
      'briefed',
      'approved',
      'drafted',
      'reviewed',
      'published',
    ];

    const DOCUMENTS = [
      { id: 'draft', key: 'tab.draft', name: 'draft' },
      { id: 'research', key: 'tab.research', name: 'research' },
      { id: 'brief', key: 'tab.brief', name: 'brief' },
      { id: 'relecture', key: 'tab.relecture', name: 'relecture' },
      { id: 'package', key: 'tab.package', name: 'package' },
      { id: 'angle', key: 'angle.label', name: 'angle' },
      { id: 'sources', key: 'tab.sources' },
      { id: 'checks', key: 'tab.checks' },
    ];

    function firstView(detail) {
      if (!detail) return 'draft';
      const order = ['draft', 'research', 'brief', 'relecture', 'package'];
      return (
        order.find((name) =>
          detail.artifacts?.some(
            (entry) => entry.name === name && entry.exists,
          ),
        ) ?? 'draft'
      );
    }

    function PieceView({ slug, t, uiWorkspace, onArchive }) {
      const [detailState, reloadDetail] = useApi(
        `/pieces/${encodeURIComponent(slug)}`,
      );
      const [view, setView] = useState('draft');
      const [pipelineOpen, setPipelineOpen] = useState(false);
      const [sourceId, setSourceId] = useState(null);
      const [run, setRun] = useState(null);
      const [runError, setRunError] = useState(null);
      const [busy, setBusy] = useState(false);
      const [angleEditing, setAngleEditing] = useState(false);
      const [angleDraft, setAngleDraft] = useState('');
      const [checksVersion, setChecksVersion] = useState(0);
      const initializedFor = useRef(null);

      const detail = detailState.data;
      const piece = detail?.piece;
      const document = DOCUMENTS.find((entry) => entry.id === view);
      const artifactPath =
        document?.name && document.id !== 'angle'
          ? `/pieces/${encodeURIComponent(slug)}/artifact?name=${encodeURIComponent(document.name)}`
          : null;
      const [artifactState, reloadArtifact] = useApi(artifactPath, [
        slug,
        view,
      ]);
      const [angleState, reloadAngle] = useApi(
        `/pieces/${encodeURIComponent(slug)}/artifact?name=angle`,
        [slug],
      );

      useEffect(() => {
        if (!detail || initializedFor.current === slug) return;
        initializedFor.current = slug;
        setView(firstView(detail));
      }, [detail, slug]);

      useEffect(() => {
        if (detail?.run && detail.run.status === 'running' && !run) {
          setRun(detail.run);
        }
      }, [detail, run]);

      useEffect(() => {
        if (run?.status === 'running') {
          let cancelled = false;
          const timer = setTimeout(async () => {
            try {
              const next = await api(`/runs/${encodeURIComponent(run.id)}`);
              if (!cancelled) setRun(next);
            } catch (error) {
              if (!cancelled) setRunError(error.message);
            }
          }, 1200);
          return () => {
            cancelled = true;
            clearTimeout(timer);
          };
        }
        if (
          run?.status === 'done' ||
          run?.status === 'error' ||
          run?.status === 'cancelled'
        ) {
          reloadDetail();
          reloadArtifact();
          reloadAngle();
          setChecksVersion((value) => value + 1);
        }
        return undefined;
      }, [run, reloadDetail, reloadArtifact, reloadAngle]);

      useEffect(() => {
        setRun(null);
        setRunError(null);
        setAngleEditing(false);
        setPipelineOpen(false);
      }, [slug]);

      function reloadCurrent() {
        reloadDetail();
        if (view === 'checks') setChecksVersion((value) => value + 1);
        else if (view === 'angle') reloadAngle();
        else if (view !== 'sources') reloadArtifact();
      }

      async function startStage(stage) {
        setBusy(true);
        setRunError(null);
        try {
          const started = await api(
            `/pieces/${encodeURIComponent(slug)}/stage`,
            { method: 'POST', body: { stage } },
          );
          setRun(started);
          setView(
            stage === 'brief'
              ? 'brief'
              : stage === 'draft'
                ? 'draft'
                : stage === 'style'
                  ? 'relecture'
                  : stage === 'package'
                    ? 'package'
                    : 'research',
          );
        } catch (error) {
          setRunError(error.message);
        } finally {
          setBusy(false);
        }
      }

      async function cancelRun(id) {
        try {
          const next = await api(`/runs/${encodeURIComponent(id)}/cancel`, {
            method: 'POST',
          });
          setRun(next);
        } catch (error) {
          setRunError(error.message);
        }
      }

      async function openSession() {
        setBusy(true);
        setRunError(null);
        try {
          const result = await api(
            `/pieces/${encodeURIComponent(slug)}/session`,
            { method: 'POST' },
          );
          if (uiWorkspace?.openSession) {
            uiWorkspace.openSession(result.sessionId);
          } else {
            setRunError(
              `Session prête : ${result.sessionId}. Ouvrez-la depuis la barre latérale.`,
            );
          }
          reloadDetail();
        } catch (error) {
          setRunError(error.message);
        } finally {
          setBusy(false);
        }
      }

      async function changeStatus(status) {
        try {
          await api(`/pieces/${encodeURIComponent(slug)}/status`, {
            method: 'POST',
            body: { status },
          });
          reloadDetail();
        } catch (error) {
          setRunError(error.message);
        }
      }

      async function archive() {
        if (!window.confirm(t('piece.archiveConfirm'))) return;
        setBusy(true);
        try {
          await api(`/pieces/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
          });
          onArchive();
        } catch (error) {
          setRunError(error.message);
        } finally {
          setBusy(false);
        }
      }

      async function saveAngle() {
        setBusy(true);
        try {
          await api(`/pieces/${encodeURIComponent(slug)}/angle`, {
            method: 'POST',
            body: { text: angleDraft },
          });
          setAngleEditing(false);
          reloadAngle();
          reloadDetail();
        } catch (error) {
          setRunError(error.message);
        } finally {
          setBusy(false);
        }
      }

      if (detailState.loading && !detail) return h(Spinner);
      if (detailState.error && !detail) {
        return h(ErrorLine, {
          error: detailState.error,
          onRetry: reloadDetail,
          t,
        });
      }
      if (!detail) return null;

      const angleExists = Boolean(angleState.data?.exists);

      return h(
        'article',
        { className: 'bureau-piece' },
        h(
          'header',
          { className: 'bureau-piece-head' },
          h(
            'div',
            { className: 'bureau-piece-title' },
            h('h2', null, piece.title),
            h(
              'div',
              { className: 'bureau-meta' },
              h('span', null, t(`status.${piece.status}`)),
              h('span', null, formatDate(piece.updated_at)),
            ),
          ),
          h(
            'div',
            { className: 'bureau-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-primary',
                onClick: openSession,
                disabled: busy,
              },
              t('piece.open'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-textbutton',
                onClick: () => setPipelineOpen((value) => !value),
                'aria-expanded': pipelineOpen,
              },
              t('piece.pipeline'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-textbutton bureau-danger',
                onClick: archive,
                disabled: busy,
              },
              t('piece.archive'),
            ),
          ),
        ),
        pipelineOpen
          ? h(
              'section',
              { className: 'bureau-pipeline' },
              h(
                'div',
                { className: 'bureau-pipeline-stages' },
                detail.stages.map((stage) =>
                  h(
                    'button',
                    {
                      key: stage.id,
                      type: 'button',
                      className: `bureau-stage${stage.done ? ' is-done' : ''}${stage.ready ? ' is-ready' : ''}`,
                      disabled:
                        busy || !stage.ready || run?.status === 'running',
                      onClick: () => startStage(stage.id),
                      title: stage.missing.length
                        ? `${t('stage.missing')} : ${stage.missing.join(', ')}`
                        : stage.done
                          ? t('stage.again')
                          : t('stage.launch'),
                    },
                    h('span', {
                      className: 'bureau-stage-dot',
                      'aria-hidden': true,
                    }),
                    t(`stage.${stage.id}`),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'bureau-pipeline-foot' },
                h('span', null, t('pipeline.status')),
                h(
                  'select',
                  {
                    className: 'bureau-status-select',
                    value: piece.status,
                    onChange: (event) => changeStatus(event.target.value),
                    disabled: busy,
                    'aria-label': t('pipeline.status'),
                  },
                  STATUSES.map((status) =>
                    h(
                      'option',
                      { key: status, value: status },
                      t(`status.${status}`),
                    ),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'bureau-textbutton',
                    onClick: () => setPipelineOpen(false),
                  },
                  t('pipeline.close'),
                ),
              ),
              run
                ? h(
                    'p',
                    {
                      className: `bureau-run bureau-run-${run.status}`,
                      role: 'status',
                    },
                    `${t(`stage.${run.stage}`)} · ${
                      run.status === 'running'
                        ? t('stage.running')
                        : run.status === 'done'
                          ? t('stage.done')
                          : run.status === 'cancelled'
                            ? t('stage.cancelled')
                            : t('stage.error')
                    }`,
                    run.status === 'running'
                      ? h(
                          'button',
                          {
                            type: 'button',
                            className: 'bureau-textbutton',
                            onClick: () => cancelRun(run.id),
                          },
                          t('stage.stop'),
                        )
                      : null,
                  )
                : null,
            )
          : null,
        runError
          ? h('p', { className: 'bureau-error', role: 'alert' }, runError)
          : null,
        h(
          'div',
          { className: 'bureau-docbar' },
          h(
            'label',
            {
              className: 'bureau-docbar-label',
              htmlFor: `bureau-doc-${slug}`,
            },
            t('doc.label'),
          ),
          h(
            'select',
            {
              id: `bureau-doc-${slug}`,
              className: 'bureau-doc-select',
              value: view,
              onChange: (event) => setView(event.target.value),
            },
            DOCUMENTS.map((entry) =>
              h('option', { key: entry.id, value: entry.id }, t(entry.key)),
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'bureau-textbutton',
              onClick: reloadCurrent,
            },
            t('common.refresh'),
          ),
        ),
        h(
          'section',
          { className: 'bureau-document' },
          view === 'sources'
            ? h(SourceList, {
                sources: detail.sources,
                t,
                onOpen: setSourceId,
              })
            : view === 'checks'
              ? h(ChecksPanel, { key: checksVersion, slug, t })
              : view === 'angle'
                ? angleState.loading && !angleState.data
                  ? h(Spinner)
                  : angleState.error
                    ? h(ErrorLine, {
                        error: angleState.error,
                        onRetry: reloadAngle,
                        t,
                      })
                    : angleEditing
                      ? h(
                          React.Fragment,
                          null,
                          h('textarea', {
                            className: 'bureau-textarea',
                            rows: 5,
                            value: angleDraft,
                            placeholder: t('angle.placeholder'),
                            onChange: (event) =>
                              setAngleDraft(event.target.value),
                          }),
                          h(
                            'div',
                            { className: 'bureau-inline-actions' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'bureau-primary',
                                onClick: saveAngle,
                                disabled: busy || !angleDraft.trim(),
                              },
                              t('angle.save'),
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'bureau-textbutton',
                                onClick: () => setAngleEditing(false),
                              },
                              t('angle.cancel'),
                            ),
                          ),
                        )
                      : angleExists
                        ? h(
                            React.Fragment,
                            null,
                            h(
                              'div',
                              { className: 'bureau-doc-actions' },
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'bureau-textbutton',
                                  onClick: () => {
                                    setAngleDraft(angleState.data?.text ?? '');
                                    setAngleEditing(true);
                                  },
                                },
                                t('angle.edit'),
                              ),
                            ),
                            markdown(angleState.data?.text ?? ''),
                          )
                        : h(
                            React.Fragment,
                            null,
                            h(Empty, { title: t('angle.empty') }),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'bureau-textbutton',
                                onClick: () => {
                                  setAngleDraft('');
                                  setAngleEditing(true);
                                },
                              },
                              t('angle.add'),
                            ),
                          )
                : artifactState.loading && !artifactState.data
                  ? h(Spinner)
                  : artifactState.error
                    ? h(ErrorLine, {
                        error: artifactState.error,
                        onRetry: reloadArtifact,
                        t,
                      })
                    : artifactState.data?.exists
                      ? markdown(artifactState.data.text)
                      : h(
                          'div',
                          { className: 'bureau-empty' },
                          h('strong', null, t('artifact.missing')),
                          h('span', null, t('artifact.hint')),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'bureau-primary bureau-empty-action',
                              onClick: openSession,
                              disabled: busy,
                            },
                            t('piece.open'),
                          ),
                        ),
        ),
        sourceId
          ? h(SourceReader, {
              id: sourceId,
              t,
              onClose: () => setSourceId(null),
            })
          : null,
      );
    }

    function SourceList({ sources, t, onOpen }) {
      if (!sources.length) return h(Empty, { title: t('source.empty') });
      return h(
        'ul',
        { className: 'bureau-piece-sources' },
        sources.map((source) =>
          h(
            'li',
            { key: source.bd_id, className: 'bureau-piece-source' },
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-source-button',
                onClick: () => onOpen(source.bd_id),
              },
              h('span', { className: 'bureau-source-title' }, source.title),
              h(
                'span',
                { className: 'bureau-source-meta' },
                `${source.site ?? 'sans site'} · ${source.word_count} ${t('common.words')} · ${formatDate(source.captured_at)}`,
              ),
            ),
            h(Coverage, { coverage: source.coverage, t }),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Page                                                                */
    /* ------------------------------------------------------------------ */

    function BureauPage({ t, uiWorkspace }) {
      const [piecesState, reloadPieces] = useApi('/pieces');
      const [selected, setSelected] = useState(null);
      const [newOpen, setNewOpen] = useState(false);
      const [instructionsOpen, setInstructionsOpen] = useState(false);

      const pieces = piecesState.data?.pieces ?? [];

      useEffect(() => {
        if (!selected && pieces.length) setSelected(pieces[0].slug);
        if (
          selected &&
          pieces.length &&
          !pieces.some((piece) => piece.slug === selected)
        ) {
          setSelected(pieces[0].slug);
        }
      }, [pieces, selected]);

      function onCreated(slug) {
        setNewOpen(false);
        setSelected(slug);
        reloadPieces();
      }

      function onArchive() {
        setSelected(null);
        reloadPieces();
      }

      return h(
        'div',
        { className: 'bureau-root' },
        h('style', null, CSS),
        h(
          'header',
          { className: 'bureau-topbar' },
          h('h1', null, t('panel.label')),
          h(
            'div',
            { className: 'bureau-topbar-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-textbutton',
                onClick: () => setInstructionsOpen((value) => !value),
                'aria-pressed': instructionsOpen,
              },
              instructionsOpen
                ? t('instructions.back')
                : t('instructions.button'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'bureau-primary',
                onClick: () => setNewOpen(true),
              },
              t('new.button'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'bureau-body' },
          instructionsOpen
            ? null
            : h(
                'aside',
                { className: 'bureau-list' },
                piecesState.loading ? h(Spinner) : null,
                h(ErrorLine, {
                  error: piecesState.error,
                  onRetry: reloadPieces,
                  t,
                }),
                pieces.length === 0 && !piecesState.loading
                  ? h(Empty, { title: t('pieces.empty') })
                  : pieces.map((piece) =>
                      h(
                        'button',
                        {
                          key: piece.slug,
                          type: 'button',
                          className: `bureau-list-row${piece.slug === selected ? ' is-active' : ''}`,
                          onClick: () => {
                            setSelected(piece.slug);
                            setInstructionsOpen(false);
                          },
                        },
                        h(
                          'span',
                          { className: 'bureau-list-title' },
                          piece.title,
                        ),
                        h(
                          'span',
                          { className: 'bureau-list-meta' },
                          `${t(`status.${piece.status}`)} · ${formatDate(piece.updated_at)}`,
                        ),
                      ),
                    ),
              ),
          h(
            'main',
            { className: 'bureau-content' },
            instructionsOpen
              ? h(InstructionsPanel, { t })
              : h(
                  'div',
                  { className: 'bureau-content-inner' },
                  selected
                    ? h(PieceView, {
                        key: selected,
                        slug: selected,
                        t,
                        uiWorkspace,
                        onArchive,
                      })
                    : h(Empty, {
                        title: t('piece.empty'),
                      }),
                ),
          ),
        ),
        newOpen
          ? h(NewPieceDialog, {
              t,
              onClose: () => setNewOpen(false),
              onCreated,
            })
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
      @font-face {
        font-family: 'Bureau Inter';
        src: url('/api/bureau/font') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
      .bureau-root {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font-family: 'Bureau Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        font-size: 15px;
        line-height: 1.55;
      }
      .bureau-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex: 0 0 auto;
        padding: 14px 24px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-topbar h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        letter-spacing: -.01em;
      }
      .bureau-topbar-actions { display: flex; align-items: center; gap: 10px; }
      .bureau-body { display: flex; flex: 1; min-height: 0; }
      .bureau-list {
        width: 258px;
        flex: 0 0 258px;
        padding: 12px;
        overflow-y: auto;
        border-right: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-list-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
        padding: 9px 11px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .bureau-list-row:hover { background: var(--dsw-alias-bg-layer-1); }
      .bureau-list-row.is-active { background: var(--dsw-alias-bg-layer-1); }
      .bureau-list-title { font-size: 14px; font-weight: 550; line-height: 1.4; }
      .bureau-list-meta { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .bureau-content { flex: 1; min-width: 0; overflow-y: auto; }
      .bureau-content-inner {
        max-width: 820px;
        margin: 0 auto;
        padding: 32px 36px 64px;
      }
      .bureau-piece-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
      }
      .bureau-piece-title { min-width: 0; }
      .bureau-piece-title h2 {
        margin: 0 0 7px;
        font-size: 24px;
        line-height: 1.3;
        font-weight: 600;
        letter-spacing: -.01em;
      }
      .bureau-meta {
        display: flex;
        align-items: baseline;
        gap: 4px 12px;
        flex-wrap: wrap;
        font-size: 13px;
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-status-select {
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 13px;
        padding: 0 14px 0 0;
        cursor: pointer;
      }
      .bureau-status-select:hover { color: var(--dsw-alias-label-primary); }
      .bureau-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: 0 0 auto;
        flex-wrap: nowrap;
      }
      .bureau-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 14px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: var(--dsw-alias-brand-primary);
        color: #fff;
        font: inherit;
        font-size: 13.5px;
        font-weight: 500;
        cursor: pointer;
      }
      .bureau-primary:hover:not(:disabled) { filter: brightness(1.06); }
      .bureau-primary:disabled { opacity: .55; cursor: default; }
      .bureau-textbutton {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 0;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13.5px;
        cursor: pointer;
      }
      .bureau-textbutton:hover { color: var(--dsw-alias-label-primary); }
      .bureau-textbutton[aria-pressed='true'] { color: var(--dsw-alias-label-primary); }
      .bureau-danger:hover { color: var(--dsw-alias-state-error-primary); }
      .bureau-stages {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        margin-top: 22px;
      }
      .bureau-stage {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .bureau-stage:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
      .bureau-stage:disabled { opacity: .38; cursor: default; }
      .bureau-stage-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--dsw-alias-state-idle-primary);
      }
      .bureau-stage.is-ready .bureau-stage-dot { background: var(--dsw-alias-brand-primary); }
      .bureau-stage.is-done .bureau-stage-dot { background: var(--dsw-alias-state-success-primary); }
      .bureau-run {
        margin: 12px 0 0;
        font-size: 13px;
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-run-error { color: var(--dsw-alias-state-error-primary); }
      .bureau-pipeline {
        margin-top: 18px;
        padding: 14px 16px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
      }
      .bureau-pipeline-stages { display: flex; flex-wrap: wrap; gap: 8px 18px; }
      .bureau-pipeline-foot {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--dsw-alias-border-l1);
        font-size: 13px;
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-pipeline-foot .bureau-textbutton { margin-left: auto; }
      .bureau-inline-actions { display: flex; gap: 14px; margin-top: 10px; }
      .bureau-docbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 28px 0 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-docbar-label {
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-doc-select {
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        padding: 0 16px 0 0;
        cursor: pointer;
      }
      .bureau-docbar .bureau-textbutton { margin-left: auto; }
      .bureau-doc-actions { display: flex; justify-content: flex-end; margin-bottom: 6px; }
      .bureau-document { min-height: 120px; }
      .bureau-prose { font-size: 16px; line-height: 1.7; }
      .bureau-prose h1, .bureau-prose h2, .bureau-prose h3, .bureau-prose h4 {
        line-height: 1.35;
        margin: 1.5em 0 .6em;
        letter-spacing: -.005em;
      }
      .bureau-prose h1 { font-size: 23px; }
      .bureau-prose h2 { font-size: 19px; }
      .bureau-prose h3 { font-size: 16.5px; }
      .bureau-prose h4 { font-size: 15px; }
      .bureau-prose p { margin: .7em 0; }
      .bureau-prose ul, .bureau-prose ol { margin: .7em 0; padding-left: 1.4em; }
      .bureau-prose li { margin: .3em 0; }
      .bureau-prose blockquote {
        margin: .9em 0;
        padding: 2px 0 2px 14px;
        border-left: 2px solid var(--dsw-alias-border-l2);
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-prose code {
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--dsw-alias-bg-layer-1);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: .9em;
      }
      .bureau-code {
        overflow-x: auto;
        padding: 12px 14px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        font-size: 13.5px;
      }
      .bureau-code code { background: transparent; padding: 0; }
      .bureau-prose hr {
        margin: 1.3em 0;
        border: 0;
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-table-wrap { overflow-x: auto; margin: .9em 0; }
      .bureau-table { border-collapse: collapse; min-width: 100%; font-size: 14px; }
      .bureau-table th, .bureau-table td {
        padding: 7px 10px;
        border: 1px solid var(--dsw-alias-border-l1);
        text-align: left;
        vertical-align: top;
      }
      .bureau-table th { background: var(--dsw-alias-bg-layer-1); font-weight: 600; }
      .bureau-piece-sources { list-style: none; margin: 0; padding: 0; }
      .bureau-piece-source {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-source-button {
        flex: 1;
        min-width: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .bureau-source-button:hover .bureau-source-title { text-decoration: underline; }
      .bureau-source-title { display: block; font-size: 14px; font-weight: 500; line-height: 1.45; }
      .bureau-source-meta { display: block; margin-top: 3px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
      .bureau-source-used { display: block; margin-top: 3px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .bureau-coverage { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .bureau-coverage-ok { color: var(--dsw-alias-state-success-primary); }
      .bureau-coverage-warn { color: var(--dsw-alias-state-warn-primary); }
      .bureau-coverage-bad { color: var(--dsw-alias-state-error-primary); }
      .bureau-check-list { list-style: none; margin: 0 0 4px; padding: 0; }
      .bureau-check-list li {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 18px;
        padding: 8px 0;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        font-size: 14px;
      }
      .bureau-check-list li.is-over { color: var(--dsw-alias-state-error-primary); }
      .bureau-check-value { color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .bureau-checks h3 { margin: 24px 0 4px; font-size: 15px; }
      .bureau-empty { padding: 28px 0; color: var(--dsw-alias-label-secondary); font-size: 14px; }
      .bureau-empty strong { display: block; margin-bottom: 3px; color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 500; }
      .bureau-empty span { display: block; }
      .bureau-empty-action { margin-top: 16px; }
      .bureau-muted { color: var(--dsw-alias-label-secondary); font-size: 13px; }
      .bureau-lede { margin: 0 0 18px; }
      .bureau-error {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 12px 0;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-state-error-primary);
        font-size: 13.5px;
      }
      .bureau-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid var(--dsw-alias-border-l2);
        border-top-color: var(--dsw-alias-brand-primary);
        border-radius: 50%;
        animation: bureau-spin .8s linear infinite;
      }
      @keyframes bureau-spin { to { transform: rotate(360deg); } }
      .bureau-instructions {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 36px;
        max-width: 1080px;
        margin: 0 auto;
        padding: 32px 36px 64px;
      }
      .bureau-instructions-list {
        align-self: start;
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .bureau-instructions-head {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        margin-bottom: 10px;
      }
      .bureau-instructions-head h2 { margin: 0; font-size: 16px; }
      .bureau-instruction-group { margin-top: 16px; }
      .bureau-group-label {
        margin: 0 0 4px;
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--dsw-alias-label-secondary);
      }
      .bureau-instruction-link {
        display: block;
        width: 100%;
        padding: 6px 8px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 13.5px;
        text-align: left;
        cursor: pointer;
      }
      .bureau-instruction-link:hover { background: var(--dsw-alias-bg-layer-1); }
      .bureau-instruction-link.is-active { background: var(--dsw-alias-bg-layer-1); }
      .bureau-instructions-doc { min-width: 0; max-width: 760px; }
      .bureau-doc-header {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
        padding-bottom: 12px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-doc-header h2 { margin: 0; font-size: 18px; }
      .bureau-doc-header .bureau-textbutton { margin-left: auto; }
      .bureau-overlay {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 23, 32, .45);
      }
      .bureau-dialog {
        display: flex;
        flex-direction: column;
        width: min(680px, 100%);
        max-height: min(86vh, 900px);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 14px;
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
        box-shadow: 0 20px 60px rgba(0, 0, 0, .28);
        overflow: hidden;
      }
      .bureau-dialog-wide { width: min(900px, 100%); }
      .bureau-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 22px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-dialog-header h2 { margin: 0; font-size: 16px; }
      .bureau-close {
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
      }
      .bureau-close:hover { background: var(--dsw-alias-bg-layer-1); }
      .bureau-dialog-body { padding: 18px 22px; overflow-y: auto; }
      .bureau-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 16px;
        padding: 14px 22px;
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .bureau-new-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 24px;
      }
      .bureau-section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .bureau-section-head h3 { margin: 0; font-size: 14px; font-weight: 600; }
      .bureau-source-list {
        max-height: 360px;
        overflow-y: auto;
        margin-top: 4px;
      }
      .bureau-source-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 8px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        border-radius: 6px;
        cursor: pointer;
      }
      .bureau-source-row.is-selected { background: var(--dsw-alias-bg-layer-1); }
      .bureau-source-row input { margin-top: 3px; }
      .bureau-source-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
      .bureau-field { display: block; margin: 14px 0 5px; font-size: 13px; font-weight: 550; }
      .bureau-input, .bureau-textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        color: inherit;
        font: inherit;
        font-size: 14px;
      }
      .bureau-textarea { resize: vertical; min-height: 96px; line-height: 1.55; }
      .bureau-input:focus, .bureau-textarea:focus,
      .bureau-primary:focus-visible, .bureau-textbutton:focus-visible,
      .bureau-list-row:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 2px;
      }
      .bureau-note { margin: 12px 0; }
      .bureau-note p { margin: 0 0 4px; font-size: 13.5px; }
      .bureau-source-links {
        display: flex;
        align-items: baseline;
        gap: 14px;
        flex-wrap: wrap;
        margin: 8px 0 14px;
        font-size: 13px;
      }
      .bureau-source-text {
        max-height: 56vh;
        overflow: auto;
        margin: 0;
        padding: 14px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        white-space: pre-wrap;
        word-break: break-word;
        font-family: 'Bureau Inter', ui-sans-serif, system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.65;
      }
      @media (max-width: 900px) {
        .bureau-body { flex-direction: column; }
        .bureau-list {
          width: auto;
          flex: 0 0 auto;
          max-height: 30vh;
          border-right: 0;
          border-bottom: 1px solid var(--dsw-alias-border-l1);
        }
        .bureau-content-inner { padding: 20px; }
        .bureau-instructions { grid-template-columns: 1fr; gap: 20px; padding: 20px; }
        .bureau-instructions-list { position: static; }
        .bureau-piece-head { flex-direction: column; }
        .bureau-actions { flex-wrap: wrap; }
        .bureau-new-grid { grid-template-columns: 1fr; }
        .bureau-topbar { padding: 12px 16px; }
      }
    `;

    function SidebarIcon({ size }) {
      return h(IconDesk, { size });
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
          return h(BureauPage, {
            ...props,
            t,
            uiWorkspace: ctx.get ? ctx.get('uiWorkspace') : undefined,
          });
        }
        Page.displayName = 'BureauPage';

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
