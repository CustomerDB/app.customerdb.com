# CustomerDB

Voice of Customer tool for Product Teams

## Development

### Install service account keys for the staging environment

```
$ make credentials
```

### Install commit hooks

```
$ make install-git-hooks
```

### Run locally

```
$ make local
```

## Deployment

[File a PR to promote `staging` to `production`](https://github.com/quantap/app.customerdb.com/compare/production...staging) and Google Cloud Build will deploy to the live site.
