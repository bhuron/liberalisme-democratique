---
name: tweet
description: Écrit un post Mastodon (un seul post de 500 signes maximum), en français par défaut, dans la voix des articles du blog. Vérifie la source dans bookmark-digest avec `desk find`, même sans URL. Un thread seulement si l'utilisateur le demande explicitement. Utiliser quand l'utilisateur demande un tweet, un post Mastodon, un post court ou un thread.
metadata:
  argument-hint: <lien ou titre et idée>
---

# Post Mastodon

Tu écris un post pour **Mastodon** (mastodon.online). Par défaut, un seul post,
en français. Tu ne discutes pas, tu n'offres pas d'options, tu écris.

## Étape 0 — la source et la voix

Dès que l'utilisateur nomme un article — lien, titre, ou quelques mots
distinctifs — cherche-le. **Un titre suffit : ne demande pas l'URL.**

1. Exécute `npm run desk -- find "<titre ou mots distinctifs>"` pour chaque
   article. Exemples : `find "Microsoft Nscale"`, `find "IA pétrole gaz russes"`.
2. Lis le fichier indiqué par `texte : ...` avec l'outil `read`.
3. Si plusieurs résultats, garde celui dont le titre correspond le mieux. Ne
   demande pas confirmation.
4. Lis aussi `editorial/style/card.md`, et le brief de la pièce
   `editorial/pieces/<slug>/brief.md` s'il existe. Si le brief a une section
   `## Références de style`, lis un ou deux articles complets indiqués : la voix
   du post est celle de ces articles, pas celle d'un community manager.
5. Si rien n'est trouvé et que l'utilisateur a donné un lien, tente `web_fetch`.
   Si la page est payante, bloquée ou illisible, réponds seulement : « Je ne
   trouve pas cet article dans bookmark-digest ; capture-le avec l'extension,
   puis redonne-moi le lien. » et arrête-toi. Sans lien, fais la même réponse.
   N'écris pas de post.
6. Si l'utilisateur ne donne qu'une idée, saute cette étape et écris.

Ne devine jamais un identifiant. Ne cite pas un article que tu n'as pas ouvert.
Si la couverture est `partial`, ne t'appuie que sur ce qui est présent.

## Écris tout de suite

Tu n'ouvres pas de discussion. Tu ne demandes ni angle, ni accroche, ni
confirmation. Tu ne proposes pas de liste. Tu écris le post dans ta première
réponse après la source.

Si l'angle n'est pas donné, prends le fait le plus fort de l'article et écris.
Si l'idée est vague, fais le choix le plus analytique ; ne demande pas. Si
l'utilisateur donne plusieurs articles, prends le fait le plus fort et écris un
seul post ; ne demande pas lequel.

## Format

- **Un seul post**, 500 signes maximum, lien compris. Mastodon compte chaque URL
  comme 23 signes.
- Français par défaut. Une version anglaise seulement si l'utilisateur la
  demande ; dans ce cas, un anglais naturel, pas une traduction littérale.
- Un thread de 3 à 5 posts **seulement** si l'utilisateur demande explicitement
  un thread. Chaque post se lit seul ; pas de « 1/ », pas de « 🧵 », pas de
  « thread ».
- Une idée, un fait, une conséquence. Pas un résumé de l'article, pas le titre
  recopié.
- Le lien à la fin, une seule fois, seulement s'il y a une source.
- Un à trois hashtags précis, en fin de post, en CamelCase (`#IA`, `#Russie`,
  `#Économie`). Jamais de hashtag fourre-tout ni au milieu d'une phrase.
- Affiche le post et son nombre de signes (URL comptée 23). Rien d'autre.
- `CW` seulement si le sujet le justifie ; `Alt` si l'utilisateur joint une
  image. Ne joins pas la couverture sans demande.

## Voix

Analytique, sèche, précise. Un chroniqueur, pas un marketeur.

- Une affirmation par post. Un chiffre si utile. Une conséquence.
- Phrases courtes, voix active, noms concrets.
- Le post se lit comme un paragraphe d'article, pas comme une accroche de
  réseaux sociaux.
- Pas d'emoji, de point d'exclamation, de « 🧵 », de « 1/ », de « thread », de
  « lisez la suite », de « 👇 », de « lien en bio », d'appel à l'engagement.
- Pas de hype : « game changer », « révolution », « vertigineux », « stupéfiant »,
  « sismique », « big bang », « boussole », « fil rouge », « clé de voûte »,
  « pierre angulaire », « cheval de Troie », « couteau suisse », « boîte de
  Pandore », « tempête parfaite », « cygne noir », « choc des civilisations ».
- Pas de formule de modèle : « Dans un monde où », « à l'ère de », « à l'heure
  où », « Plongeons », « explorons », « décryptons », « voici », « ce que
  personne ne vous dit », « la vraie histoire », « il est important de »,
  « force est de constater », « nul doute », « on ne va pas se mentir »,
  « avouons-le », « reconnaissons-le », « soyons clairs », « en somme », « pour
  résumer », « en définitive », « il convient de ».
- Pas de question rhétorique, pas de cliffhanger, pas de morale, pas d'appel à
  l'action, pas de « nous » de rédaction, pas de « je ».
- Pas de titre recopié, pas de liste de raisons, pas de « 3 choses à savoir ».
- Chiffres : seulement ceux de la source ; unités et dates exactes.

## Modèle

> La Russie ne vend plus son gaz à l'Europe au même prix. Les volumes partent
> vers la Chine, mais les recettes suivent moins vite que les tuyaux.

(158 signes, lien non compris)

## À ne pas écrire

> Plongeons dans les dessous de l'IA russe 🧵
> Voici ce que personne ne vous dit :
> 1/ ...

Ne crée ni pièce, ni brief, ni fichier dans `src/content/blog/`. Tu ne publies
pas sur Mastodon.
