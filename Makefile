.PHONY: deploy

deploy:
	yarn build
	GOOGLE_APPLICATION_CREDENTIALS="$(HOME)/.quantap/webapp-secret.json" \
		firebase deploy --project=webapp

local:
	GOOGLE_APPLICATION_CREDENTIALS="$(HOME)/.quantap/webapp-secret.json" \
		firebase emulators:exec --only functions,firestore "yarn start"
