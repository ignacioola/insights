Insights Graph
==============


## Minimal input

```javascript
    var nodes = [
        {
            id: 1,
            text: "apple",
            size: 9,
            cluster: 1034
        },
        {
            id: 2,
            text: "google",
            size: 7,
            cluster: 2,
            count: 534
        }
    ];

    var links = [
        [ 1, 2, 15 ] // [ source, target, weight ]
    ];

    var el = document.getElementById("container");
```

## How to use it ?

```javascript
    new InsightsGraph(el, nodes, links)
```

