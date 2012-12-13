SRC = src/tooltip.js src/graph.js
PACKAGE_SRC = lib/underscore.js lib/mustache.js lib/d3.v2.js $(SRC)

build: $(SRC)
	(echo '!function() {'; cat $^; echo '}();') > dist/insights.js
	make package

package: $(PACKAGE_SRC)
	(echo '!function() {'; cat $^; echo '}();') > dist/insights.packaged.js

