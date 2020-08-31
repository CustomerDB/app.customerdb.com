# CustomerDB

Voice of Customer tool for Product Teams

## Development

### Install service account keys for the staging environment

```
$ make credentials
```

### Install staging environment firebase runtime configuration

```
$ make runtimeconfig
```

### Install commit hooks

```
$ make install-git-hooks
```

### Run locally

#### Testing frontend, functions and firestore changes locally

You should include the staging environment variables and add the following:

```
export FIRESTORE_EMULATOR_HOST="localhost:8080"
```

Then, run `./scripts/emulators.sh` to bring up a bare customerdb instance.
You need to have your credentials added by another member to the fixture data before being able to log in.

When getting your credntials added, the `onMemberWritten` will write oauth claims into your profile. Therefore, you may not be able to switch between the staging instance and a local instance without rerunning this function. This can be done by changing the `active` bit off and on.

Changes you make will not be saved automatically to the emulated database. If you want to overwrite the data on exit, run `./scripts/emulators.sh -w`.

**NOTE** If you force close the firestore emulator, the data may be corrupted on write. So make sure to make incremental commits by stopping and starting the emulator gracefully.

#### Testing frontend changes against staging data.

To run locally, but use staging services. Run:

```
$ make local
```

## Deployment

[File a PR to promote `staging` to `production`](https://github.com/quantap/app.customerdb.com/compare/production...staging) and Google Cloud Build will deploy to the live site.
