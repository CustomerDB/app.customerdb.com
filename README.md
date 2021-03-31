<!--
 Copyright 2021 Quantap Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# CustomerDB

Voice of Customer tool for Product Teams

High level features:

- Audio / video transcription and replay
- Quote / verbatim highlighting
- Contacts (lightweight CRM)
- Collaborative text editing
- Collaborative affinity diagrams
- Summarization / report editor
- Organizations and multi-org membership

## Hosting

This is a firebase application. There are two environments: `staging` and `production`.
Each is a separate firebase project with its own DNS, database, functions, storage, etc.
We use Google Cloud Build to automatically deploy to these environments whenever new
commits land in the corresponding branches in GitHub. The build job posts its status
(build started, build complete) to a slack channel via a webhook provided from the
environment.

In addition, this project uses Algolia for search indexing, and various Google cloud
APIs for non-interactive features.

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

Set the staging environment variables:

```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_DATABASE_URL
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID
REACT_APP_ALGOLIA_PEOPLE_INDEX
REACT_APP_ALGOLIA_DOCUMENTS_INDEX
REACT_APP_ALGOLIA_SNAPSHOTS_INDEX
REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX
REACT_APP_VERSION
GCLOUD_CLIENT_ID
GCLOUD_API_KEY
FIRESTORE_EMULATOR_HOST="localhost:8080"
GOOGLE_APPLICATION_CREDENTIALS="${HOME}/.customerdb/customerdb-staging-secret.json"
```

#### Testing frontend changes against staging data.

To run locally, but use staging services, first source your environment file and then run:

```
$ yarn
$ yarn start
```

## Deployment

[File a PR to promote `staging` to `production`](https://github.com/CustomerDB/app.customerdb.com/compare/production...staging) and Google Cloud Build will deploy to the live site.
