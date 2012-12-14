
var UNSELECTED_COLOR = "#EFEFEF";
var DEFAULT_PATH_STROKE_WIDTH = .3;
var SELECTED_PATH_STROKE_WIDTH = 1.5;
var DEFAULT_CIRCLE_STROKE = "#FFF";
var ZOOM_SCALE_EXTENT = [0.2, 2.3];

var TOOLTIP_TEMPLATE = "<div>word: {{ text }}</div> <div>count: {{count}}</div>";
var BASE_ELEMENT_CLASS = "insights-graph";
var DEFAULT_WIDTH = 1200;
var DEFAULT_HEIGHT = 700; 

function Graph(el, nodes, links, options) {
    options = options || {};

    this.el = el;
    this.links = links;
    this.nodes = nodes;
    this.onRendered = options.onRendered ||function() {};
    this.width = options.width || DEFAULT_WIDTH;
    this.height = options.height ||DEFAULT_HEIGHT;
    this.color = d3.scale.category20();

    this.selectedNodes = {};
    this.processData();
    this.processScales();
    this.init();

    this.tooltip = new Tooltip({
        template: options.template ||TOOLTIP_TEMPLATE
    }); 

    this.render();
}

Graph.version = "0.1";

Graph.prototype = {
    constructor: Graph,

    processData: function() {
        var nodesHash = {};
        var maxSize = 0;
        var maxWeight = 0;
        var adjacents= {}
        var linksList = [];

        this.nodes.forEach(function(n) {
            maxSize = Math.max(maxSize, n.size || 0);
            n.name = n.id;
            nodesHash[n.id] = nodesHash[n.id] || n;
        });

        // Compute the distinct nodes from the links.
        this.links.forEach(function(link) {
            var source = nodesHash[link[0]],
                target = nodesHash[link[1]],
                weight = link[2];

            maxWeight = Math.max(maxWeight, weight ||0);

            if (!source ||!target) return;
            
            if (!(link[0] in adjacents)) {
                adjacents[link[0]]= {};
                adjacents[link[0]][link[0]]= true;
            } 
            if (!(link[1] in adjacents)) {
                adjacents[link[1]]= {};
                adjacents[link[1]][link[1]]= true;
            }
            adjacents[link[0]][link[1]]=true;
            adjacents[link[1]][link[0]]= true;

            linksList.push({
                source: source,
                target: target,
                w: weight
            });
        });

        this.linksList = linksList;
        this.adjacents = adjacents;
        this.nodesHash = nodesHash;
        this.maxSize = maxSize;
        this.maxWeight = maxWeight;
    },

    processScales: function() {
        this.radiusScale = d3.scale.sqrt().domain([1, this.maxSize]).range([6, 40]);
        this.linkWidthScale = d3.scale.log().domain([1, this.maxWeight]).range([.2, .21]); 
    },

    init: function() {
        var self = this;
        
        this.zoom = d3.behavior.zoom();
        this.$el = this.getElement();

        this.svg = this.$el
            .attr("class", this.$el.attr("class") + " " + BASE_ELEMENT_CLASS) 
            .append("svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .attr("pointer-events", "all")
                .call(this.zoom.on("zoom", _(this.redraw).bind(this))
                               .scaleExtent(ZOOM_SCALE_EXTENT))
                .append('svg:g')
                    .style('display','none');

        this.$el.on("click", function() { self.reset() });
    },

    redraw: function() {
        var trans = this.getTranslation();
        var scale = this.getScale();

        var x = trans[0] - ((this.xCenter || 0) - this.width / 2)*scale;
        var y = trans[1] - scale*((this.yCenter ||0) - this.height / 2);

        this.displayTitle();

        this.svg.attr("transform", 
            "translate(" + [x, y] + ")" + " scale(" + scale + ")");
    },

    displayTitle: function() {
        var scale = this.getScale();
        var selectedNodes = this.selectedNodes;
        var hasSelection = !!_(selectedNodes).size();

        this.d3TitleNodes.style("display", function(d) {

            if (hasSelection && !selectedNodes[d.id]) {
                return "none"
            }

            var res = Math.LOG10E * Math.log(d.size + 1) / 2;

            if (scale > 2 ||scale * res > 2) {
                return "";
            }else {
                return "none";
            }

        });
    },

    pathStroke: function(d) {
        var source = d.source,
        target = d.target;

        if (target.size > source.size) {
            return this.color(target.cluster);
        } else {
            return this.color(source.cluster);
        }
    },

    render: function() {
        var self = this;
        var nodesHash = {};
        var maxSize = 0;
        var maxWeight = 0;
        var nodes = this.nodes;


        function circleFill(d) { return self.color(d.cluster); }
        function circleRadius(d) { return self.radiusScale(d.size ||1); }

        var force = this.force = d3.layout.force()
            .nodes(d3.values(this.nodesHash)) // lo pasa de {a:1, b:2} a [1, 2]
            .links(this.linksList)
            .size([this.width, this.height])
            .linkDistance(60)
            .linkStrength(1)
            .gravity(0.2)
            .charge(-240)
            .on("tick", tick)
            .start();

        var path = this.d3Path = this.svg.append("svg:g").selectAll("path")
            .data(force.links())
            .enter().append("svg:path")
            .attr("stroke", _(this.pathStroke).bind(this))
            .attr("stroke-width", DEFAULT_PATH_STROKE_WIDTH)
            .attr("fill", "none");
            //.attr("marker-end", function(d) { return "url(#" + d.type + ")"; }); // QUE ES ESTO??
        
        var node = this.d3Nodes = this.svg.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
            .attr("class", "node")
            .on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut)
            .on("click", _(this.onCircleClick).bind(this));
            //.call(force.drag)

        var circle = this.d3Circles = node.append("circle")
            .style("fill", circleFill)
            .attr("r", circleRadius)

        var titleNodes = this.d3TitleNodes = node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .style("display", "none")
            .text(function(d) { return d.text; });

        var firstTime= true;
        function tick(e) {

            if (firstTime && force.alpha() < 0.07) {
                // para que no se pisen los nodos. Como es lento, lo empiezo a hacer despues de que
                // los nodos estan mas o menos acomodados
                var q = d3.geom.quadtree(nodes),
                    i = 0,
                    n = self.nodes.length;
            
                while (++i < n) {
                  q.visit(self.collide(self.nodes[i]));
                }

            }
            if (!firstTime || force.alpha() < 0.05) {
                // que no siga moviendose despues
                force.alpha(0)
                self.svg.style('display','block')
                firstTime= false;

                var xMass=0, yMass=0, totalSize=0;
                node.each(function(d) { 
                    xMass += d.x * d.size;
                    yMass += d.y * d.size;
                    totalSize += d.size;
                });

                self.xCenter = xMass / totalSize;
                self.yCenter = yMass / totalSize;

                node.attr("transform", function(d) { 
                    return "translate(" + d.x + "," + d.y + ")"; 
                });

                // linea curva entre nodos
                path.attr("d", function(d) {
                    var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
                });

                self.redraw();
                self.onRendered();
            }
         
        }



        function onMouseOver(d) {
            var offset = { 
                    left: currentMousePos.x + 10, 
                    top: currentMousePos.y + 10 
                };

            self.tooltip.show(offset, d);
        }

        function onMouseOut(d) {
            self.tooltip.hide();
        }
    },

    onCircleClick: function(d) {
        var self = this;
        var circle = this.d3Circles;
        var path = this.d3Path;

        d3.event.preventDefault();
        d3.event.stopPropagation();

        if (this.adjacents[d.id]) {
            adjacentNodes = this.selectedNodes = this.adjacents[d.id];
        }

        circle.style('fill', function(e) {
                var elem = d3.select(this);

                if (adjacentNodes[e.id]) {
                    return self.color(e.cluster);
                } else {
                    return UNSELECTED_COLOR;
                }
            })
        .style("stroke", function(e) {
                if (e.id == d.id) {
                    return d3.rgb(self.color(e.cluster)).darker();
                } else {
                    return DEFAULT_CIRCLE_STROKE;
                }
            });

        path.attr("stroke-width", function(e, i) {
                if (d.id == e.source.id || d.id == e.target.id) {
                    return SELECTED_PATH_STROKE_WIDTH;
                } else {
                    return DEFAULT_PATH_STROKE_WIDTH;
                }
            })
        .attr("stroke", function(e, i) {
                if (d.id == e.source.id || d.id == e.target.id) {
                    return self.pathStroke(e);
                } else {
                    return UNSELECTED_COLOR;
                }

            });

        this.displayTitle();
    },

    reset: function() {
        var self = this;
        var circle = this.d3Circles;
        var path = this.d3Path;

        this.selectedNodes = {};

        circle.style('fill', function(e) {
                return self.color(e.cluster);
            }).style("stroke", function(e) {
                return DEFAULT_CIRCLE_STROKE;
            });

        path.attr("stroke-width", function(e, i) {
                return DEFAULT_PATH_STROKE_WIDTH;
            })
        .attr("stroke", function(e, i) {
                return self.pathStroke(e);
            });

        this.displayTitle();
    },

    selectByText: function(text) {
        var self = this;
        var circle = this.d3Circles;
        var path = this.d3Path;

        this.selectedNodes = {};

        circle.style('fill', function(e) {
                var nodeText = (e.text || "").toLowerCase();
                var matchText = text.toLowerCase();

                if (~nodeText.indexOf(matchText)) {
                    return self.color(e.cluster);
                } else {
                    return UNSELECTED_COLOR;
                }

            }).style("stroke", function(e) {
                return DEFAULT_CIRCLE_STROKE;
            });

        path.attr("stroke", function(e, i) {
                return UNSELECTED_COLOR;
            });

    },

    /**
     * Hace que los nodos no se peguen.
     */
    collide: function(node) {
        var self = this,
            r = node.radius + 16,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;

        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node)) {
                var x = node.x - quad.point.x,
                y = node.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r= self.radiusScale(quad.point.size ||1)*2;
                if (l < r) {
                    l = (l - r) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2
            || x2 < nx1
            || y1 > ny2
            || y2 < ny1;
        }
    },

    getScale: function() {
        if (d3.event && !isNaN(d3.event.scale)) {
            this._lastScale = d3.event.scale;

            return this._lastScale;
        }else{
            if (!isNaN(this._lastScale)) {
                return this._lastScale;
            }

            return d3.behavior.zoom().scale();
        }
    },

    getTranslation: function() {
        if (d3.event && d3.event.translate) {
            this._lastTranslate = d3.event.translate;

            return this._lastTranslate;
        } else {
            if (!isNaN(this._lastTranslate)) {
                return this._lastTranslate;
            }

            return d3.behavior.zoom().translate();
        }
    },

    getElement: function() {
        return d3.select(this.el);
    }
}

var currentMousePos = { x: -1, y: -1 };
d3.select(window).on("mousemove", function(d) {
    var ev = d3.event;
    currentMousePos.x = ev.pageX;
    currentMousePos.y = ev.pageY;
});

window.InsightsGraph = Graph;
