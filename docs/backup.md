# Backup do banco de dados

> Objetivo desta fase: garantir que **perder o banco não seja catastrófico**. Um dump
> diário para um storage barato, com rotação, já cobre o pior caso do estágio de teste.
> Não é uma estratégia de alta disponibilidade — isso fica para `06-hardening.md`.

O script fica em [`scripts/backup-db.sh`](../scripts/backup-db.sh): `mysqldump` consistente
(`--single-transaction`, sem travar a agenda), comprimido com `gzip`, com **rotação** e
**upload off-site opcional**. Ele lê o mesmo `DATABASE_URL` da aplicação.

## Como rodar manualmente

```bash
# dev (MySQL no docker):
MYSQL_CONTAINER=agender-mysql-1 ./scripts/backup-db.sh

# produção (MySQL acessível direto pela rede):
DATABASE_URL='mysql://user:senha@host:3306/agenda' ./scripts/backup-db.sh
```

Gera `backups/agenda-AAAAMMDD-HHMMSS.sql.gz`. O diretório `backups/` é ignorado pelo git.

## Variáveis de ambiente

| Variável | Default | Para quê |
|---|---|---|
| `DATABASE_URL` | (lido do `.env` da raiz) | conexão; parseado para user/senha/host/porta/db |
| `BACKUP_DIR` | `./backups` | onde salvar os dumps |
| `BACKUP_RETENTION_DAYS` | `14` | dias a manter (dumps mais velhos são apagados) |
| `MYSQL_CONTAINER` | — | se setado, roda o `mysqldump` via `docker exec` nesse container |
| `BACKUP_UPLOAD_CMD` | — | comando de upload off-site; `{}` vira o caminho do dump |

**Off-site é o que realmente protege** — um backup no mesmo disco do banco não salva de
uma falha de disco/host. Exemplos de `BACKUP_UPLOAD_CMD`:

```bash
BACKUP_UPLOAD_CMD='rclone copy {} remote:agenda-backups'
BACKUP_UPLOAD_CMD='aws s3 cp {} s3://meu-bucket/agenda/'
```

## Agendamento diário

### Linux (cron) — recomendado em produção

```cron
# todo dia às 03:15, com upload para o S3, log em /var/log/agenda-backup.log
15 3 * * *  DATABASE_URL='mysql://user:senha@host:3306/agenda' \
            BACKUP_UPLOAD_CMD='aws s3 cp {} s3://meu-bucket/agenda/' \
            /caminho/agenda/scripts/backup-db.sh >> /var/log/agenda-backup.log 2>&1
```

### Windows (Agendador de Tarefas) — para a máquina de dev

```powershell
$sh   = (Get-Command bash).Source   # Git Bash
$repo = "C:\Users\pichau\Documents\agender"
$action  = New-ScheduledTaskAction -Execute $sh `
  -Argument "$repo\scripts\backup-db.sh" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At 3:15am
$envInit = "MYSQL_CONTAINER=agender-mysql-1"   # ajuste conforme o ambiente
Register-ScheduledTask -TaskName "AgendaDbBackup" -Action $action -Trigger $trigger
```

> No dev com MySQL em container, garanta que o Docker esteja rodando no horário do backup
> (ou rode o backup a partir de um host que enxergue o MySQL direto).

## Restaurar um backup

```bash
# 1) escolha o dump
ls -lt backups/

# 2) restaure (CUIDADO: sobrescreve o banco alvo)
gunzip -c backups/agenda-AAAAMMDD-HHMMSS.sql.gz \
  | docker exec -i agender-mysql-1 mysql -uroot -proot agenda      # dev

gunzip -c backups/agenda-AAAAMMDD-HHMMSS.sql.gz \
  | mysql -uuser -p agenda                                          # produção
```

**Teste a restauração de tempos em tempos.** Backup que nunca foi restaurado é uma
suposição, não uma garantia — restaure num banco descartável e confira as tabelas.

## Limitações conhecidas (revisitar no hardening)

- O parse do `DATABASE_URL` assume senha **sem** caracteres percent-encoded. Se a senha
  tiver caracteres especiais, use um usuário de backup com senha simples ou ajuste o script.
- Em produção, crie um **usuário de backup** dedicado com o mínimo de privilégios
  (`SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES`) em vez de usar `root`.
- Sem PITR (point-in-time recovery). Para RPO menor que 24h, habilitar binlog + backups
  incrementais — fora do escopo desta fase.
