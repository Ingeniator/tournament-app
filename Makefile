.PHONY: dev build deploy-build clean e2e e2e-ui

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

clean:
	rm -rf dist packages/common/dist packages/common/tsconfig.tsbuildinfo packages/runner/dist packages/planner/dist

e2e:
	npx playwright test

e2e-ui:
	npx playwright test --ui
