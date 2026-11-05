# Libéralisme Démocratique

Blog politique et social francophone, publié sur
[liberalisme-democratique.uk](https://liberalisme-democratique.uk).

## Stack

- [Astro](https://astro.build/) 7 — génération statique
- TypeScript
- Tailwind CSS 4 + `@tailwindcss/typography`
- MDX pour les articles, avec le processeur `unified` pour les plugins remark/rehype
- `remark-math` + `rehype-katex` pour les formules LaTeX
- `sharp` pour l'optimisation des images
- `@astrojs/rss` et `@astrojs/sitemap`

## Démarrage

Le développement et la CI utilisent Node.js 26.13.0 (voir `.nvmrc`). Le minimum déclaré reste 22.23.4 (`engines`) :

```bash
fnm use        # ou nvm use
npm ci
npm run dev
```

Le site local est disponible sur `http://localhost:4321`.

## Commandes

| Commande                  | Action                                                 |
| :------------------------ | :----------------------------------------------------- |
| `npm run dev`             | Serveur de développement                               |
| `npm run build`           | Build de production dans `dist/`                       |
| `npm run preview`         | Prévisualise le build local                            |
| `npm run check`           | Vérifie les types avec `astro check`                   |
| `npm run format`          | Formate le code avec Prettier                          |
| `npm run format:check`    | Vérifie le formatage sans modifier les fichiers        |
| `npm run new "Titre"`     | Crée un nouvel article MDX brouillon                   |
| `npm run astro ...`       | Commandes Astro (ex. `npm run astro add`)              |

## Écrire un article

```bash
npm run new "Titre de l'article"
```

Le script crée `src/content/blog/<slug>.mdx` avec `draft: true`. Un article en
brouillon n'est **ni construit, ni inclus dans le RSS ou le sitemap** : il faut
passer `draft: false` pour le publier.

Le frontmatter est validé par `src/content.config.ts` :

```yaml
---
title: "Titre"
description: "Résumé de l'article"
pubDate: 2026-01-31
updatedDate: 2026-02-01 # optionnel
author: Benoît Huron # optionnel, valeur par défaut
image:
  src: ../../assets/mon-image.webp
  alt: "Description de l'image"
tags:
  - Économie
draft: false
---
```

Les images sont stockées dans `src/assets/` et référencées depuis un article
avec un chemin relatif (`../../assets/...`). Les composants MDX disponibles
incluent `Image` (`astro:assets`), `Figure` et `YoutubeEmbed` :

```mdx
import Figure from '../../components/Figure.astro';
import image from '../../assets/mon-image.webp';

<Figure src={image} alt="Description" caption="Légende. Source : Insee." />
```

## Structure

```text
src/
  assets/          Images locales optimisées par Astro
  components/      Composants Astro réutilisables
  content/blog/    Articles (.md, .mdx)
  layouts/         Layouts de page
  pages/           Routes (accueil, blog, tags, RSS, 404)
  styles/          CSS global et thème Tailwind
scripts/           Scripts de contenu et de migration
public/            Fichiers statiques (favicons, robots.txt)
```

## Qualité

La CI GitHub Actions exécute `npm ci`, `npm run format:check`,
`npm run check` et `npm run build` à chaque push sur `master` et sur les
pull requests.

Prettier est configuré pour le code (`.astro`, JS/TS, CSS, JSON, YAML). Les
articles (`src/content/`) et les fichiers Markdown de documentation sont
volontairement exclus pour préserver la mise en forme éditoriale.

## Déploiement

Le site est déployé sur **Cloudflare Pages**. Un push sur `master` déclenche un
build avec `npm run build` ; le dossier publié est `dist/`.

## Migration Ghost (héritage)

Les scripts `import:ghost`, `export:ghost` et `images:download` servent à la
migration initiale depuis Ghost. Ils ne sont pas utilisés par le build.
`ghost-export.json` et `ghost-import.json` contiennent des données sensibles et
sont ignorés par Git ; ne les commitez jamais.
