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

## Estado atual

Cada aplicação contém:

- um `appsscript.json` com os scopes necessários;
- controladores, serviços, repositórios e views HTML Service;
- a mesma implementação de domínio, duplicada por serem projetos Apps Script independentes;
- setup de Sheets, Calendar, MailApp, LockService, PropertiesService, OTP, tokens e logs.

O public expõe somente operações de cliente. O admin aplica autorização por conta Google e expõe operações administrativas.

## Integrações implementadas

As integrações previstas no PRD estão implementadas com separação entre regras de negócio e acesso a dados:

```text
Public Web App ─┐
                ├─ serviços de aplicação ─ Google Sheets
Admin Web App ──┘                         ├ Google Calendar
                                          └ Gmail/MailApp
```

O Google Sheets é a fonte oficial; Calendar é sincronização visual, e MailApp envia notificações. WhatsApp, pagamentos online e integrações financeiras continuam fora da V1.
