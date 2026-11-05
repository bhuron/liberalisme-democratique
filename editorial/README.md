# Le desk éditorial

Un espace de travail pour passer de quelques liens à un brouillon publiable,
sans jamais publier automatiquement.

## Principe

Trois couches, dans cet ordre :

1. **bookmark-digest** capture le texte depuis le navigateur, y compris derrière
   un paywall. C'est la couche d'accès ; elle n'est pas modifiée par le desk.
2. **Le desk** fige chaque source, garde la trace des pièces et vérifie ce qui
   est vérifiable mécaniquement.
3. **Les agents** lisent et écrivent dans le desk. Ils n'ont pas d'état propre :
   on peut les remplacer, les relancer ou les arrêter sans perdre le travail.

## Commandes

```bash
npm run desk:inbox                 # capturer ce qui attend dans bookmark-digest
npm run desk -- inbox --since 7d   # les sept derniers jours
npm run desk -- add 1 2 5 --slug ma-piece --title "Ma pièce"
npm run desk -- pieces             # état des pièces
npm run desk -- show ma-piece      # détail et artefacts
npm run desk -- promote ma-piece approved
npm run desk -- lint ma-piece      # typographie du brouillon
npm run desk -- style ma-piece     # tics de style (tirets, renversements…)
npm run desk -- pipeline ma-piece   # état des six étapes
npm run desk -- run ma-piece critique
npm run desk -- find "une URL ou un titre" # retrouver une source capturée
npm run desk -- search "data centre" # bibliothèque capturée
npm run desk -- related "data centres, bulle IA"
npm run desk:test                  # tests du desk
```

Le desk lit la base SQLite de bookmark-digest en lecture seule. Si `node:sqlite`
n'est pas disponible, il bascule sur l'API REST (`http://localhost:3001`) avec
la clé de `bookmark-digest/config.json`. Variables d'environnement :
`BOOKMARK_DIGEST_ROOT`, `BOOKMARK_DIGEST_DB`, `BOOKMARK_DIGEST_API`.

## Écrire un brief

Le brief est un document de travail, pas un article. Phrases déclaratives,
tableaux, options, risques. La voix de l'auteur n'apparaît que dans les ledes,
qui servent à choisir l'angle. Un brief qui « sonne bien » est un brief qui a
pris la place du texte.

## L'interface

```bash
npm run desk:ui
# http://127.0.0.1:4322
```

Le bureau est une petite application locale, sans build :

1. **Nouvelle pièce** : choisir un ou plusieurs articles capturés, et une
   intention.
2. **Discussion** : une session neuve par pièce, avec pour seul contexte les
   sources choisies, la charte et l'intention. Rien d'autre.
3. **Brief** : l'agent écrit `brief.md` quand vous le demandez. Vous le relisez,
   vous critiquez, vous validez l'angle.
4. **Recherche** : l'agent vérifie les faits et complète les manques. Le détail
   va dans `research.md`, pas dans le chat.
5. **Brouillon** : une fois l'angle validé, l'agent écrit
   `src/content/blog/<slug>.mdx` avec `draft: true`.
6. **Sources** : le texte capturé, avec le diagnostic de couverture.

Le bouton **Supprimer** de l'en-tête déplace la pièce dans `editorial/archive/`.
Le brouillon dans `src/content/blog/` n'est pas supprimé. Pour purger, supprimez
le dossier d'archive.

Les tweets et threads ne passent pas par le bureau : ils se font avec la skill
`tweet` dans une session DSH.

Chaque pièce a son dossier et son `session_id` : commencer une nouvelle idée
n'ajoute rien à la précédente. Le serveur n'écoute que sur `127.0.0.1` et ne
demande pas d'authentification ; ne l'exposez pas.

### Le moteur d'agent

| Variable | Effet |
|---|---|
| `DESK_AGENT=dsh` (défaut) | `dsh --profile headless --json`, avec `tools/desk/headless-auth.cordis.yml` pour réutiliser la connexion DSH enregistrée |
| `DESK_AGENT=fake` | réponses de démonstration, sans modèle |
| `DESK_AGENT=off` | désactive l'agent |
| `DSH_BIN` | chemin explicite de `dsh` (prioritaire sur le PATH et le cache npx) |
| `DESK_PORT` | port du bureau (4322 par défaut) |

### Quel dsh, et faut-il lancer `dsh web` ?

Le bureau ne parle pas au serveur Web DSH. Il lance
`dsh --profile headless` pour chaque action, puis le processus se termine. Il
faut donc le CLI `dsh`, pas `dsh web`, et le GUI n'a pas besoin de tourner.

Résolution : `DSH_BIN`, puis `dsh` dans le PATH, puis le cache npx. S'il y a
plusieurs caches npx, le choix n'est pas garanti : fixez `DSH_BIN` pour être
sûr.

```bash
DSH_BIN="$(command -v dsh)" npm run desk:ui
```

Le chemin utilisé est affiché au démarrage et dans `/api/health`.

