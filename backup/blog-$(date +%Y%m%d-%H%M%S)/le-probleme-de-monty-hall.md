---
title: Le problème de Monty Hall
description: ""
pubDate: 2024-02-19T14:36:06.000Z
updatedDate: 2025-08-04T15:53:17.000Z
author: Benoît Huron
draft: false
tags:
  - Culture
  - Loisir
image:
  src: ../../assets/ghost-images/dall-e-2023-08-01-10.30.40-a-photo-realistic-image-of-a-man-in-a-suit-standing-in-front-of-three-doors.-the-doors-are-numbered-1-2-and-3-and-are-wooden-and-closed.-the-man-is.png
  alt: Le problème de Monty Hall
---

Le [problème de Monty Hall](https://fr.wikipedia.org/wiki/Probl%C3%A8me_de_Monty_Hall) est un problème probabiliste inspiré du jeu télévisé américain « Let's Make a Deal » et prend son nom du présentateur de l'émission. Les règles du jeu sont simples.

Monty Hall, le présentateur, montre au candidat trois portes. Parmi elles, deux portes ouvrent sur une chèvre ou un truc bidon comme ça. La dernière porte en revanche ouvre sur une voiture. L’objectif est bien sûr de deviner derrière quelle porte se trouve la voiture – si on ne se trompe pas, on repart avec. 😁

Supposons qu’on choisisse la porte 1. Avant de l’ouvrir, le présentateur ouvre alors la porte 3 derrière laquelle se trouve une chèvre. Monty offre ensuite un choix au candidat – persister dans son choix initial (porte 1) ou choisir l’autre porte encore fermée (porte 2).

C’est très bien expliqué dans un épisode d’une série militaire coréenne (c’est cet épisode – entièrement consacré au problème – qui a motivé cet article).

Quelle est la meilleure stratégie pour maximiser ses chances de remporter la voiture – persister ou changer ?

Pour répondre à cette question on suppose que le présentateur

1.  ouvre toujours une porte et permet ensuite au candidat de changer d’avis ;
2.  n’ouvre jamais la porte choisie par le candidat ou la porte avec la voiture ;
3.  si notre choix initial est la porte avec la voiture, Monty ouvre une des deux autres portes au hasard.

Si on accepte ces suppositions, il est préférable de changer d’avis. Si on persiste dans son choix initial, nos chances de gagner sont de \\(1/3\\). Si on change d’avis, elles montent à \\(2/3\\).

Ça peut surprendre. Après tout, quelle importance si on persiste ou change ? « Il reste deux portes, c'est donc du \\(50/50\\) », nous hurle notre intuition. Pour comprendre pourquoi c'est faux, on peut utiliser le [théorème](https://fr.wikipedia.org/wiki/Th%C3%A9or%C3%A8me_de_Bayes) de Bayes, l'un des principaux théorèmes de la théorie des probabilités.

## Le théorème de Bayes

On peut voir le théorème de Bayes comme un moyen de mettre à jour la probabilité d'une hypothèse \\(H\\) quand elle est confontrée à un nouveau corpus de données \\(D\\).

$$ P(H|D) = \\frac{P(H)~P(D|H)}{P(D)} $$

Dans cette interprétatin, chaque terme a un nom :

*   \\(P(H)\\) est la probabilité de l'hypothèse avant qu'on reçoive les nouvelles données. C'est la probabilité a priori ou *prior*.
*   \\(P(H|D)\\) est la probabilité de l'hypothèse après qu'elle a été confrontée aux nouvelles données. C'est la probabilité a posteriori ou *posterior*.
*   \\(P(D|H)\\) est la probabilité de nos données si on accepte l'hypothèse \\(H\\), la *vraisemblance*.
*   \\(P(D)\\) est la probabilité totale des données dans tous les cas de figure.

La procédure consistant à utiliser de nouvelles données et la probabilité a priori pour calculer une probabilité a posteriori est *l'inférence bayésienne*. La suite de l'article applique le théorème au problème de Monty Hall.