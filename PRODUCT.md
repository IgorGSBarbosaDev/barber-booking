# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Google Apps Script HTML Service with plain HTML, CSS, and JavaScript; no frontend framework in V1 to preserve clasp and deployment simplicity.

## Users

- Cliente da barbearia, normalmente no celular, que precisa escolher um serviço, encontrar um horário e concluir um agendamento sem conversar previamente com o barbeiro.
- Barbeiro autônomo, em acesso administrativo privado, que precisa operar agenda, serviços, disponibilidade, clientes, financeiro e configurações.

## Product Purpose

Sistema simples de agendamento e gestão para uma barbearia autônoma. O produto deve reduzir trabalho manual, permitir agendamento online em poucos passos, organizar a disponibilidade, manter histórico de clientes e atendimentos e oferecer indicadores básicos de operação.

## Positioning

O produto combina uma experiência pública curta de agendamento com uma operação administrativa privada, usando Google Sheets como fonte oficial e Google Calendar como representação visual dos compromissos. O posicionamento além disso permanece aberto.

## Operating Context

- Existem dois Web Apps Apps Script independentes: `public` para clientes e `admin` para o barbeiro.
- O fluxo público não possui senha de cliente; pode usar identificação por e-mail, telefone, clientId, token local e verificação OTP quando configurada.
- O painel administrativo é restrito à conta Google responsável pela aplicação.
- Google Sheets é a fonte oficial; Calendar sincroniza eventos e MailApp envia notificações.
- O idioma do produto é pt-BR, a moeda é BRL e o fuso é `America/Sao_Paulo`.

## Capabilities and Constraints

- Fluxo público: serviços, data/horário, dados do cliente, confirmação e consulta/cancelamento/remarcação.
- Fluxo administrativo: dashboard, agenda, atendimentos, clientes, serviços, disponibilidade, financeiro e configurações.
- Serviços, horários padrão, exceções, bloqueios e configurações são editáveis e não devem ficar hardcoded.
- Estados de agendamento incluem PENDING, CONFIRMED, COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_BARBER e NO_SHOW.
- A V1 não inclui WhatsApp automático, pagamento online, múltiplos barbeiros/unidades, aplicativo nativo, login com senha ou integrações financeiras.
- O frontend deve permanecer compatível com Google Apps Script HTML Service e `google.script.run`, sem React, Next.js ou dependências frontend desnecessárias.
- As regras funcionais do projeto são definidas em `docs/PRD.md` e não devem ser alteradas durante o trabalho visual.

## Brand Commitments

- Nome de trabalho do produto: Barber Booking.
- Interface em pt-BR.
- O briefing exige qualidade visual próxima à linguagem de shadcn/ui, reproduzida com HTML/CSS/JavaScript sem instalar shadcn/ui diretamente.
- Não há logo, paleta ou fonte proprietária fornecida no repositório; não inventar claims comerciais, depoimentos ou provas de marca.

## Evidence on Hand

- `docs/PRD.md` é a fonte de verdade funcional.
- `apps/public/src/views/PublicApp.html` e `apps/admin/src/views/AdminApp.html` são as implementações visuais atuais.
- Os controladores Apps Script expõem os métodos usados pelas views atuais.
- Não foram encontrados assets visuais de marca no repositório.

## Product Principles

- Agendamento público com o mínimo possível de passos.
- Operação administrativa clara e rápida de escanear.
- Configurabilidade sem hardcode de dados operacionais.
- Google como infraestrutura de baixo custo.
- Histórico e fonte oficial preservados no Sheets.

## Accessibility & Inclusion

O briefing exige contraste adequado, `focus-visible`, labels, `aria-label` quando necessário, controles acessíveis, navegação por teclado e áreas clicáveis razoáveis. A experiência pública deve priorizar telas móveis.
