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

## Adding a rendered callback

```javascript
graph.on("rendered", function() {
    // hide loader, ...
});
```
