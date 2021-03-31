# Copyright 2021 Quantap Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

.PHONY: deploy runtimeconfig credentials

FIREBASE_PROJECT=customerdb-staging
FIREBASE_CREDENTIALS_FILE="$(HOME)/.quantap/customerdb-staging-secret.json"

# Requires `gcloud config set project customerdb-development`
credentials:
	gcloud iam service-accounts keys create \
		$(FIREBASE_CREDENTIALS_FILE) \
		--iam-account=customerdb-staging@appspot.gserviceaccount.com

runtimeconfig:
	firebase --project=customerdb-development \
	functions:config:get \
	> functions/.runtimeconfig.json

deploy:
	yarn build
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase deploy --project=$(FIREBASE_PROJECT)

deploy-functions:
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase deploy --only=functions --project=$(FIREBASE_PROJECT)

local:
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase emulators:exec --project=customerdb-development --only functions,firestore,ui "yarn start"

apply-format:
	./node_modules/.bin/import-sort --write src/\*.js functions/\*.js
	yarn prettier --write src/
	yarn prettier --write functions/
	yarn prettier --write public/

check-format:
	yarn prettier --check src/
	yarn prettier --check functions/

# Example:
#
# make test WHAT="-t existing src/interviews/Document.test.js"
test:
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase --project=customerdb-development emulators:exec --only=firestore "yarn test --watchAll=false --forceExit $(WHAT)"

install-git-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit
