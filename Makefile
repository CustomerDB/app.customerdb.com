.PHONY: deploy runtimeconfig credentials

FIREBASE_PROJECT=customerdb-staging
FIREBASE_CREDENTIALS_FILE="$(HOME)/.quantap/customerdb-staging-secret.json"

# Requires `gcloud config set project customerdb-staging`
credentials:
	gcloud iam service-accounts keys create \
		$(FIREBASE_CREDENTIALS_FILE) \
		--iam-account=customerdb-staging@appspot.gserviceaccount.com

runtimeconfig:
	firebase --project=customerdb-staging \
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
		firebase emulators:exec --project=customerdb-staging --only functions,firestore,ui "yarn start"

apply-format:
	yarn prettier --write src/
	yarn prettier --write functions/
	yarn prettier --write public/

check-format:
	yarn prettier --check src/
	yarn prettier --check functions/

install-git-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit
