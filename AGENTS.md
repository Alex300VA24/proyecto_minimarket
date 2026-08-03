# Instrucciones para agentes

Este proyecto mantiene sus skills en dos ubicaciones que utilizan los agentes:

- Codex: `.agents/skills/<nombre>/SKILL.md`
- OpenCode: `.opencode/skills/<nombre>/SKILL.md`

Al crear o modificar una skill de proyecto, conserve el mismo directorio y el
archivo `SKILL.md` en ambas ubicaciones. Cada `SKILL.md` debe comenzar con
front matter YAML que incluya `name` y `description`.

No agregue `node_modules`, bloqueos de dependencias ni paquetes dentro de
`.opencode` salvo que el proyecto incorpore un plugin local con código propio.
Las dependencias del proyecto deben vivir en su gestor de paquetes principal.
