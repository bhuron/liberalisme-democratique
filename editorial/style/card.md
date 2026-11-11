# Charte de style — Libéralisme Démocratique

Version 0.1, établie le 5 novembre 2026 à partir des 31 articles du blog
(environ 18 800 mots). Les chiffres entre parenthèses viennent de cette analyse ;
ils décrivent une tendance, pas une règle absolue.

## 1. Voix

- Analytique et impersonnelle. « on » (56 occurrences) plutôt que « je » (12).
  Le « nous » reste rare (16) et réservé au collectif réel.
- On explique avant de juger. La thèse arrive après la concession, jamais avant.
- L'ironie passe par la parenthèse (232 dans le corpus), pas par l'emoji, le
  point d'exclamation ou le sarcasme explicite.
- Le lecteur est un pair informé, pas un élève. Aucun « nous les libéraux »,
  aucune pédagogie condescendante.

## 2. Structure

- Longueur selon le genre : 450 à 700 mots pour une pièce d'actualité, 900 à
  1 300 pour une analyse.
- Les sections sont **optionnelles**. Un texte d'actualité se lit d'un trait,
  sans intertitre. Au plus deux ou trois `##`, et seulement si la pièce est
  longue ; titres courts et assertifs. Jamais un plan en cinq ou huit sections.
- Pour une pièce d'actualité, les cibles mesurées sur 25 articles SCMP/FT
  (profil du 11 novembre 2026) : phrase médiane ~22 mots, paragraphe ~34,
  attaque ~34, citations ~12 pour 1 000 mots, attributions ~12, intertitres 0.
  Voir `editorial/style/newsroom-profile.md`. Pour une analyse, le profil LMD
  donne ~22 mots par phrase, 80 à 120 mots par paragraphe, un chapô de 10 à
  20 mots et 1 à 2 `##`.
- Jamais de titre « Introduction » ni « Conclusion ».
- Ouverture : une idée reçue, puis immédiatement un doute. Pas d'anecdote
  personnelle, pas de « depuis toujours », pas de définition de dictionnaire.
- Une idée par paragraphe. Pour une actualité, 30 à 40 mots (profil SCMP/FT) ;
  pour une analyse, 80 à 120 mots (profil LMD).
- Clôture : une question ou une affirmation sèche. Jamais un résumé de ce qui
  précède.
- Pas de listes à puces dans le corps. Les énumérations tiennent dans la phrase.

## 3. Syntaxe

- Phrase médiane : 21 mots ; moyenne 22. Au-delà de 40 mots, c'est un choix
  assumé, pas un accident.
- Le pivot est le tiret cadratin — 86 occurrences — et la concession est
  « mais » (82 occurrences).
- Le point-virgule est accepté (62 occurrences). Pas de double ponctuation.
- Les parenthèses portent les apartés, les chiffres secondaires et l'ironie.
- Pas de phrases nominales en série, pas de fragments de style publicitaire.

## 4. Lexique

- Vocabulaire économique et financier précis : valorisation, capex, dette,
  backlog, refinancement, hyperscalers.
- Les termes techniques anglais restent en anglais et en italique à la première
  occurrence : *neoclouds*, *hyperscalers*, *backlog*, *greater fool*.
- « IA », jamais « AI ».
- Chiffres : jamais sans source. Espace insécable comme séparateur de milliers,
  virgule décimale, unités explicites (milliards de dollars, MW, %).

## 5. Mouvements argumentatifs

- Steelman puis réfutation : exposer l'argument adverse dans sa meilleure
  version avant de le démonter.
- Analogie historique datée et chiffrée (la fibre de 1997-2001, le NASDAQ de
  2000-2002), pas une analogie décorative.
- Ordre de grandeur avant exemple : le chiffre structure le paragraphe, l'anecdote
  l'illustre.
- Le renversement de cadre (« ce n'est pas X, c'est Y ») : au plus une fois
  par texte, jamais en ouverture ni en conclusion. C'est une figure, pas une
  structure de paragraphe.
- Une question rhétorique au maximum par texte, et seulement si le texte y
  répond.

## 6. Tics mesurés

