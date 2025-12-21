import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: 'src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string().describe('Titre de l\'article'),
			description: z.string().describe('Description courte de l\'article'),
			// Transform string to Date object
			pubDate: z.coerce.date().describe('Date de publication'),
			updatedDate: z.coerce.date().optional().describe('Date de mise à jour'),
			author: z.string().optional().default('Benoît Huron').describe('Auteur de l\'article'),
			image: z.object({
				src: image().describe('Chemin de l\'image (relatif depuis le fichier markdown)'),
				alt: z.string().describe('Texte alternatif de l\'image'),
			}).optional().describe('Image en vedette'),
			tags: z.array(z.string()).optional().describe('Étiquettes de l\'article'),
			draft: z.boolean().optional().default(false).describe('Brouillon'),
		}),
});

export const collections = { blog };
