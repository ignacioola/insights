# 0.12
* Changed d3 dependency to mbostock/d3.
* Improved `zoom()` centering.
* Fixed bug: `center()` return value.
* Fixed bug: apply center if called before rendering.
* Fixed bug: avoid reset when dragging.

# 0.11
* Added `focus()` with incoming/outgoing relations.
* Changed scaleExtent option default value.
* Fixed tests.
* Fixed cluster filter.

# 0.10.1
* Fixed filter(id) bug.
* Added tests.
* Lazy focus.

# 0.10
* Documented methods
* Fixed bug: .center(id) not working.
* Renamed constructor option `scaleExtent` for `zoomScaleExtent`.
* Renamed constructor option `defaultColors` for `colors`.
* Removed `.attr()` from public api.

# 0.8
* Cumulative selection filters.
    * added isFiltering, addFilter, testFilter methods.
    * removed arg fn from draw().
    * removed matching context variable.
* selectByTextExact removed (focus() can be used instead).
* options removed from selectByText.
* changed `getSelectedNode()` for `getFocusedNode()`.
* changed `isSelected()` for `isFocused()`.
* `draw()` changed for `update()`
* `select()` changed for `filter()`
* `selectBySize()` changed for `filterBySize()`
* `selectByCluster()` changed for `filterByCluster()`
* `selectByText()` changed for `filterByText()`
* `filterBySize()` accepts `null` to avoid using min or max values to filter.
* `focusByText()` is case-insensitive now.
* `getNode()` added.
* `getFocusedNode()` added.
* `getAdjacents()` added.
* tests added

# 0.7.1
* Added `defaultColors` option.

# 0.7
* focusByText method
* center param removed from focus().

# 0.6
* `center` method added.
* Optimized drawing.
* Selection methods standarized.
* Fodrawing
* Center method
* Added focus event.

# 0.5 (11-1-2012)
* Z-Index fix

# 0.4 (8-1-2012)
* Added bind, emitter deps.
* Removed underscore dep.
* Updated d3 repo & dep.
* Tooltip optional.
* Added tooltip on/off methods.

# 0.2
* Added collisionAlpha option.
* Added focus function.
* Initial focus on mass center.

# version 0.1.1 (18-12-2012)
* Improved zooming on titles.
* Fixed encoding issues.

