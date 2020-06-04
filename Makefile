.PHONY: deploy

deploy:
	yarn build
	firebase deploy --project=webapp

local:
	firebase emulators:exec --only functions,firestore,storage "yarn start"
