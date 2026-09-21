# PRD — Sistema de Agendamento para Barbearia

**Versão:** 1.0
**Status:** Fonte da verdade do projeto
**Plataforma:** Google Apps Script
**Idioma:** pt-BR
**Moeda:** BRL
**Fuso horário:** America/Sao_Paulo

---

# 1. Visão do produto

Sistema simples de gestão e agendamento para um barbeiro autônomo.

O sistema deve:

* permitir que clientes agendem atendimentos sem conversar previamente com o barbeiro;
* organizar automaticamente disponibilidade e horários;
* permitir que o barbeiro controle sua agenda;
* sincronizar atendimentos com Google Calendar;
* manter histórico de clientes e atendimentos;
* fornecer indicadores simples sobre faturamento e serviços;
* reduzir trabalho manual;
* funcionar com custo operacional próximo de zero.

O sistema será construído sobre o ecossistema Google.

---

# 2. Princípios

### Simplicidade

O cliente deve conseguir agendar em poucos passos.

### Baixo custo

Evitar serviços pagos enquanto o volume da barbearia não justificar.

### Configurável

Horários, serviços, preços e disponibilidade não devem ficar hardcoded.

### Google como infraestrutura

Utilizar:

* Google Apps Script;
* Google Sheets;
* Google Calendar;
* Gmail/MailApp;
* HTML Service.

### Sheets é a fonte de dados

O Google Calendar NÃO será a fonte da verdade.

O Calendar será uma representação visual dos agendamentos.

A fonte oficial será a base armazenada no Google Sheets.

---

# 3. Arquitetura

```text
               CLIENTE
                  │
                  ▼
        Apps Script Web App
         Página de agendamento
                  │
                  ▼
             Google Sheets
                  │
            ┌─────┴─────┐
            ▼           ▼
     Google Calendar   E-mail


              BARBEIRO
                  │
                  ▼
        Apps Script Web App
          Painel privado
                  │
                  ▼
             Google Sheets
                  │
            ┌─────┴─────┐
            ▼           ▼
        Calendar      Dashboard
```

Devem existir dois pontos de acesso separados:

### Public App

Aplicação pública utilizada pelos clientes.

### Admin App

Aplicação privada utilizada pelo barbeiro.

Os dois utilizam a mesma base de dados.

---

# 4. Perfis

## Cliente

Não possui conta tradicional.

Identificação básica:

* nome;
* telefone;
* e-mail.

O e-mail pode ser utilizado para validação do primeiro agendamento.

## Barbeiro

Administrador do sistema.

Acesso privado utilizando a conta Google proprietária da aplicação.

---

# 5. Serviços

O barbeiro poderá cadastrar serviços.

Cada serviço contém:

```text
id
nome
descrição
duração
preço
ativo
```

Exemplos:

| Serviço             | Duração | Preço |
| ------------------- | ------: | ----: |
| Corte               |  40 min | R$ 40 |
| Barba               |  30 min | R$ 25 |
| Corte + barba       |  60 min | R$ 60 |
| Corte + sobrancelha |  50 min | R$ 50 |
| Completo            |  70 min | R$ 70 |

O barbeiro poderá:

* criar serviço;
* editar serviço;
* alterar preço;
* alterar duração;
* desativar serviço.

Serviços desativados não aparecem para novos agendamentos.

Agendamentos antigos devem manter o nome e preço originais do serviço utilizado.

---

# 6. Disponibilidade

Existem três camadas de disponibilidade.

## 6.1 Horário padrão

Representa a rotina normal.

Exemplo:

```text
Segunda  FECHADO
Terça    09:00–19:00
Quarta   09:00–19:00
Quinta   09:00–19:00
Sexta    09:00–19:00
Sábado   08:00–17:00
Domingo  FECHADO
```

## 6.2 Exceções

Permitem alterar apenas determinada data.

Exemplo:

```text
22/09 → fechado
23/09 → fechado
24/09 → 13:00–19:00
28/09 → aberto 09:00–17:00
```

Uma exceção sempre possui prioridade sobre o horário padrão.

## 6.3 Bloqueios

Permitem bloquear intervalos específicos.

Exemplo:

```text
25/09
12:00–14:00
Motivo: compromisso pessoal
```

O barbeiro poderá:

* fechar um dia;
* abrir excepcionalmente um dia;
* alterar horário de determinado dia;
* bloquear intervalos;
* excluir bloqueios.

---

# 7. Geração de horários

O sistema calcula os horários disponíveis considerando:

```text
horário padrão
+
exceções
+
bloqueios
+
agendamentos existentes
+
duração do serviço
```

Exemplo:

Serviço escolhido:

```text
Corte + Barba
60 minutos
```

O sistema somente poderá oferecer horários com pelo menos 60 minutos consecutivos disponíveis.

Não serão oferecidos horários que provoquem sobreposição.

---

# 8. Agendamento público

Fluxo:

```text
Escolher serviço
       ↓
Escolher data
       ↓
Visualizar horários disponíveis
       ↓
Escolher horário
       ↓
Informar dados
       ↓
Validar identidade quando necessário
       ↓
Confirmar
       ↓
Criar agendamento
       ↓
Criar evento no Calendar
       ↓
Enviar confirmação
```

Dados solicitados:

```text
nome
telefone
e-mail
```

O cliente não precisa criar senha.

---

# 9. Segurança e antiabuso

O sistema deve impedir que uma pessoa bloqueie toda a agenda.

## Identificação

Utilizar combinação de:

```text
e-mail
telefone
clientId
token local do navegador
```

Não utilizar IP como mecanismo principal de identificação.

## Limite de agendamentos

Configuração padrão:

```text
MAX_ACTIVE_APPOINTMENTS_PER_CLIENT = 2
```

Um cliente não poderá possuir mais de dois agendamentos futuros ativos.

Esse valor deverá ser configurável.

## Verificação

O primeiro agendamento poderá exigir código enviado por e-mail.

Código:

```text
6 dígitos
expiração curta
uso único
```

## Rate limiting básico

Bloquear temporariamente tentativas excessivas do mesmo identificador.

## Concorrência

Antes de salvar um agendamento:

```text
adquirir Lock
↓
consultar disponibilidade novamente
↓
se disponível
    criar agendamento
senão
    retornar erro
↓
liberar Lock
```

O objetivo é impedir double booking.

---

# 10. Estados de um agendamento

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED_BY_CLIENT
CANCELLED_BY_BARBER
NO_SHOW
```

Agendamentos nunca devem ser fisicamente apagados.

Alterar apenas seu status.

---

# 11. Cancelamento pelo barbeiro

No painel administrativo:

```text
Agendamento
→ Cancelar
```

O sistema deve:

```text
alterar status
liberar horário
atualizar/remover evento do Calendar
registrar data da alteração
```

O registro histórico deve permanecer.

---

# 12. Cancelamento pelo cliente

O cliente receberá um identificador seguro/token referente ao agendamento.

Através dele poderá:

```text
visualizar agendamento
cancelar
```

Remarcação poderá ser implementada como:

```text
cancelamento do horário anterior
+
novo agendamento
```

preservando a referência entre eles.

---

# 13. Google Calendar

Cada agendamento confirmado gera um evento.

Exemplo:

```text
14:00–15:00

João Silva
Corte + barba
R$ 60
```

O evento deverá armazenar alguma referência ao `appointmentId`.

A tabela de agendamentos deverá armazenar:

```text
calendarEventId
```

Alterações feitas pelo sistema deverão atualizar o Calendar.

O Sheets continuará sendo a fonte oficial.

---

# 14. Notificações

## Novo agendamento

O barbeiro recebe e-mail contendo:

```text
Novo agendamento

Cliente: João Silva
Serviço: Corte + barba
Data: 25/09
Horário: 14:00
Valor: R$ 60
```

## Cliente

Após confirmação:

```text
Agendamento confirmado

25/09 às 14:00
Corte + barba
R$ 60
```

Também deve receber link para consultar/cancelar o agendamento.

WhatsApp NÃO faz parte da V1.

---

# 15. Painel administrativo

Página inicial deve apresentar:

```text
Hoje

