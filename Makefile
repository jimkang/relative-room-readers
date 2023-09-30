include config.mk

HOMEDIR = $(shell pwd)
vite = ./node_modules/.bin/vite

pushall: sync
	git push origin main

run:
	$(vite)

build:
	npm run build

sync:
	rsync -avz $(HOMEDIR)/dist/ $(USER)@$(SERVER):/$(APPDIR) \
    --exclude node_modules/
sync-samples:
	rsync -avz $(HOMEDIR)/samples $(USER)@$(SERVER):/$(APPDIR)

set-up-server-dir:
	ssh $(USER)@$(SERVER) "mkdir -p $(APPDIR)"
