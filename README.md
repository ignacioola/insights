Insights Graph
==============

A customized force layout written with d3.js.

## Downloads:
    * Version packed with dependencies: [insights.packed.js](https://raw.github.com/ignacioola/insights-graph/master/dist/insights.packed.js)
    * Version without dependencies: [insights.js](https://raw.github.com/ignacioola/insights-graph/master/dist/insights.js)

## Stylesheet
    * A default optional stylesheet is available: [insights-default.css](https://raw.github.com/ignacioola/insights-graph/master/dist/insights-default.css)

## Dependencies:
    * [d3.js](https://github.com/mbostock/d3)
    * [underscore.js](https://github.com/documentcloud/underscore/)
    * [Mustache.js](https://github.com/janl/mustache.js)

## Minimal input

```javascript
var nodes = [
    {
        id: 1,
        text: "apple",
        size: 9,
        cluster: 5,
        count: 1034
    },
    {
        id: 2,
        text: "google",
        size: 7,
        cluster: 2,
        count: 534
    },
    {
        id: 3,
        text: "microsoft",
        size: 5,
        cluster: 1,
        count: 432
    }
];

var links = [
    [ 1, 2, 15 ], // [ source.id, target.id, weight ]
    [ 2, 3, 12 ],
    [ 1, 3, 5 ]
];
```

## How to use it ?

```javascript
var el = document.getElementById("container");
new InsightsGraph(el, nodes, links)
```

## Adding an onRendered callback

´´´javascript
new InsightsGraph(el, nodes, links, {
    onRendered: function() {
        // hide loader
    })
```
