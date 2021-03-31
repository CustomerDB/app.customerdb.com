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

You should include the staging environment variables:

```
export REACT_APP_FIREBASE_API_KEY="AIzaSyB9u1yER2kJXejfDYrnainq9OeOgCxZj5M"
export REACT_APP_FIREBASE_AUTH_DOMAIN="customerdb-development.firebaseapp.com"
export REACT_APP_FIREBASE_DATABASE_URL="https://customerdb-development.firebaseio.com"
export REACT_APP_FIREBASE_PROJECT_ID="customerdb-development"
export REACT_APP_FIREBASE_STORAGE_BUCKET="customerdb-development.appspot.com"
export REACT_APP_FIREBASE_MESSAGING_SENDER_ID="900515572102"
export REACT_APP_FIREBASE_APP_ID="1:900515572102:web:830e081421af0955f92407"
export REACT_APP_FIREBASE_MEASUREMENT_ID="G-BC0MJ8WSV9"
export REACT_APP_ALGOLIA_PEOPLE_INDEX=development_PEOPLE
export REACT_APP_ALGOLIA_DOCUMENTS_INDEX=development_DOCUMENTS
export REACT_APP_ALGOLIA_SNAPSHOTS_INDEX=development_SNAPSHOTS
export REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX=development_HIGHLIGHTS
export REACT_APP_VERSION="<local build>"
export GCLOUD_CLIENT_ID="555668636001-ff075aeus6gata7oj5bchq37amgv4ltj.apps.googleusercontent.com"
export GCLOUD_API_KEY="_oev7fe7RB4OvApK1KJt_dbH"
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export GOOGLE_APPLICATION_CREDENTIALS="${HOME}/.quantap/customerdb-development-secret.json"
```

Then, run `./scripts/emulators.sh` to bring up a bare customerdb instance.
You need to have your credentials added by another member to the fixture data before being able to log in.

When getting your credntials added, the `onMemberWritten` will write oauth claims into your profile. Therefore, you may not be able to switch between the staging instance and a local instance without rerunning this function. This can be done by changing the `active` bit off and on.

Changes you make will not be saved automatically to the emulated database. If you want to overwrite the data on exit, run `./scripts/emulators.sh -w`.

#### Testing frontend changes against staging data.

To run locally, but use staging services. Run:

```
$ make local
```

## Deployment

[File a PR to promote `staging` to `production`](https://github.com/quantap/app.customerdb.com/compare/production...staging) and Google Cloud Build will deploy to the live site.
