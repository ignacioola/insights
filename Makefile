
build: components src/tooltip.js src/graph.js index.js insights.css
	@component build
	@component build -n insights.standalone -s Insights

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js

.PHONY: clean test build
