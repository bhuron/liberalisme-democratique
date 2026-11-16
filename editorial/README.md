# Le desk éditorial

Le desk accompagne l'écriture d'une pièce : il fige les sources, cherche des
liens, prépare un dossier, écrit le brouillon et prépare le paquet de
publication. Il ne critique pas les articles et ne cherche pas à démontrer une
thèse.

L'interface est le panneau **Bureau** de DSH. Chaque pièce a sa session de
conversation. Les étapes tournent dans des sessions de spécialistes isolées et
écrivent un artefact chacune.

## Étapes

| Étape | Rôle | Sortie |
| --- | --- | --- |
| `research` | documentaliste | `editorial/pieces/<slug>/research.md` |
| `brief` | préparateur | `editorial/pieces/<slug>/brief.md` |
| `draft` | rédacteur | `src/content/blog/<slug>.mdx` |
| `style` | relecture de style (optionnelle) | `editorial/pieces/<slug>/relecture-style.md` |
| `package` | éditeur | `editorial/pieces/<slug>/package.md` |

`style` compare le brouillon aux articles de référence et propose des
corrections concrètes. Il n'y a ni score, ni `must_fix`, ni boucle de révision
automatique.

## Corrections ponctuelles

Pour une faute de frappe, un accent, une ponctuation ou une coquille, le fixeur
est disponible **depuis la conversation**, hors pipeline : `desk_fix`. Il
modifie le brouillon en place avec `edit`, sans le réécrire, et écrit
`fixes.md`. Il ne touche ni aux faits, ni aux chiffres, ni au style ; les
corrections qui demandent une réécriture sont seulement signalées.

Ne relance pas `draft` pour une correction locale : le rédacteur réécrirait
tout l'article.

## Exemples de registre

Le préparateur reçoit le catalogue des articles de référence
(`editorial/style/newsroom-corpus.json`) et choisit **deux ou trois** articles
pour la pièce, en variant selon le sujet et le domaine. Il écrit leurs chemins
dans le brief :

```markdown
## Références de style
- path: editorial/style/corpus/financial-times/30.txt
- path: editorial/style/corpus/le-monde-diplomatique/50.txt
```

Le rédacteur reçoit ces articles **complets** dans son prompt. Le reste du
catalogue lui est fourni en « spill » : il peut lire un autre exemple avec
l'outil `read` s'il en a besoin, sans payer tout le corpus à chaque fois.

Si un brief ne contient pas de section « Références de style », le rédacteur
reçoit une paire d'exemples choisie par domaine, pour ne jamais écrire sans
référence.

## Sources et artefacts

- Les captures sont figées dans `editorial/sources/<id>/` ;
- le texte intégral est dans `editorial/sources/<id>/text.txt` ;
- `angle.md` est la note de travail de la conversation : ce que la pièce veut
  dire, ce qu'on écarte, ce qui reste à vérifier ;
- le brouillon reste `draft: true` tant que l'humain ne le publie pas ;
- l'archive déplace `editorial/pieces/<slug>` dans `editorial/archive/` et
  laisse le brouillon en place.

## Rôles

- `documentaliste` : liens et sources primaires ;
- `préparateur` : dossier de faits, liens, titre de travail, inconnues ;
- `rédacteur` : article en français, dans la voix du blog ;
- `relecture de style` : comparaison avec les articles de référence ;
- `fixeur` : corrections mécaniques ciblées, hors pipeline ;
- `éditeur` : titre, description, étiquettes, liens internes, posts.

Les instructions des rôles sont dans `editorial/agent/roles/`. La charte est
dans `editorial/style/card.md` ; le profil de registre dans
`editorial/style/newsroom-profile.md`.

## Ce que le desk ne fait pas

- Il ne publie pas, ne commit pas, ne merge pas.
- Il ne critique pas la source.
- Il n'impose pas de plan, de thèse, de steelman ni de structure.
- Il ne remplit pas un formulaire : les étapes se lancent à la demande.
