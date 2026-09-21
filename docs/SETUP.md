# Setup do ambiente

Este documento descreve como reproduzir o ambiente local e conectar os dois projetos Apps Script sem colocar credenciais no Git.

## AUTOMÁTICO — arquivos e dependências locais

### 1. Git

Clone o repositório e entre nele:

```bash
git clone <URL-DO-REPOSITORIO> ~/Documents/projects/barber-booking
cd ~/Documents/projects/barber-booking
```

Se o repositório já estiver disponível localmente, apenas entre no diretório do projeto.

### 2. Node.js e npm

Verifique as ferramentas:

```bash
git --version
node --version
npm --version
```

Instale uma versão LTS do Node.js caso Node ou npm não estejam disponíveis. O método de instalação depende do sistema operacional; não é necessário instalar Node dentro do repositório.

### 3. clasp

O projeto declara `@google/clasp` como dependência de desenvolvimento. Instale as dependências:

```bash
npm install
```

Confirme a versão local:

```bash
npm run version:clasp
```

Não é necessário instalar `clasp` globalmente. Se preferir uma instalação global, use o gerenciador de pacotes do seu sistema e não versione arquivos de credenciais.

### 4. Estrutura e validação local

Confirme que a estrutura está presente:

```bash
find apps docs shared scripts -maxdepth 3 -type f | sort
git status
npm test
```

## AÇÃO MANUAL NO GOOGLE — autenticação

Execute o login oficial:

```bash
npx clasp login
```

Conclua a autorização no navegador. Não tente automatizar, contornar ou versionar esse login. O arquivo de credenciais do `clasp` fica fora do repositório.

Depois, confira o usuário autorizado:

```bash
npx clasp show-authorized-user
```

Se a conta exigir consentimento, permissões adicionais ou políticas organizacionais, conclua essas etapas manualmente no Google.

## AÇÃO MANUAL NO GOOGLE — criar ou selecionar os projetos Apps Script

São necessários dois projetos Apps Script independentes:

1. um para `apps/public`;
2. um para `apps/admin`.

Eles podem ser criados no editor do Google Apps Script ou pela CLI autenticada. Pela CLI, confirme primeiro as opções disponíveis na versão instalada:

```bash
npx clasp create --help
```

Uma criação standalone pela CLI pode ser feita a partir da raiz do repositório, usando o diretório raiz de cada app:

```bash
npx clasp create --type standalone --title "Barber Booking Public" --rootDir apps/public
npx clasp create --type standalone --title "Barber Booking Admin" --rootDir apps/admin
```

Se a versão instalada não aceitar algum argumento, use o editor do Google Apps Script e depois vincule cada Script ID conforme descrito abaixo. Não substitua os manifests existentes por valores inventados.

## AÇÃO MANUAL NO GOOGLE — configurar os Script IDs locais

Cada app precisa de seu próprio `.clasp.json`, não versionado. Depois de obter os IDs reais, crie:

`apps/public/.clasp.json`

```json
{
  "scriptId": "SCRIPT_ID_REAL_DO_PUBLIC",
  "rootDir": "."
}
```

`apps/admin/.clasp.json`

```json
{
  "scriptId": "SCRIPT_ID_REAL_DO_ADMIN",
  "rootDir": "."
}
```

Os nomes acima são placeholders de documentação; substitua-os pelos IDs reais. Os arquivos são protegidos pelo `.gitignore` e não devem ser adicionados ao Git.

Se `clasp create` já tiver gerado o `.clasp.json` no diretório correto, apenas revise o conteúdo e não crie outro arquivo desnecessariamente.

## AÇÃO MANUAL NO GOOGLE — inicializar a base

Depois de vincular o Admin App a um Script ID real, abra o Web App administrativo e use o botão de inicialização, ou execute a função setupBarberBooking no editor do Apps Script com a conta proprietária. A inicialização:

- cria ou abre a Spreadsheet configurada;
- cria as abas CLIENTS, SERVICES, APPOINTMENTS, WORK_SCHEDULE, SCHEDULE_OVERRIDES, BLOCKS, SETTINGS, AUDIT_LOG e OTP_CODES;
- grava os valores padrão;
- cria o horário padrão descrito no PRD;
- gera o segredo interno no Script Properties;
- registra o administrador atual e usa o Calendar primary por padrão.

Depois de inicializar o Admin App, copie o mesmo Spreadsheet ID para o Script Property SPREADSHEET_ID do Public App. O CALENDAR_ID e ADMIN_EMAIL devem ser configurados nos Script Properties correspondentes; nunca os coloque no Git.

No editor Apps Script, use **Project Settings > Script properties**. Configure:

- Admin App: SPREADSHEET_ID, CALENDAR_ID, ADMIN_EMAIL e APP_SECRET (APP_SECRET pode ser gerado automaticamente pela inicialização);
- Public App: SPREADSHEET_ID e CALENDAR_ID.

Não copie o arquivo .clasp.json para o Git e não compartilhe APP_SECRET.

## AUTOMÁTICO — sincronizar os apps

O primeiro push pode solicitar autorização dos scopes de Sheets, Calendar, MailApp e identidade da conta. Essa autorização é uma ação manual no Google.

Com cada `.clasp.json` configurado:

```bash
npm run status:public
npm run push:public

npm run status:admin
npm run push:admin
```

Para trazer alterações feitas no editor Apps Script para o repositório local:

```bash
npm run pull:public
npm run pull:admin
```

## AÇÃO MANUAL NO GOOGLE — testar

O teste inicial deve ser feito somente depois do push:

1. abra o projeto correspondente no Google Apps Script;
2. confirme que o arquivo `appsscript.json` e `src/Code.gs` estão presentes;
3. crie um deployment de teste pelo menu **Deploy** quando quiser validar o Web App;
4. abra a URL gerada e confirme a resposta textual do `doGet()`.

O fluxo detalhado de deployment está em [DEPLOYMENT.md](DEPLOYMENT.md). Nenhum deployment é criado por este setup.
