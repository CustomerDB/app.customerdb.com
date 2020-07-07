.PHONY: deploy

FIREBASE_PROJECT=customerdb-production
FIREBASE_CREDENTIALS_FILE="$(HOME)/.quantap/customerdb-production-secret.json"

# Requires `gcloud config set project customerdb-production`
credentials:
	gcloud iam service-accounts keys create \
		$(FIREBASE_CREDENTIALS_FILE) \
		--iam-account=customerdb-production@appspot.gserviceaccount.com

deploy:
	yarn build
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase deploy --project=$(FIREBASE_PROJECT)

deploy-functions:
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase deploy --only=functions --project=$(FIREBASE_PROJECT)

local:
	GOOGLE_APPLICATION_CREDENTIALS=$(FIREBASE_CREDENTIALS_FILE) \
		firebase emulators:exec --only functions,firestore,ui "yarn start"
