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
	rsync -a $(HOMEDIR)/dist/ $(USER)@$(SERVER):/$(APPDIR) \
    --exclude node_modules/

set-up-server-dir:
	ssh $(USER)@$(SERVER) "mkdir -p $(APPDIR)"
