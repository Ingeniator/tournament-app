.PHONY: dev build deploy-build clean

dev:
	npm -w @padel/runner run dev & npm -w @padel/planner run dev & wait

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
	echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/play"></head></html>' > dist/index.html

clean:
	rm -rf dist packages/common/dist packages/common/tsconfig.tsbuildinfo packages/runner/dist packages/planner/dist
