const ARTIFACT_META = {
  research: {
    label: 'Recherche',
    empty: 'Pas encore de recherche. Demandez-la dans la discussion.',
    path: (slug) => `editorial/pieces/${slug}/research.md`,
  },
  draft: {
    label: 'Brouillon',
    empty: 'Pas encore de brouillon. Demandez-le dans la discussion.',
    path: (slug) => `src/content/blog/${slug}.mdx`,
  },
};

const state = {
  pieces: [],
  inbox: null,
  newPiece: {
    selected: new Set(),
    intent: '',
    title: '',
  },
  piece: null,
  sources: [],
  messages: [],
  artifacts: {
    brief: false,
    research: false,
    critiques: false,
    draft: false,
  },
  artifactText: {},
  tab: 'chat',
  busy: false,
  error: null,
  agent: null,
  pendingBootstrap: null,
};

const $ = (selector, root = document) => root.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatText(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

function formatDoc(value) {
  const lines = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const html = [];
  let list = null;
  let code = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (code !== null) {
      if (trimmed.startsWith('```')) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph();
      closeList();
      code = [];
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    let match = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (match) {
      flushParagraph();
      closeList();
      const level = match[1].length;
      html.push(`<h${level}>${inlineMarkdown(match[2])}</h${level}>`);
      continue;
    }

    match = trimmed.match(/^[-*]\s+(.*)$/);
    if (match) {
      flushParagraph();
      if (list !== 'ul') {
        closeList();
        html.push('<ul>');
        list = 'ul';
      }
      html.push(`<li>${inlineMarkdown(match[1])}</li>`);
      continue;
    }

    match = trimmed.match(/^\d+\.\s+(.*)$/);
    if (match) {
      flushParagraph();
      if (list !== 'ol') {
        closeList();
        html.push('<ol>');
        list = 'ol';
      }
      html.push(`<li>${inlineMarkdown(match[1])}</li>`);
      continue;
    }

    match = trimmed.match(/^>\s+(.*)$/);
    if (match) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(match[1])}</blockquote>`);
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    paragraph.push(trimmed);
  }

  if (code !== null) {
    html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  }
  flushParagraph();
  closeList();
  return html.join('\n');
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
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris',
  }).format(date);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`);
  }
  return data;
}

function coverageBadge(coverage) {
  if (!coverage) return '';
  if (coverage.level === 'full') {
    return '<span class="badge ok">texte complet</span>';
  }
  if (coverage.level === 'partial') {
    return `<span class="badge warn" title="${escapeHtml(
      coverage.reasons.join(' ; '),
    )}">partiel</span>`;
  }
  return '<span class="badge bad">échec</span>';
}

/* ---------------------------------------------------------------- sidebar */

function renderSidebar() {
  const list = $('#pieces-list');
  list.innerHTML = state.pieces.length
    ? state.pieces
        .map(
          (piece) => `
				<a class="piece-row ${
          state.piece?.slug === piece.slug ? 'active' : ''
        }" href="#/piece/${encodeURIComponent(piece.slug)}" ${
          state.piece?.slug === piece.slug ? 'aria-current="page"' : ''
        }>
					<span class="title">${escapeHtml(piece.title)}</span>
				</a>`,
        )
        .join('')
    : '<p class="hint">Aucun article pour l’instant.</p>';
}

function renderAgentStatus() {
  const element = $('#agent-status');
  if (!state.agent) {
    element.textContent = '';
    return;
  }
  const fake = state.agent.mode === 'fake';
  const label = fake ? 'démonstration' : state.agent.mode;
  const dot = fake ? 'warn' : state.agent.dsh ? 'ok' : 'bad';
  const suffix = !fake && !state.agent.dsh ? ' — dsh introuvable' : '';
  element.innerHTML = `<span class="dot ${dot}"></span> agent : ${label}${suffix}`;
}

/* ---------------------------------------------------------------- router */