Sans `dsh`, le bureau s'ouvre et les artefacts restent consultables, mais aucune
génération ne fonctionne. `DESK_AGENT=fake` donne la démo.

La skill `tweet` est l'inverse : elle tourne dans une session DSH, pas dans le
bureau, et n'a pas besoin que le bureau soit lancé.

Le profil headless ignore par défaut le magasin de credentials du GUI ; le
patch fourni le réactive, et c'est la voie normale : aucune clé n'est alors
nécessaire.

Si la connexion échoue, fournissez la clé par l'environnement du processus,
jamais par un fichier du dépôt :

```bash
DEEPSEEK_API_KEY="$(pass show deepseek/api)" npm run desk:ui
```

Adaptez à votre gestionnaire de secrets (`pass`, `op run`, `secret-tool`). Ne
créez jamais `.env` dans ce dépôt : le profil headless le lirait, et un fichier
ignoré finit toujours par être copié, forcé ou poussé.

## Le workflow multi-agent

Le desk n'est pas un agent unique. Six étapes, huit rôles, et chaque rôle tourne
dans une session neuve :

| Étape | Rôles | Sortie |
|---|---|---|
| `research` | documentaliste | `research.md` |
| `brief` | stratège | `brief.md` |
| `draft` | rédacteur | `src/content/blog/<slug>.mdx` |
| `critique` | faits, voix, structure (en parallèle) | `critiques/*.md` + scorecards |
| `revise` | réviseur | brouillon révisé + `critiques/revision.md` |
| `package` | éditeur | `package.md` |

Correspondance avec le chapitre 9 :

- **Workflow** : l'ordre est fixé par le desk, pas par le modèle.
- **Agent as Tool** : chaque rôle tourne dans une session isolée et ne renvoie
  qu'un artefact et trois phrases.
- **Parallel** : les trois critiques tournent en même temps.
- **Loop** : critique → révision ; la boucle est pilotée par l'utilisateur
  (relancer `revise` jusqu'à ce que les must-fix tombent à zéro).
- **Transfer** : la conversation est la porte d'entrée ; elle délègue au
  spécialiste via `angle.md` et les étapes.
- **A2A** : non utilisé ; les sessions sont locales.

`angle.md` est la décision de l'utilisateur (angle retenu, écarté, à vérifier).
L'agent de conversation l'écrit ; les spécialistes le lisent, car ils ne voient
pas le chat.

L'onglet **Workflow** de l'interface expose les six étapes, leur état et un
bouton pour les lancer.

## Langues

Les articles, leurs titres, leurs descriptions et leurs étiquettes sont en
français. Les posts sociaux (Bluesky, X) sont en anglais par défaut ; le
français seulement sur demande explicite. La conversation avec l'agent suit la
langue de l'utilisateur.

## Organisation

```
editorial/
  style/card.md              # la charte de style
  sources/<id>/meta.json     # provenance, hash, couverture
  sources/<id>/text.txt      # texte intégral, ignoré par git
  pieces/<slug>/piece.json   # état, sources, titre
  pieces/<slug>/intent.md    # pourquoi cette pièce, ce que je veux dire
  agent/roles/*.md           # les huit spécialistes
  pieces/<slug>/angle.md     # décision de l'utilisateur, lue par les rôles
  pieces/<slug>/brief.md     # angle, thèse, ledger, steelman
  pieces/<slug>/research.md  # sources, dates, à capturer, incertitudes
  pieces/<slug>/critiques/   # faits, voix, structure, révision
  pieces/<slug>/package.md   # titres, description, thread
  pieces/<slug>/runs/        # journal des exécutions par étape
  pieces/<slug>/log.jsonl    # journal des transitions
```

Le texte des articles vit dans `src/content/blog/<slug>.mdx`, avec
`draft: true`. Le desk ne le crée pas encore : c'est l'étape suivante.

## Couverture des sources

Une capture peut être complète, partielle (paywall, texte court, coupure) ou
échouée. `meta.json` porte ce diagnostic :

- `full` : le texte va jusqu'au bout ;
- `partial` : appel à l'abonnement, texte trop court ou fin suspecte ;
- `failed` : capture vide ou en erreur.

Un agent ne doit jamais affirmer au-delà de ce que la source couvre. En cas de
doute, il demande.

## Statuts d'une pièce

`new` → `briefed` → `approved` → `drafted` → `reviewed` → `published`

Le passage à `approved` est le point de contrôle humain : on valide l'angle
avant d'écrire mille mots.

## Ce que le desk ne fait pas

- Il ne publie pas, ne merge pas, ne poste pas.
- Il ne modifie pas bookmark-digest.
- Il ne garde pas le texte intégral dans git (droits d'auteur).

## Prochaines étapes

1. Générateur de brief et de brouillon (agents).
2. Route `/brouillon/<slug>` activée uniquement sur les previews Cloudflare
   (`DRAFT_PREVIEW=1`).
3. Publication : branche `article/<slug>`, PR, merge humain.
4. Déclinaisons Bluesky, puis X.
5. Serveur MCP pour exposer le desk aux autres clients.
