
build: components src/tooltip.js src/graph.js index.js insights.css
	@component build --dev
	@component build -n insights -s Insights

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js

.PHONY: clean test
