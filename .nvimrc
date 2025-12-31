" Configuration Vim/Neovim pour le blog libéralisme-démocratique
" Ce fichier est automatiquement chargé quand vous éditez des fichiers dans ce projet

" =============================================================================
" Configuration de base pour le français
" =============================================================================
set spelllang=fr
set spell
set encoding=utf-8
set fileencoding=utf-8

" =============================================================================
" Thème confortable pour la rédaction
" =============================================================================
silent! colorscheme gruvbox
" Gruvbox fallback si dispo
if exists("&termguicolors")
  set termguicolors
endif

" =============================================================================
" Treesitter pour MDX (Neovim seulement)
" =============================================================================
if has('nvim')
  lua << EOF
require'nvim-treesitter.configs'.setup {
  highlight = {
    enable = true,
    additional_vim_regex_highlighting = false,
  },
  indent = {
    enable = true,
  },
}
EOF
endif

" =============================================================================
" Configuration pour Markdown/MDX
" =============================================================================
set filetype=markdown

" Largeur de texte à 80 caractères pour les paragraphes
set textwidth=80
set formatoptions+=t

" Meilleur pliage des sections
set foldmethod=expr
set foldexpr=nvim_treesitter#foldexpr()
set foldlevel=1

" =============================================================================
" Raccourcis personnalisés
" =============================================================================
" Toggle spell check avec ,s
nnoremap <silent> <Leader>s :set spell!<CR>

" Navigation entre paragraphes
nnoremap <silent> <A-j> }
nnoremap <silent> <A-k> {

" Insérer un saut de ligne sans rompre le paragraphe courant
nnoremap <silent> <Leader>o m`o<Esc>``
inoremap <silent> <C-o> <Esc>m`o<Esc>``a

" Formatage du paragraphe courant
nnoremap <silent> <Leader>q gqap
vnoremap <silent> <Leader>q gq

" =============================================================================
" Correction orthographique
" =============================================================================
" Correction du mot précédent en mode insert
inoremap <C-l> <C-g>u<Esc>[s1z=`]a<C-g>u

" Suggestion de correction en mode normal
nnoremap <Leader>z [s1z=<C-a>

" =============================================================================
" Aide à la rédaction
" =============================================================================
" Insérer un template d'article de blog
nnoremap <Leader>nt :read ./scripts/article-template.md<CR>

" Compter les mots du fichier
nnoremap <Leader>wc :w !wc -w<CR>

" =============================================================================
" Syntaxe MDX et composants
" =============================================================================
" Activer le highlighting pour les composants Astro
syntax match astroComponent /<YoutubeEmbed\/>/
syntax match astroComponent /<YoutubeEmbed[^>]*>/

" Highlighting pour les frontmatter
syntax region yamlFrontmatter start=/\%^---$/ end=/^---$/

" =============================================================================
" Commandes personnalisées
" =============================================================================
" Commande pour prévisualiser l'article (Markdown Preview pour Neovim)
if has('nvim')
  command! MarkdownPreviewToggle MarkdownPreview
endif

" Commande pour lancer le serveur de développement
command! DevServer !npm run dev &

" Commande pour vérifier la syntaxe frontmatter
command! CheckFrontmatter !npm run format:articles:dry-run

" =============================================================================
" Notes rapides
" =============================================================================
" Correction orthographique :
" - ]s / [s : aller au mot suivant/précédent mal orthographié
" - zg : ajouter le mot au dictionnaire
" - zug : défaire l'ajout du mot
" - z= : suggestions de correction
"
" Formatage :
" - gqap : reformater le paragraphe actuel
" - za : plier/déplier la section actuelle
"
" Prévisualisation (Neovim seulement) :
" - :MarkdownPreview ou :MarkdownPreviewToggle
" - :DevServer : lancer le serveur de développement
"
" Vérification :
" - :CheckFrontmatter : vérifier la syntaxe frontmatter
