# CustomerDB

## Development

### install service account keys

Go to the GCP cloud console and download a new service account key to `~/.quantap/customerdb-production-secret.json`

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
