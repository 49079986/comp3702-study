# COMP3702 AI Study Studio

网站 / Website: https://49079986.github.io/comp3702-study/

中英复习资料、15 个专题、10 个算法实验、75 道单选、24 道书面题、两套自编模拟卷，以及 8 节 A3 动手课。包含像素进入转场、课节淡入和可记忆的转场开关。

Bilingual study notes, interactive algorithms, practice and an eight-lesson A3 learning unit. The site works as static HTML/JavaScript; progress is stored in the current browser.

This is a personal, AI-assisted learning resource, not an official course answer. Original course PDFs, submitted reports, personal identifiers and local caches are excluded from the public edition. See `docs/publication.html` for scope.

GitHub Pages serves `docs/` from `main`. Pushing updates to `main` republishes the site. The validation workflow checks links, algorithms, bilingual content, A3 numerical fixtures and motion fallbacks.

Local validation: `python scripts/validate_public_site.py`, followed by the Node scripts in `.github/workflows/validate.yml`.
