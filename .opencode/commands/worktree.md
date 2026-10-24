---
description: Crea un git worktree en .worktrees/<nombre>
---

Crea un worktree de git en este repositorio.

- Nombre: si se indicó `$ARGUMENTS`, úsalo tal cual. Si no, derívalo del contexto
  de la conversación: 2-4 palabras, kebab-case, solo `a-z0-9-`.
- Ejecuta un único comando: `git worktree add .worktrees/<nombre>`
- No hagas nada más: no cambies de directorio, no instales dependencias, no
  edites archivos, no hagas commits.
- Responde solo con la ruta creada y la rama.
- Si los argumentos son muy largos, simplificalos a un nombre significativo.