6 atendimentos
R$ 320 previstos
```

E a lista:

```text
09:00 João       Corte
10:00 Lucas      Corte + barba
11:30 Pedro      Barba
...
```

Cada atendimento deverá possuir ações:

```text
Concluir
Cancelar
Remarcar
Não compareceu
```

---

# 16. Dashboard

Filtros:

```text
Hoje
Esta semana
Este mês
Período personalizado
```

Indicadores:

### Atendimentos

```text
quantidade concluída
quantidade agendada
cancelamentos
no-show
```

### Financeiro

```text
faturamento
faturamento previsto
ticket médio
```

### Serviços

```text
serviço mais vendido
quantidade por serviço
receita por serviço
```

### Clientes

```text
clientes atendidos
clientes novos
clientes recorrentes
```

Gráficos básicos:

```text
faturamento ao longo do tempo
atendimentos por período
distribuição dos serviços
```

---

# 17. Financeiro

Cada atendimento deverá armazenar o preço daquele momento.

```text
servicePriceSnapshot
```

Assim, alterar o preço de um serviço posteriormente não altera o histórico.

Após concluir atendimento:

```text
paymentStatus
paymentMethod
```

Status:

```text
PENDING
PAID
```

Formas inicialmente suportadas:

```text
PIX
DINHEIRO
CARTÃO
OUTRO
```

Não haverá integração financeira automática na V1.

---

# 18. Estrutura do Google Sheets

## CLIENTS

```text
id
name
phone
email
emailVerified
createdAt
updatedAt
```

## SERVICES

```text
id
name
description
durationMinutes
price
active
createdAt
updatedAt
```

## APPOINTMENTS

```text
id
clientId
serviceId
serviceNameSnapshot
servicePriceSnapshot
date
startTime
endTime
status
paymentStatus
paymentMethod
calendarEventId
createdAt
updatedAt
cancelledAt
```

## WORK_SCHEDULE

```text
weekday
enabled
startTime
endTime
```

## SCHEDULE_OVERRIDES

```text
id
date
enabled
startTime
endTime
```

## BLOCKS

```text
id
date
startTime
endTime
reason
```

## SETTINGS

```text
key
value
```

## AUDIT_LOG

```text
id
action
entity
entityId
metadata
createdAt
```

---

# 19. Configurações

Valores que não devem ficar hardcoded:

```text
BARBER_NAME
BARBER_EMAIL
CALENDAR_ID

MAX_ACTIVE_APPOINTMENTS
BOOKING_ADVANCE_DAYS
MIN_BOOKING_ADVANCE_MINUTES

OTP_EXPIRATION_MINUTES

BUSINESS_TIMEZONE
```

Informações técnicas sensíveis devem utilizar Script Properties quando apropriado.

---

# 20. Interface pública

Telas:

```text
/
Serviços

/booking
Data e horário

/customer
Dados do cliente

/confirmation
Confirmação

/appointment
Consulta/cancelamento
```

A interface deve ser mobile-first.

O celular será considerado o dispositivo principal dos clientes.

---

# 21. Interface administrativa

Telas:

```text
Dashboard

Agenda

Atendimentos

Clientes

Serviços

Disponibilidade

Financeiro

Configurações
```

Não é necessário reproduzir um ERP completo.

Prioridade para simplicidade.

---

# 22. Requisitos de UX

O agendamento deve exigir o mínimo possível de passos.

Não exigir:

```text
senha
cadastro completo
endereço
CPF
data de nascimento
```

Feedbacks devem ser claros:

```text
Horário disponível

Horário acabou de ser reservado

Agendamento confirmado

Limite de agendamentos atingido

Código inválido

Código expirado
```

---

# 23. Requisitos técnicos

Frontend:

```text
HTML
CSS
JavaScript
Apps Script HTML Service
```

Backend:

```text
Google Apps Script
```

Persistência:

```text
Google Sheets
```

Integrações:

```text
Google Calendar
MailApp/Gmail
```

Controle de concorrência:

```text
LockService
```

Configurações:

```text
PropertiesService
```

Controle de versão:

```text
Git
```

Sincronização local:

```text
clasp
```

Não utilizar React, Next.js ou frameworks de frontend na V1.

---

# 24. Estrutura sugerida do repositório

```text
barber-booking/

