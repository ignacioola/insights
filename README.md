Insights 
========

An interactive force graph written with d3. 

<img src="http://ignacioola.github.com/insights/img/1.png" />

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

* `rendered`: when the graph has finished rendering.
* `reset`: when the graph is resetted.
* `focus`: when the graph is focused on a node.
* `node:click`: when a node is clicked.
* `node:mouseover`: when the mouse is over a node.
* `node:mouseout`: when the mouse goes out from a node.

## Adding a tooltip

Using mustache synthax:

```javascript
graph.tooltip("<div>name: {{text}}</div><div>count: {{count}}</div>")
```

## API 

### Insights(el, nodes, links)

Creates a new graph on the `el` element with the given nodes and links. Available options include:

* `width`: the graph width.
* `height`: the graph height.
* `collisionAlpha`: indicates for how long the graph will try to avoid collisions between it`s nodes.
* `scaleExtent`: [min, max] scale.
* `initialScale`: the chart's initial scale.
* `sizeAttr`: with wich key er find the size on the node's data.
* `tooltipTemplate`: adds a tooltip with the passed template.
    
### Insights#reset()

It returns the graph to it's original state.

### Insights#select(fn)

Selects all the nodes that match the given function.
    
### Insights#focus(fn, center)

Focuses the graph on only one node that matches `fn`, if `center=true` it centers the graph on that node.
    
### Insights#selectByText(text, options)

Selects all the nodes that it's text contains a substring of the passed `text` argument. Options include:
    
* `exact`: if passed, the graph will focus on a node that matches exactly the passed `text` argument.
    
### Insights#selectByCluster(cluster)
    
Selects all the nodes that belong to the passed cluster. The `cluster` argument can also be a list of cluster names.
    
### Insights#selectBySize(min, max)

Selects all the nodes wich size is in the range [ min, max ].

### Insights#tooltip(tmpl)

Adds a tooltip with the given template to the `node:mouseover` event.
    
### Insights#zoomIn()

Zooms in the graph.
    
### Insights#zoomOut()

Zooms out the graph.
    
### Insights#zoom(scale)

Zooms the graph to the given `scale`.
    
### Insights#center()
    
Centers the graph. If there's a selected node it will be centered around it, if not it will center the graph on the mass center.
    
### Insights#getClusters()

Returns a hash of the available clusters and it's colors.

## Licence

MIT
