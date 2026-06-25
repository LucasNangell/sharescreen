# Rollback DEV

## Restaurar UI/bundles pré-modernização

```powershell
cd "E:\Projetos\Trabalho\Screen Share"
Copy-Item "_backup_pre_modernizacao_dev\public" "public" -Recurse -Force
```

## Restaurar server/config

```powershell
Copy-Item "_backup_pre_modernizacao_dev\server" "server" -Recurse -Force
Copy-Item "_backup_pre_modernizacao_dev\config" "config" -Recurse -Force
npm run build
```

## Git

```bash
git checkout dev/modernizacao-profissional-baixa-latencia
git restore .
```

## Rollback pós-auditoria QA

Se precisar reverter apenas as correções da auditoria QA (mantendo modernização):

```bash
git diff src/   # revisar alterações
git restore src/ public/host/index.html public/host/style.css public/client/style.css
npm run build
```

## Produção

A pasta `\\cgrafsysvm\Sistemas CGraf\Screen Share` **não foi alterada** nesta modernização DEV.
