# Charte de style — Libéralisme Démocratique

Version 0.1, établie le 5 novembre 2026 à partir des 31 articles du blog
(environ 18 800 mots). Les chiffres entre parenthèses viennent de cette analyse ;
ils décrivent une tendance, pas une règle absolue.

## 1. Voix

- Analytique et impersonnelle. « on » (56 occurrences) plutôt que « je » (12).
  Le « nous » reste rare (16) et réservé au collectif réel.
- L'ironie passe par la parenthèse (232 dans le corpus), pas par l'emoji, le
  point d'exclamation ou le sarcasme explicite.
- Le lecteur est un pair informé, pas un élève. Aucun « nous les libéraux »,
  aucune pédagogie condescendante.

## 2. Longueur et lisibilité

- La longueur suit le sujet. Une pièce d'actualité tourne autour de 600 à 900
  mots, une analyse autour de 900 à 1 300. Ce sont des repères, pas des quotas.
- Les sections sont optionnelles. Un texte d'actualité se lit d'un trait, sans
  intertitre ; une analyse peut en avoir un ou deux si le sujet l'exige. Pas de
  plan imposé, pas de nombre de sections imposé.
- Le profil `editorial/style/newsroom-profile.md` et les articles complets
  fournis au rédacteur sont des références de registre : des exemples de
  construction et de rythme, pas une grille à remplir.
- Les captures du Monde et de Libération servent de témoins pour la langue
  française ; FT/SCMP et Le Monde diplomatique sont les références de registre.
- Une idée par paragraphe reste un bon repère, sans longueur imposée.
- Pas de listes à puces dans le corps si une phrase suffit.

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

## 5. Ce qui trahit un texte généré

- Le renversement de cadre (« ce n'est pas X, c'est Y », « X n'est pas Y, elle
  est Z », « non pas X mais Y ») est **banni**, pas limité : zéro occurrence,
  variantes comprises. C'est le tic qui trahit un texte généré. La forme ne se
  limite pas au verbe être : « ne rompt pas X, il déplace Y » et « ne forme pas
  tout le monde : il trie » relèvent de la même figure, comptée par le détecteur
  dès qu'une négation est reprise par une affirmative après virgule, point-virgule
  ou deux-points. Quand une négation appelle une correction, écrire
  l'affirmation directement, ou une concession vraie suivie de « mais ».
- Une question rhétorique au maximum par texte, et seulement si le texte y
  répond.

## 6. Tics mesurés

`npm run desk -- style <slug|fichier>` compare le texte à ces budgets. Ce sont
des plafonds, pas des objectifs.

| Tic | Budget | Corpus de référence |
|---|---|---|
| tiret cadratin | ≤ 6 pour 1 000 mots | 4,6 |
| « ce n'est pas X, c'est Y » et variantes | 0 | rare |
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

- [ ] Chaque chiffre a un lien vers sa source.
- [ ] Le texte se lit comme les articles de référence, sans effet de
  démonstration.
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
