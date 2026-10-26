# MongoDB Backup and Recovery

Backups contain contact, property, and communication data. Store them only in
an encrypted, access-controlled location with a retention period approved for
your deployment. The repository ignores the local `backups/` directory.

## Create a backup

Install the MongoDB Database Tools on the host and set `MONGODB_URI` in the
environment. The backup command does not print the connection string.

```powershell
npm run db:backup
```

The command writes a timestamped `mongodump` directory under `backups/mongo/`.
To use a different root directory:

```powershell
npm run db:backup -- C:\secure-backup-location
```

Copy the generated folder to the approved backup store. A local backup alone
does not protect against disk or host loss.

## Verify recovery

Install both `mongorestore` and `mongosh`, then point the verification command
at one timestamped backup directory:

```powershell
npm run db:backup:verify -- C:\secure-backup-location\2026-10-26T08-00-00-000Z
```

The verifier restores the dump into a randomly named temporary database on the
configured MongoDB deployment, checks that it contains collections, and drops
only that temporary database. It never intentionally restores over the source
database. Run this check on a non-production deployment where possible, and
confirm the target URI and database before running it.

Verification creates and drops a temporary database; MongoDB permissions must
allow that operation. If verification is interrupted, inspect the temporary
database names beginning with `linda_restore_check_` and remove only a database
you have confirmed is left by this check.

## Recovery

Restore into a separately provisioned target database first. Review collection
counts and application behavior before redirecting production traffic. Do not
use `mongorestore --drop` against a production URI unless a documented recovery
procedure explicitly authorizes replacing the target data.
