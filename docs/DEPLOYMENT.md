# Deployment

O deployment de produção não foi executado neste setup. Os Web Apps devem ser publicados separadamente, cada um usando seu próprio Script ID e projeto Apps Script.

Antes do deployment, execute a inicialização da base descrita em SETUP.md, rode npm test e confirme que os Script Properties não contêm placeholders.

## Public Web App

1. Confirme o Script ID em `apps/public/.clasp.json`.
2. Execute `npm run push:public`.
3. Abra o projeto `public` no Google Apps Script.
4. Use **Deploy > New deployment** e selecione **Web app**.
5. Revise cuidadosamente quem pode executar e quem pode acessar a aplicação conforme a política do projeto.
6. Crie o deployment e registre a URL fora do código-fonte, se necessário.
7. Abra a URL e valide o `doGet()` antes de qualquer implementação funcional.

## Admin Web App

1. Confirme o Script ID em `apps/admin/.clasp.json`.
2. Execute `npm run push:admin`.
3. Abra o projeto `admin` no Google Apps Script.
4. Use **Deploy > New deployment** e selecione **Web app**.
5. Restrinja o acesso de acordo com a política de segurança do barbeiro e da conta Google; não assuma acesso público.
6. Crie o deployment e registre a URL fora do código-fonte, se necessário.
7. Abra a URL autorizada e valide o `doGet()`.

## Atualizações futuras

Depois de alterações no código, faça push para o projeto correto e crie uma nova versão/deployment conforme a estratégia escolhida no editor do Apps Script. Nunca troque os Script IDs entre `public` e `admin`.

Integrações com Sheets, Calendar, Gmail/MailApp, autenticação e regras de acesso devem ser definidas no PRD antes de serem adicionadas ao deployment.
