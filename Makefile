.PHONY: dev build deploy-build clean test e2e e2e-ui e2e-staging coverage coverage-unit coverage-e2e release

dev:
	@pkill -9 -f 'vite.*padel' 2>/dev/null || true
	@pkill -9 -f 'dev-proxy' 2>/dev/null || true
	@lsof -ti :5190,:5191,:5192,:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
	@sleep 3
	npm -w @padel/runner run dev & npm -w @padel/planner run dev & npm -w @padel/landing run dev & node dev-proxy.mjs & wait

build:
	npx -w @padel/common tsc -b
	npm -w @padel/runner run build
	npm -w @padel/planner run build
	npm -w @padel/landing run build
	npx tsx scripts/prerender.ts

unit-test:
	npm test --workspaces --if-present

# Cloudflare Pages: merge both outputs into dist/
deploy-build: build unit-test
	rm -rf dist
	mkdir -p dist/play dist/plan
	cp -r packages/runner/dist/* dist/play/
	cp -r packages/planner/dist/* dist/plan/
	cp -r packages/landing/dist/* dist/
	cp public/robots.txt dist/robots.txt
	cp public/sitemap.xml dist/sitemap.xml
	cp public/_headers dist/_headers

clean:
	rm -rf dist packages/common/dist packages/common/tsconfig.tsbuildinfo packages/runner/dist packages/planner/dist packages/landing/dist

test:
	npm -w @padel/runner run test
	npx playwright test

e2e:
	npx playwright test

e2e-ui:
	npx playwright test --ui

e2e-staging:
	npx playwright test --project=planner-staging

coverage-unit:
	npx vitest run --coverage

coverage-e2e:
	npx playwright test --reporter=html

coverage: coverage-unit coverage-e2e

release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=X.Y.Z"; exit 1; fi
	@if git rev-parse "$(VERSION)" >/dev/null 2>&1; then echo "Tag $(VERSION) already exists"; exit 1; fi
	@echo "Running build..."
	$(MAKE) build
	@echo "Running unit tests..."
	npm test --workspaces --if-present
	@echo "Running e2e tests..."
	npx playwright test
	@echo "All tests passed. Pushing branch and tagging $(VERSION)..."
	git push origin HEAD
	git tag "$(VERSION)"
	git push origin "$(VERSION)"
	@echo "Released $(VERSION)"