async function route() {
  const hash = location.hash.replace(/^#/, '');

  if (!hash && state.pieces.length) {
    location.hash = `#/piece/${encodeURIComponent(state.pieces[0].slug)}`;
    return;
  }

  if (hash === '/new' || !state.pieces.length) {
    state.piece = null;
    state.tab = 'chat';
    await loadInbox();
    renderMain();
    return;
  }

  if (hash.startsWith('/piece/')) {
    await loadPiece(decodeURIComponent(hash.slice('/piece/'.length)));
    return;
  }

  state.piece = null;
  renderMain();
}

async function loadInbox() {
  if (state.inbox) return;
  try {
    const data = await api('/api/inbox');
    state.inbox = data.articles;
  } catch (error) {
    state.error = error.message;
    state.inbox = [];
  }
}

async function loadPieces() {
  try {
    const data = await api('/api/pieces');
    state.pieces = data.pieces;
    renderSidebar();
  } catch {
    /* la sidebar n'est pas critique */
  }
}

async function loadPiece(slug) {
  try {
    const data = await api(`/api/pieces/${encodeURIComponent(slug)}`);
    state.piece = data.piece;
    state.sources = data.sources;
    state.messages = data.messages;
    state.artifacts = data.artifacts;
    state.artifactText = {};
    state.tab = 'chat';
    state.error = null;

    renderSidebar();
    renderMain();

    if (!data.messages.length && state.pendingBootstrap === slug) {
      state.pendingBootstrap = null;
      await sendMessage(null, { bootstrap: true });
    }
  } catch (error) {
    state.error = error.message;
    renderMain();
  }
}

/* ---------------------------------------------------------------- views */

function renderMain() {
  const main = $('#main');
  if (state.piece) {
    main.innerHTML = renderPiece();
    afterPieceRender();
    return;
  }

  const hash = location.hash.replace(/^#/, '');
  if (hash === '/new' || !state.pieces.length) {
    main.innerHTML = renderNew();
    return;
  }

  main.innerHTML = `<div class="wrap">${
    state.error
      ? `<div class="notice">${escapeHtml(state.error)}</div>`
      : '<p class="lede">Choisissez un article à gauche.</p>'
  }</div>`;
}

function renderNew() {
  if (state.inbox === null) {
    return '<div class="wrap"><p class="loading">Chargement des captures…</p></div>';
  }

  if (!state.inbox.length) {
    return `<div class="wrap"><p class="eyebrow">Nouvel article</p>
			<h1>Rien à se mettre sous la dent.</h1>
			<p class="lede">Capturez d’abord un ou deux articles avec l’extension bookmark-digest, puis revenez ici.</p>
			<button class="primary" data-action="refresh">Rafraîchir</button>
		</div>`;
  }

  const cards = state.inbox
    .map((article) => {
      const selected = state.newPiece.selected.has(article.id);
      const used = article.usedIn[0];
      return `<label class="source-card ${selected ? 'selected' : ''}" data-search="${escapeHtml(
        `${article.title} ${article.site ?? ''}`.toLowerCase(),
      )}">
				<input type="checkbox" data-source="${article.id}" ${
          selected ? 'checked' : ''
        } />
				<span class="source-main">
					<span class="source-site">${escapeHtml(article.site ?? 'sans site')}</span>
					<span class="source-title">${escapeHtml(article.title)}</span>
					<span class="source-meta">
						${article.word_count ?? 0} mots
						· ${formatDate(article.created_at)}
						${coverageBadge(article.coverage)}
					</span>
					${
            used
              ? `<span class="used">déjà dans « ${escapeHtml(used.title)} »</span>`
              : ''
          }
				</span>
			</label>`;
    })
    .join('');

  const count = state.newPiece.selected.size;
  const summaryLabel = count
    ? `${count} article${count > 1 ? 's' : ''}`
    : 'Sélectionnez au moins un article.';

  return `<div class="wrap">
		${state.error ? `<div class="notice" role="alert">${escapeHtml(state.error)}</div>` : ''}
		<p class="eyebrow">Nouvel article</p>
		<h1>Sur quoi voulez-vous écrire ?</h1>
		<p class="lede">Partez des articles que vous venez de lire. Le bureau les fige, puis ouvre une conversation neuve avec eux.</p>

		<section class="step">
			<div class="step-head">
				<h2>1. Les articles</h2>
				<span class="count">${state.inbox.length} capture(s)</span>
			</div>
			<input class="filter" id="source-search" type="search" placeholder="Filtrer par titre ou par site…" aria-label="Filtrer les articles capturés" />
			<div class="sources-grid">${cards}</div>
		</section>

		<form id="new-form" class="step">
			<div class="step-head"><h2>2. L’intention</h2></div>
			<div class="field">
				<label for="intent">Ce que vous voulez dire, en une ou deux phrases. Facultatif.</label>
				<textarea id="intent" placeholder="Exemple : la fragilité financière que j’ai décrite en janvier se manifeste maintenant par le politique.">${escapeHtml(
          state.newPiece.intent,
        )}</textarea>
			</div>
			<div class="field">
				<label for="title">Titre de travail. Facultatif.</label>
				<input id="title" type="text" value="${escapeHtml(
          state.newPiece.title,
        )}" placeholder="La bulle IA rencontre sa crise de légitimité" />
			</div>
			<div class="new-actions">
				<button class="primary" type="submit" id="new-submit">Commencer la discussion</button>
				<span class="summary" id="new-summary">${summaryLabel}</span>
			</div>
		</form>
	</div>`;
}

function renderPiece() {
  const piece = state.piece;
  const sourceLine = state.sources.length
    ? `${state.sources.length} source${
        state.sources.length > 1 ? 's' : ''
      } · ${state.sources.map((source) => source.site ?? 'sans site').join(' · ')}`
    : 'Aucune source figée';

  const tabs = [
    ['chat', 'Discussion'],
    ['research', 'Recherche'],
    ['draft', 'Brouillon'],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" data-tab="${id}" role="tab" aria-selected="${
          state.tab === id
        }" aria-controls="tab-panel" class="${
          state.tab === id ? 'active' : ''
        }">${label}</button>`,
    )
    .join('');

  let body = '';
  if (state.tab === 'research') body = renderArtifact('research');
  else if (state.tab === 'draft') body = renderArtifact('draft');
  else body = renderChat();

  return `<div class="wrap">
		<header class="piece-head">
			<div class="piece-title-row">
				<h1>${escapeHtml(piece.title)}</h1>
				<button type="button" class="ghost danger delete-piece" data-action="delete" ${
          state.busy ? 'disabled' : ''
        }>Supprimer</button>
			</div>
			<p class="source-line">${escapeHtml(sourceLine)}</p>
		</header>
		<nav class="tabs" role="tablist" aria-label="Sections de la pièce">${tabs}</nav>
		${state.error ? `<div class="notice" role="alert">${escapeHtml(state.error)}</div>` : ''}
		${
      state.busy
        ? `<div class="progress-line" role="status" aria-live="polite"><span id="progress-text">${escapeHtml(
            progressText(),
          )}</span></div>`
        : ''
    }
		<div class="tab-panel" id="tab-panel" role="tabpanel">${body}</div>
	</div>`;
}

function progressText() {
  const progress = state.progress;
  if (!progress?.active) return 'l’agent travaille…';

  const seconds = Math.max(
    0,
    Math.round((Date.now() - progress.startedAt) / 1000),
  );
  return `${progress.current ?? 'travail'} · ${seconds} s`;
}

function updateProgressLabels() {
  for (const id of ['typing-label', 'progress-text']) {
    const element = document.getElementById(id);
    if (element) element.textContent = progressText();
  }
}

function stopProgress() {
  if (state.progressTimer) clearTimeout(state.progressTimer);
  state.progressTimer = null;
  state.progress = null;
}

async function pollProgress(slug) {
  if (!state.busy) return;

  try {
    state.progress = await api(
      `/api/pieces/${encodeURIComponent(slug)}/progress`,
    );
  } catch {
    /* le serveur peut être momentanément occupé */
  }

  updateProgressLabels();
  if (state.busy) {
    state.progressTimer = setTimeout(() => pollProgress(slug), 800);
  }
}

function startProgress(slug) {
  stopProgress();
  pollProgress(slug);
}

function renderChat() {
  const context = state.messages.find((message) => message.role === 'context');
  const visible = state.messages.filter(
    (message) => message.role !== 'context',
  );

  const messages = visible
    .map((message) => {
      const role = message.role === 'user' ? 'user' : 'assistant';
      const who = role === 'user' ? 'Vous' : 'Agent';
      const rendered =
        role === 'user' ? formatText(message.text) : formatDoc(message.text);
      return `<div class="msg ${role} ${message.error ? 'error' : ''}" ${
        message.error ? 'role="alert"' : ''
      }>
				<div class="who">${who}</div>
				<div class="text">${rendered}</div>
			</div>`;
    })
    .join('');

  const typing = state.busy
    ? `<div class="typing" id="typing" role="status" aria-live="polite"><i></i><i></i><i></i> <span id="typing-label">${escapeHtml(
        progressText(),
      )}</span></div>`
    : '';

  const subagent = `<div id="subagent-event" class="subagent-event" role="status" ${
    state.progress?.subagent ? '' : 'hidden'
  }><span class="dot"></span> Sous-agent : <span id="subagent-label">${escapeHtml(
    state.progress?.subagent ?? '',
  )}</span></div>`;

  if (!state.messages.length) {
    if (state.busy) return `${subagent}${typing}`;

    return `<div class="empty-state">
			<p>La discussion n’a pas encore commencé. Le premier message envoie à l’agent les sources figées, l’intention et la charte.</p>
			<button type="button" class="primary" data-action="bootstrap">Démarrer la discussion</button>
		</div>`;
  }

  const lastMessage = state.messages.at(-1);
  const retry =
    lastMessage?.error && !state.piece.session_id
      ? '<div class="retry"><button type="button" class="primary" data-action="retry">Réessayer le contexte</button></div>'
      : '';

  return `${context ? renderContext(context) : ''}
	<div class="chat" id="chat">${messages}${subagent}${typing}</div>
	${retry}
	<form class="composer" id="composer">
		<div class="composer-box">
			<textarea id="message" aria-label="Message à l’agent" placeholder="Dites ce que vous voulez dire, ou posez une question…" ${
        state.busy ? 'disabled' : ''
      }></textarea>
			<button class="primary" type="submit" ${state.busy ? 'disabled' : ''}>Envoyer</button>
		</div>
	</form>`;
}

function renderContext(message) {
  return `<details class="context-block">
		<summary>Contexte envoyé à l’agent</summary>
		<pre>${escapeHtml(message.text)}</pre>
	</details>`;
}

function renderArtifact(name) {
  const meta = ARTIFACT_META[name];
  const slug = state.piece.slug;

  if (!state.artifacts[name]) {
    return `<div class="empty-state"><p>${meta.empty}</p></div>`;
  }

  const raw = state.artifactText[name];
  if (raw === undefined || raw === null) {
    return '<p class="loading">Lecture du document…</p>';
  }

  const text =
    name === 'draft' ? raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') : raw;

  if (!text.trim()) {
    return '<div class="empty-state">Le document est vide.</div>';
  }

  return `<div class="doc-head">
		<span class="doc-label">${meta.label}</span>
		<div class="doc-actions">
			<span class="path">${escapeHtml(meta.path(slug))}</span>
			<button type="button" class="small" data-copy="${name}">Copier</button>
		</div>
	</div>
	<div class="doc">${formatDoc(text)}</div>`;
}

function afterPieceRender() {
  if (state.tab === 'research' && state.artifacts.research) {
    ensureArtifact('research');
  }
  if (state.tab === 'draft' && state.artifacts.draft) {
    ensureArtifact('draft');
  }
  const main = $('#main');
  if (state.tab === 'chat') main.scrollTop = main.scrollHeight;
}

async function ensureArtifact(name) {
  if (state.artifactText[name] !== undefined) return;
  state.artifactText[name] = null;
  renderMain();

  try {
    const response = await fetch(
      `/api/pieces/${encodeURIComponent(state.piece.slug)}/artifact/${name}`,
    );
    state.artifactText[name] = response.ok ? await response.text() : '';
  } catch {
    state.artifactText[name] = '';
  }
  renderMain();
}

/* ---------------------------------------------------------------- actions */

async function sendMessage(text, { bootstrap = false } = {}) {
  if (!state.piece || state.busy) return;

  state.busy = true;
  state.error = null;
  renderMain();
  startProgress(state.piece.slug);

  try {
    const data = await api(
      `/api/pieces/${encodeURIComponent(state.piece.slug)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(bootstrap ? { bootstrap: true } : { text }),
      },
    );
    state.piece = data.piece;
    state.sources = data.sources;
    state.messages = data.messages;
    state.artifacts = data.artifacts;
    delete state.artifactText.brief;
    delete state.artifactText.draft;
    await loadPieces();
  } catch (error) {
    state.error = error.message;
    try {
      const data = await api(
        `/api/pieces/${encodeURIComponent(state.piece.slug)}`,
      );
      state.piece = data.piece;
      state.messages = data.messages;
      state.artifacts = data.artifacts;
    } catch {
      /* garde l'erreur visible */
    }
  } finally {
    state.busy = false;
    stopProgress();
    renderMain();
  }
}

async function deletePiece() {
  if (!state.piece || state.busy) return;

  const confirmed = window.confirm(
    `Supprimer « ${state.piece.title} » ?\n\nL’article sera déplacé dans editorial/archive. Le brouillon dans src/content/blog n’est pas touché.`,
  );
  if (!confirmed) return;

  try {
    await api(`/api/pieces/${encodeURIComponent(state.piece.slug)}`, {
      method: 'DELETE',
    });
    state.piece = null;
    state.messages = [];
    state.sources = [];
    state.pipeline = [];
    state.artifacts = {
      brief: false,
      research: false,
      critiques: false,
      draft: false,
    };
    state.artifactText = {};
    state.error = null;
    state.pendingBootstrap = null;
    state.inbox = null;
    await loadPieces();
    location.hash = state.pieces.length
      ? `#/piece/${encodeURIComponent(state.pieces[0].slug)}`
      : '#/new';
    await route();
  } catch (error) {
    state.error = error.message;
    renderMain();
  }
}

async function createPiece(form) {
  const selected = [...state.newPiece.selected];
  if (!selected.length) {
    state.error = 'Choisissez au moins un article.';
    renderMain();
    return;
  }

  const submit = $('#new-submit');
  if (!submit) return;
  submit.disabled = true;
  submit.textContent = 'Création…';
  state.error = null;

  try {
    const data = await api('/api/pieces', {
      method: 'POST',
      body: JSON.stringify({
        sourceIds: selected,
        intent: state.newPiece.intent.trim(),
        title: state.newPiece.title.trim(),
      }),
    });

    state.newPiece = {
      selected: new Set(),
      intent: '',
      title: '',
    };
    state.inbox = null;
    state.pendingBootstrap = data.piece.slug;
    await loadPieces();
    location.hash = `#/piece/${encodeURIComponent(data.piece.slug)}`;
  } catch (error) {
    state.error = error.message;
    submit.disabled = false;
    submit.textContent = 'Commencer la discussion';
    renderMain();
  }
}

/* ---------------------------------------------------------------- events */

document.addEventListener('keydown', (event) => {
  const tab = event.target.closest('.tabs [role="tab"]');
  if (!tab) return;

  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  const index = tabs.indexOf(tab);
  let next = null;

  if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
  if (event.key === 'ArrowLeft')
    next = tabs[(index - 1 + tabs.length) % tabs.length];
  if (event.key === 'Home') next = tabs[0];
  if (event.key === 'End') next = tabs[tabs.length - 1];
  if (!next) return;

  event.preventDefault();
  state.tab = next.dataset.tab;
  renderMain();
  document.querySelector(`.tabs [data-tab="${next.dataset.tab}"]`)?.focus();
});

document.addEventListener('click', (event) => {
  const target = event.target.closest(
    '[data-action], [data-tab], [data-fill], [data-copy]',
  );
  if (!target) return;

  if (target.dataset.action === 'new') {
    location.hash = '#/new';
    return;
  }
  if (target.dataset.action === 'refresh') {
    state.inbox = null;
    loadInbox().then(renderMain);
    return;
  }

  if (target.dataset.action === 'delete') {
    deletePiece();
    return;
  }

  if (target.dataset.action === 'bootstrap') {
    sendMessage(null, { bootstrap: true });
    return;
  }

  if (target.dataset.tab) {
    state.tab = target.dataset.tab;
    renderMain();
    return;
  }

  if (target.dataset.fill) {
    const textarea = $('#message');
    if (textarea) {
      textarea.value = target.dataset.fill;
      textarea.focus();
    }
    return;
  }

  if (target.dataset.copy) {
    const text = state.artifactText[target.dataset.copy];
    if (text) navigator.clipboard?.writeText(text);
    target.textContent = 'Copié';
    setTimeout(() => {
      target.textContent = 'Copier';
    }, 1200);
  }
});

document.addEventListener('change', async (event) => {
  const target = event.target;

  if (target.matches('[data-source]')) {
    const id = Number(target.dataset.source);
    if (target.checked) state.newPiece.selected.add(id);
    else state.newPiece.selected.delete(id);

    target
      .closest('.source-card')
      ?.classList.toggle('selected', target.checked);
    const count = state.newPiece.selected.size;
    const summary = $('#new-summary');
    if (summary) {
      summary.textContent = count
        ? `${count} article${count > 1 ? 's' : ''}`
        : 'Sélectionnez au moins un article.';
    }
    return;
  }

  if (target.matches('[data-status]') && state.piece) {
    try {
      const data = await api(
        `/api/pieces/${encodeURIComponent(state.piece.slug)}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ status: target.value }),
        },
      );
      state.piece = data.piece;
      await loadPieces();
      renderMain();
    } catch (error) {
      state.error = error.message;
      renderMain();
    }
  }
});

document.addEventListener('input', (event) => {
  const target = event.target;

  if (target.id === 'source-search') {
    const query = target.value.trim().toLowerCase();
    document.querySelectorAll('.source-card').forEach((card) => {
      card.hidden = Boolean(query) && !card.dataset.search.includes(query);
    });
    return;
  }

  if (target.id === 'intent') state.newPiece.intent = target.value;
  if (target.id === 'title') state.newPiece.title = target.value;
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === 'new-form') {
    await createPiece(form);
    return;
  }

  if (form.id === 'composer' && state.piece) {
    const textarea = $('#message');
    const text = textarea?.value.trim();
    if (!text) return;
    textarea.value = '';
    await sendMessage(text);
  }
});

window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    const composer = $('#composer');
    if (composer) composer.requestSubmit();
  }
});

window.addEventListener('hashchange', () => {
  state.error = null;
  route();
});

/* ---------------------------------------------------------------- boot */

async function boot() {
  try {
    const health = await api('/api/health');
    state.agent = health.agent;
  } catch {
    state.agent = null;
  }
  renderAgentStatus();
  await loadPieces();
  await route();
}

boot();
