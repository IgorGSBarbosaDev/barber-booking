# Instruções para agentes

- `PRD.md` é a fonte da verdade funcional do projeto.
- Antes de implementar qualquer feature, consultar o PRD e confirmar o escopo descrito nele.
- Não inventar features, fluxos, regras de negócio ou integrações não especificadas.
- Manter compatibilidade com Google Apps Script, HTML Service e `clasp`.
- Evitar dependências desnecessárias.
- Priorizar simplicidade e custo zero sempre que isso for compatível com o PRD.
- Nunca colocar segredos, tokens, credenciais ou configurações locais sensíveis no código versionado.
- Evitar overengineering e mudanças prematuras de infraestrutura.
- Separar regras de negócio do acesso a Google Sheets e Google Calendar.
- Manter o código modular, com responsabilidades bem delimitadas.
- Documentar decisões arquiteturais importantes.
- Não alterar a arquitetura principal sem justificativa registrada.
- Preferir funções pequenas e nomes claros.
- Preservar a compatibilidade com `clasp` e com os dois projetos Apps Script independentes.
- Validar `git status` antes de concluir mudanças e revisar arquivos que possam conter dados locais.
