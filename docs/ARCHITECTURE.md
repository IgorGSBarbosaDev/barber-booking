# Arquitetura atual

## Visão geral

```text
Cliente
  ↓
Public Apps Script Web App

Barbeiro
  ↓
Admin Apps Script Web App
```

`public` e `admin` são projetos Apps Script separados, com manifests, Script IDs e deployments independentes. O monorepo apenas organiza os dois projetos no mesmo repositório.

## Estado deste setup

Cada aplicação contém somente:

- um `appsscript.json` mínimo;
- um `src/Code.gs` com `doGet()`;
- diretórios reservados para views, services, repositories e utils.

Não há regras de negócio, persistência, autenticação, autorização ou integrações implementadas.

## Integrações futuras

Quando forem definidas no PRD, ambos os Web Apps poderão utilizar serviços Google, com separação clara entre regras de negócio e acesso a dados:

```text
Public Web App ─┐
                ├─ serviços de aplicação ─ Google Sheets
Admin Web App ──┘                         ├ Google Calendar
                                          └ Gmail/MailApp
```

Essa representação é uma direção arquitetural futura, não uma implementação existente. Scopes OAuth e APIs só devem ser adicionados quando uma feature aprovada realmente precisar deles.
