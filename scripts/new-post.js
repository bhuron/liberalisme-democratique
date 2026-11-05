#!/usr/bin/env node

/**
 * Script pour créer un nouvel article de blog avec un template pré-rempli
 *
 * Usage: npm run new "Titre de l'article"
 *
 * Le script va:
 * - Générer un slug à partir du titre
 * - Créer un fichier MDX dans src/content/blog/
 * - Pré-remplir le frontmatter et les imports utiles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BLOG_DIR = path.join(__dirname, '../src/content/blog');

/**
 * Convertit un texte en slug URL-friendly
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Sépare les accents des caractères
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[\s_]+/g, '-') // Remplace espaces et underscores par des tirets
    .replace(/[^\w\-]+/g, '') // Supprime les caractères non-alphanumériques
    .replace(/\-\-+/g, '-') // Remplace les tirets multiples par un seul
    .replace(/^-+/, '') // Supprime les tirets au début
    .replace(/-+$/, ''); // Supprime les tirets à la fin
}

/**
 * Formate la date actuelle au format ISO (YYYY-MM-DD), dans le fuseau de Paris
 */
function getCurrentDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * Génère le template MDX
 */
function generateTemplate(title) {
  const date = getCurrentDate();

  return `---
title: ${JSON.stringify(title)}
description: ""
pubDate: ${date}
author: Benoît Huron
draft: true
# image:
#   src: ../../assets/
#   alt:
# tags:
#   - Tag1
#   - Tag2
---

import { Image } from "astro:assets";

Écrire l'introduction de l'article ici...

## Section 1

Contenu de la première section...

### Sous-section

Détails supplémentaires...

## Section 2

{/* Pour insérer une image locale (Image est déjà importé ci-dessus) :
import imageNom from "../../assets/mon-image.webp";

<Image src={imageNom} alt="Description de l'image" class="rounded-xl shadow-lg my-8 mx-auto" />
*/}

{/* Pour insérer une vidéo YouTube, importer le composant :
import YoutubeEmbed from "../../components/YoutubeEmbed.astro";

<YoutubeEmbed url="https://youtu.be/..." title="Titre de la vidéo" />
*/}

{/* Pour insérer une image avec légende, importer le composant :
import Figure from "../../components/Figure.astro";

<Figure src={imageNom} alt="Description de l'image" caption="Légende de l'image. Source : Insee." />
*/}

## Conclusion

Conclusion de l'article...

`;
}

/**
 * Main
 */
function main() {
  // Récupérer le titre depuis les arguments
  const title = process.argv.slice(2)[0];

  if (!title) {
    console.error("❌ Erreur: Veuillez fournir un titre pour l'article");
    console.log('Usage: npm run new "Titre de l\'article"');
    process.exit(1);
  }

  // Générer le slug
  const slug = slugify(title);
  const filename = `${slug}.mdx`;
  const filepath = path.join(BLOG_DIR, filename);

  // Vérifier si le fichier existe déjà
  if (fs.existsSync(filepath)) {
    console.error(`❌ Erreur: L'article "${filename}" existe déjà`);
    process.exit(1);
  }

  // Générer le template
  const template = generateTemplate(title);

  // Créer le fichier
  fs.writeFileSync(filepath, template, 'utf-8');

  console.log(`✅ Article créé: ${filename}`);
  console.log(`📂 Chemin: ${filepath}`);
  console.log(`📝 Slug: ${slug}`);
  console.log('');
  console.log('Prochaines étapes:');
  console.log('1. Remplir la description');
  console.log('2. Ajouter les tags appropriés');
  console.log('3. Ajouter une image si nécessaire');
  console.log('4. Écrire le contenu');
  console.log('5. Changer draft: false quand prêt à publier');
}

main();
