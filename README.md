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

File a PR against the `production` branch and Google Cloud Build will deploy to the live site.
