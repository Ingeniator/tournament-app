.PHONY: dev build deploy-build clean test e2e e2e-ui e2e-staging coverage coverage-unit coverage-e2e release install

# Directories to clean
CLEAN_DIRS := dist \
	packages/common/dist \
	packages/common/tsconfig.tsbuildinfo \
	packages/runner/dist \
	packages/planner/dist \
	packages/landing/dist

# --- Development ---

dev:
	@pkill -f 'vite.*padel' 2>/dev/null || true
	@pkill -f 'dev-proxy' 2>/dev/null || true
	@lsof -ti :5190,:5191,:5192,:3000 2>/dev/null | xargs kill 2>/dev/null || true
	@sleep 1
	npm -w @padel/runner run dev & npm -w @padel/planner run dev & npm -w @padel/landing run dev & node dev-proxy.mjs & wait

install:
	npm install

# --- Build ---

build:
	npx -w @padel/common tsc -b
	npm -w @padel/runner run build & npm -w @padel/planner run build & npm -w @padel/landing run build & wait
	npx tsx scripts/prerender.ts

deploy-build: build unit-test
	rm -rf dist
	mkdir -p dist/play dist/plan
	cp -r packages/runner/dist/. dist/play/
	cp -r packages/planner/dist/. dist/plan/
	cp -r packages/landing/dist/. dist/
	cp public/robots.txt dist/robots.txt
	cp public/sitemap.xml dist/sitemap.xml
	cp public/_headers dist/_headers

# --- Testing ---

unit-test:
	npm test --workspaces --if-present

test: unit-test e2e

e2e:
	npx playwright test

e2e-ui:
	npx playwright test --ui

e2e-staging:
	npx playwright test --project=planner-staging

# --- Coverage ---

coverage-unit:
	npx vitest run --coverage

coverage-e2e:
	npx playwright test --reporter=html

coverage: coverage-unit coverage-e2e

# --- Release ---

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=X.Y.Z"; exit 1; fi
	@if git rev-parse "$(VERSION)" >/dev/null 2>&1; then echo "Tag $(VERSION) already exists"; exit 1; fi
	@if ! git diff --quiet HEAD 2>/dev/null; then echo "Error: uncommitted changes. Commit or stash first."; exit 1; fi
	@if [ "$$(git branch --show-current)" != "main" ]; then echo "Warning: not on main branch (on $$(git branch --show-current))"; fi
	$(MAKE) deploy-build
	@echo "Running e2e tests..."
	npx playwright test
	@echo "All tests passed. Pushing branch and tagging $(VERSION)..."
	git push origin HEAD
	git tag "$(VERSION)"
	git push origin "$(VERSION)"
	@echo "Released $(VERSION)"

# --- Cleanup ---

clean:
	rm -rf $(CLEAN_DIRS)
