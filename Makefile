.PHONY: dev build deploy-build clean test e2e e2e-ui e2e-staging coverage coverage-unit coverage-e2e

dev:
	@lsof -ti :5190,:5191,:5192 2>/dev/null | xargs kill -9 2>/dev/null || true
	npm -w @padel/runner run dev & npm -w @padel/planner run dev & npm -w @padel/landing run dev & node dev-proxy.mjs & wait

build:
	npx -w @padel/common tsc -b
	npm -w @padel/runner run build
	npm -w @padel/planner run build
	npm -w @padel/landing run build

# Cloudflare Pages: merge both outputs into dist/
deploy-build: build
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
