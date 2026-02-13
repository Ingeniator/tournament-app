.PHONY: dev build deploy-build clean test e2e e2e-ui coverage coverage-unit coverage-e2e

dev:
	@lsof -ti :5190,:5191 2>/dev/null | xargs kill -9 2>/dev/null || true
	npm -w @padel/runner run dev & npm -w @padel/planner run dev & node dev-proxy.mjs & wait

build:
	npx -w @padel/common tsc -b
	npm -w @padel/runner run build
	npm -w @padel/planner run build

# Cloudflare Pages: merge both outputs into dist/
deploy-build: build
	rm -rf dist
	mkdir -p dist/play dist/plan
	cp -r packages/runner/dist/* dist/play/
	cp -r packages/planner/dist/* dist/plan/
	cp index.html dist/index.html
	cp public/robots.txt dist/robots.txt
	cp public/sitemap.xml dist/sitemap.xml
	cp public/_headers dist/_headers

clean:
	rm -rf dist packages/common/dist packages/common/tsconfig.tsbuildinfo packages/runner/dist packages/planner/dist

test:
	npm -w @padel/runner run test
	npx playwright test

e2e:
	npx playwright test

e2e-ui:
	npx playwright test --ui

coverage-unit:
	npx vitest run --coverage

coverage-e2e:
	npx playwright test --reporter=html

coverage: coverage-unit coverage-e2e