`npm run desk -- style <slug|fichier>` compare le texte à ces budgets. Ce sont
des plafonds, pas des objectifs.

| Tic | Budget | Corpus de référence |
|---|---|---|
| tiret cadratin | ≤ 6 pour 1 000 mots | 4,6 |
| « ce n'est pas X, c'est Y » | ≤ 1 par texte | rare |
| phrase commençant par « C'est » | ≤ 4 pour 1 000 mots | — |
| « précisément » / « exactement » | ≤ 2 par texte | — |
| « Deux… Ensemble… » | 0 | absent |
| aphorisme « est devenu » | ≤ 1 par texte | — |

Les tics typiques d'un texte généré : l'annonce (« Deux nouvelles. Ensemble,
elles… »), le renversement systématique, l'aphorisme de fin de paragraphe, le
tiret cadratin comme seule ponctuation de liaison.

## 7. Interdits

- « il est important de noter », « en conclusion », « en somme », « dans un monde
  où », « à l'ère de », « il convient de », « force est de constater ».
- Les superlatifs vides : « révolutionnaire », « game-changer », « incontournable »,
  « disruptif ».
- Les paragraphes d'une phrase sans fonction.
- Les transitions méta (« comme nous l'avons vu », « intéressons-nous à »).
- Les conclusions qui récapitulent.
- Critiquer la source, la corriger, signaler ses imprécisions ou ce qu'elle ne
  dit pas. On rapporte ce qu'elle dit ; les réserves du documentaliste restent
  dans `research.md` et `brief.md`. Si un chiffre est une conversion, on l'écrit
  sans leçon.
- Les méta-commentaires sur la méthode de la source (« le papier ne précise
  pas », « sans protocole documenté », « l'équipe ne justifie pas »).
- Raconter les articles (« le billet dit », « selon X », « le papier concède »,
  « le billet annonce »). L'article expose les faits ; les liens portent la
  provenance, pas le texte. Une mention de source au maximum, si elle est
  nécessaire à la compréhension.

## 8. Typographie

Vérifiée par `npm run desk:lint <slug|fichier>` :

- espace insécable avant `;` `:` `!` `?` et à l'intérieur des guillemets
  « … » ;
- tiret cadratin entouré d'espaces ;
- pas d'espace avant une virgule ou un point ;
- apostrophe typographique ’ entre deux lettres ;
- points de suspension … et non ... ;
- pas de double espace.

Les tics sont vérifiés séparément par `npm run desk -- style <slug>`.

## 9. Checklist avant publication

- [ ] La thèse tient en une phrase et n'est pas déjà dans un autre article.
- [ ] Chaque chiffre a un lien vers sa source.
- [ ] Le steelman est présent, et c'est le meilleur argument adverse.
- [ ] Aucun paragraphe ne peut être supprimé sans perte.
- [ ] Le titre ne promet pas plus que le texte.
- [ ] `npm run desk:lint <slug> -- --strict` ne remonte aucune erreur.
- [ ] `npm run desk -- style <slug> --strict` ne dépasse aucun budget.
- [ ] Le brouillon a été relu dans le rendu du site, pas seulement en markdown.

## 10. Posts sociaux

Les posts Bluesky et X sont en anglais par défaut. Cette charte décrit l'article
français ; pour les posts, suivre `editorial/agent/roles/editeur.md` et
`.agents/skills/tweet/SKILL.md`.

## 11. Images de couverture

Toujours 16:9 et photoréaliste. Jamais d'illustration plate, de vectoriel, de
collage ni de texte dans l'image. Le cadre du site affiche une bande plus large
que le 16:9 (environ 2,7:1 sur desktop, 2:1 sur mobile) : garder le sujet dans
le tiers central en hauteur, sinon il est rogné.

Lumière naturelle, décor clair : une couverture sombre ne marche pas.

Les modèles ne savent pas rendre les cartes de tarot. Montrer des dos de cartes,
ou pas de cartes du tout ; jamais de figures ni de symboles de tarot.

L'auteur fournit la couverture. L'agent peut proposer un prompt, jamais générer
sans accord.
