Insights Graph
==============


## Minimal input

```javascript
var nodes = [
    {
        id: 1,
        text: "apple",
        size: 9,
        count: 1034,
        cluster: 5
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
    [ 1, 2, 15 ], // [ source, target, weight ]
    [ 2, 3, 12 ],
    [ 1, 3, 5 ]
];

var el = document.getElementById("container");
```

## HTML
``html
<head>
  <link rel="stylesheet" src="insights-default.css" />
</head>

<body>
  <div id="container"></div>

  <script src="insights.packaged.js"></script>
</body>
```

## How to use it ?

```javascript
new InsightsGraph(el, nodes, links)
```
