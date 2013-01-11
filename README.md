Insights 
========

An interactive force graph written with d3. 

Demo [here](http://ignacioola.github.com/insights/demo/)

## Installation

Insights is packaged and distributed with [component.js](https://github.com/component/component).

    $ component install ignacioola/insights

## Usage
```javascript
var Insights = require("insights");
```

## Minimal input example

```javascript
var nodes = [
    {
        id: 1,
        text: "apple",
        size: 9,
        cluster: 5
    },
    {
        id: 2,
        text: "google",
        size: 7,
        cluster: 2
    },
    {
        id: 3,
        text: "microsoft",
        size: 5,
        cluster: 1
    }
];

var links = [
    [ 1, 2 ], // [ source.id, target.id ]
    [ 2, 3 ],
    [ 1, 3 ]
];
```

## How to use it ?

```javascript
var el = document.getElementById("container");
var graph = new Insights(el, nodes, links)
```

## Adding a an event handler

```javascript
graph.on("rendered", function() {
    // hide loader, ...
});
```

## Events

* `rendered`: when the chart has finished rendering.
* `reset`: when the chart is reseted.
* `node:click`: when a node is clicked.
* `node:mouseover`: when the mouse is over a node.
* `node:mouseout`: when the mouse goes out from a node.

## Adding a tooltip

Using mustache synthax:

```javascript
graph.tooltip("<div>name: {{text}}</div><div>count: {{count}}</div>")
```