README.md
PRD.md

docs/
    SETUP.md
    DEPLOYMENT.md
    DATA_MODEL.md

apps/

    public/
        appsscript.json
        src/
            Code.gs
            controllers/
            services/
            repositories/
            utils/
            views/

    admin/
        appsscript.json
        src/
            Code.gs
            controllers/
            services/
            repositories/
            utils/
            views/

shared/
    constants/
    documentation/
```

Public e Admin são dois projetos Apps Script diferentes.

Eles acessam os mesmos recursos:

```text
Google Sheets
Google Calendar
```

---

# 25. Fora do escopo da V1

Não implementar inicialmente:

```text
WhatsApp automático
pagamento online
assinaturas
programa de fidelidade
estoque
vários barbeiros
várias unidades
aplicativo Android/iOS
login de clientes com senha
marketplace
integrações financeiras
```

Essas funcionalidades podem fazer parte de versões futuras.

---

# 26. Segurança administrativa

O painel administrativo não deve utilizar a URL pública utilizada pelos clientes.

Utilizar projeto/deployment separado.

A aplicação administrativa deve ficar restrita à conta Google responsável pela barbearia.

A aplicação pública poderá executar utilizando a conta proprietária do projeto para acessar Sheets e Calendar.

---

# 27. Logs

Registrar ações importantes:

```text
BOOKING_CREATED
BOOKING_CANCELLED
BOOKING_COMPLETED
NO_SHOW
SERVICE_CREATED
SERVICE_UPDATED
SCHEDULE_CHANGED
BLOCK_CREATED
```

Erros técnicos relevantes também devem ser registrados.

---

# 28. Critérios de sucesso do MVP

O MVP está concluído quando for possível realizar todo o fluxo:

```text
Barbeiro cadastra serviço
↓
Barbeiro configura disponibilidade
↓
Cliente entra no link
↓
Cliente escolhe serviço
↓
Cliente visualiza horários
↓
Cliente agenda
↓
Sistema impede conflito
↓
Registro é salvo
↓
Calendar recebe evento
↓
Barbeiro recebe notificação
↓
Agendamento aparece no painel
↓
Barbeiro conclui atendimento
↓
Dashboard é atualizado
```

Sem intervenção manual na agenda.

---

# 29. Ordem de desenvolvimento

## Fase 1 — Fundação

Configurar:

```text
repositório
clasp
Apps Script
Sheets
Calendar
Script Properties
```

## Fase 2 — Banco

Criar:

```text
CLIENTS
SERVICES
APPOINTMENTS
WORK_SCHEDULE
SCHEDULE_OVERRIDES
BLOCKS
SETTINGS
AUDIT_LOG
```

## Fase 3 — Serviços e agenda

Implementar:

```text
CRUD de serviços
horário padrão
exceções
bloqueios
geração de disponibilidade
```

## Fase 4 — Booking

Implementar:

```text
cliente
agendamento
LockService
limites
validação
Calendar
```

## Fase 5 — Admin

Implementar:

```text
agenda
cancelamento
conclusão
no-show
clientes
serviços
disponibilidade
```

## Fase 6 — Dashboard

Implementar métricas e gráficos.

## Fase 7 — Notificações

Implementar:

```text
confirmação
cancelamento
notificação ao barbeiro
```

## Fase 8 — Segurança

Implementar:

```text
OTP
rate limiting
tokens
logs
validação dos endpoints
```

## Fase 9 — Produção

Executar:

```text
testes
deploy
permissões
documentação
backup
```

---

# 30. Regra para agentes de desenvolvimento

Todo agente ou desenvolvedor trabalhando neste projeto deve utilizar este PRD como fonte da verdade.

Antes de implementar uma funcionalidade:

1. verificar se está definida neste PRD;
2. respeitar regras de negócio existentes;
3. evitar adicionar complexidade sem necessidade;
4. não alterar arquitetura sem justificar;
5. manter compatibilidade com Google Apps Script;
6. priorizar simplicidade e custo zero.

Caso código e PRD entrem em conflito, o PRD possui prioridade até que seja oficialmente atualizado.
