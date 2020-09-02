.PHONY: deploy runtimeconfig credentials

FIREBASE_PROJECT=customerdb-development
FIREBASE_CREDENTIALS_FILE="$(HOME)/.quantap/customerdb-development-secret.json"

# Requires `gcloud config set project customerdb-development`
credentials:
	gcloud iam service-accounts keys create \
		$(FIREBASE_CREDENTIALS_FILE) \
		--iam-account=customerdb-development@appspot.gserviceaccount.com

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
	./node_modules/.bin/import-sort --write `find src -name \*.js|tr '\n' ' '`
	./node_modules/.bin/import-sort --write `find functions -name \*.js|tr '\n' ' '`
	yarn prettier --write src/
	yarn prettier --write functions/
	yarn prettier --write public/

check-format:
	yarn prettier --check src/
	yarn prettier --check functions/

test:
	firebase --project=customerdb-development emulators:exec "yarn test --watchAll=false --forceExit"

install-git-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit
