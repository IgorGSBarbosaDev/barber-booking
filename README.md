# Barber Booking

Estrutura inicial de um sistema de agendamento para uma barbearia. Este repositório prepara o ambiente local e a organização para duas aplicações Google Apps Script, sem implementar regras de negócio neste momento.

## Stack

- Google Apps Script e HTML Service;
- Google Sheets e Google Calendar como integrações futuras;
- Node.js e npm para o desenvolvimento local;
- `clasp` para sincronizar cada projeto Apps Script;
- Git para versionamento.

## Arquitetura

O monorepo contém dois Web Apps independentes:

- `apps/public`: aplicação voltada aos clientes;
- `apps/admin`: aplicação voltada ao barbeiro.

Ambos começam apenas com um `doGet()` mínimo. Sheets, Calendar, Gmail/MailApp, persistência, autenticação e funcionalidades de negócio ainda não foram implementados.

## Estrutura de diretórios

```text
apps/public/   Projeto Apps Script do Web App público
apps/admin/    Projeto Apps Script do Web App administrativo
docs/          Documentação de setup, deploy e arquitetura
shared/        Espaço para contratos, constantes e documentação compartilhada
scripts/       Scripts auxiliares locais
```

## Pré-requisitos

É necessário ter Git, Node.js, npm e acesso a uma conta Google autorizada a usar Apps Script. O `clasp` é instalado localmente como dependência de desenvolvimento.

## Instalação

```bash
npm install
```

Consulte [docs/SETUP.md](docs/SETUP.md) para reproduzir o ambiente em outro computador.

## Autenticação e configuração do clasp

Depois de instalar as dependências, autentique o `clasp`:

```bash
npx clasp login
```

O login abre o fluxo oficial do Google e grava credenciais fora deste repositório. Os dois projetos Apps Script ainda precisam ser criados ou vinculados manualmente; os Script IDs reais devem ser colocados nos arquivos locais `apps/public/.clasp.json` e `apps/admin/.clasp.json`, que são ignorados pelo Git. Veja [docs/SETUP.md](docs/SETUP.md).

## Comandos por aplicação

Após configurar o Script ID correspondente em cada aplicação:

```bash
npm run status:public
npm run push:public
npm run pull:public

npm run status:admin
npm run push:admin
npm run pull:admin
```

Os comandos usam `-P` para apontar o `clasp` para o diretório correto e manter as configurações dos dois projetos separadas.

## Deploy futuro

O deploy não foi executado. Quando a primeira versão estiver pronta, siga [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para publicar o Web App público e o Web App administrativo separadamente.

## Regras para agentes

As regras de trabalho do repositório estão em [AGENTS.md](AGENTS.md). O [PRD.md](PRD.md) permanece reservado para o PRD oficial, que será inserido manualmente.
