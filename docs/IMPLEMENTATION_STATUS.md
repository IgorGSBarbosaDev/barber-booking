# Status da implementação

## Implementado no repositório

- Dois projetos Apps Script independentes: Public e Admin.
- Schema automático da base Google Sheets, incluindo abas funcionais e técnicas.
- Configurações padrão e inicialização da base.
- CRUD administrativo de serviços, com ativação/desativação e snapshots.
- Horário padrão, exceções por data e bloqueios de intervalos.
- Cálculo de disponibilidade por duração, conflitos e antecedência.
- Booking público com cliente, limite de agendamentos e LockService.
- Estados de agendamento, cancelamento, remarcação, conclusão e no-show.
- Token seguro para consulta/cancelamento/remarcação pelo cliente.
- OTP de e-mail com expiração, uso único e tentativas limitadas.
- Rate limiting básico por identificador.
- Sincronização de eventos com Google Calendar.
- Notificações por MailApp para cliente e barbeiro.
- Painel administrativo com dashboard, agenda, clientes, serviços, disponibilidade, financeiro e configurações.
- Auditoria de ações e registro de falhas técnicas relevantes.
- Validação local sem credenciais com npm test.

## Não executado neste ambiente

Estas etapas exigem conta Google, Script IDs reais, autorização OAuth ou ação no editor/deployment:

1. executar npx clasp login;
2. criar ou vincular os dois projetos Apps Script;
3. configurar os dois arquivos locais .clasp.json;
4. executar push:public e push:admin;
5. autorizar Sheets, Calendar, MailApp e identidade da conta;
6. inicializar a Spreadsheet real e configurar os Script Properties nos dois projetos;
7. criar deployments dos Web Apps;
8. abrir as URLs e validar o fluxo contra serviços Google reais.

O código deixa essas etapas documentadas em SETUP.md e DEPLOYMENT.md. Nenhum Script ID, token, credencial ou deployment fictício foi criado.
