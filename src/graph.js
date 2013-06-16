var bind = require("bind")
  , Emitter = require("emitter")
  , d3 = require("d3")
  , toFunction = require('to-function')
  , Tooltip = require("./tooltip");

var UNSELECTED_COLOR = "transparent"; //"#EFEFEF";
var DEFAULT_PATH_STROKE_WIDTH = .3;
var SELECTED_PATH_STROKE_WIDTH = 1.5;
var DEFAULT_CIRCLE_STROKE = "#FFF";
var ZOOM_SCALE_EXTENT = [0.2, 2.3];

var TOOLTIP_TEMPLATE = "<div>text: {{text}}</div> <div>size: {{size}}</div>";
var BASE_ELEMENT_CLASS = "insights-graph";
var DEFAULT_WIDTH = 1200;
var DEFAULT_HEIGHT = 700; 
var DEFAULT_COLLISION_ALPHA = .5;
var DEFAULT_FORCE_ALPHA_LIMIT = 0.02; // 0.007
var DEFAULT_LINK_STRENGTH = 1; // 1
var DEFAULT_LINK_DISTANCE = 60; // 60
var DEFAULT_GRAPH_CHARGE = -300;// -240
//var DEFAULT_SIZE_ATTR = "size";  // where to find size info

function Graph(el, nodes, links, options) {
  options = options || {};

  this.el = el;
  this.width = options.width || DEFAULT_WIDTH;
  this.height = options.height ||DEFAULT_HEIGHT;
  this.collisionAlpha = options.collisionAlpha || DEFAULT_COLLISION_ALPHA;
  this.scaleExtent = options.scaleExtent || ZOOM_SCALE_EXTENT;
  //this.sizeAttr = options.sizeAttr || DEFAULT_SIZE_ATTR;
  this.color = d3.scale.category20();
  this.colors = options.defaultColors || {};

  this.attrs = {};
  
  if (options.initialScale) {
    this._initialScale = options.initialScale;
  }

  this.filters = [];
  this.appliedFilters = [];

  this.resetState();
  this.compute(nodes, links);
  this.computeScales();
  this.init();

  options.tooltip && this.tooltip(options.tooltip);
}

Graph.version = "0.8";

Graph.prototype = {
  constructor: Graph,

  compute: function(nodes, links) {
    var self = this,
      nodesHash = {},
      maxSize = 0,
      maxWeight = 0,
      adjacents= {},
      linksList = [],
      getCluster = bind(this, this.getCluster),
      getSize = bind(this, this.getSize);

    nodes.forEach(function(n) {
      var cluster = getCluster(n);

      maxSize = Math.max(maxSize, getSize(n));
      n.name = n.id;
      nodesHash[n.id] = nodesHash[n.id] || n;

      if (cluster != null && self.colors[cluster] == null) {
        // caching cluster data
        self.colors[cluster] = self.color(cluster);
      }
    });

    // Compute the distinct nodes from the links.
    links.forEach(function(link) {
      var source = nodesHash[link[0]],
        target = nodesHash[link[1]];

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
        target: target
      });
    });

    this.nodes = nodes;
    this.links = linksList;
    this.maxSize = maxSize;
    this.adjacents = adjacents;
    this.nodesHash = nodesHash;
  },

  computeScales: function() {
    this.radiusScale = d3.scale.sqrt().domain([1, this.maxSize]).range([6, 40]);
    this.titleScale = d3.scale.log().domain([1, this.maxSize]).range([0, 1]);
  },

  computeCenterCoords: function() {
    var self = this;
    var xMass=0, yMass=0, totalSize=0;

    this.d3Nodes.each(function(d) { 
      var size = self.getSize(d);
      xMass += d.x * size;
      yMass += d.y * size;
      totalSize += size;
    });

    this.xCenter = xMass / totalSize;
    this.yCenter = yMass / totalSize;
    this.massCenter = [this.xCenter, this.yCenter];
  },

  init: function() {
    var self = this;
    
    this._zoom = d3.behavior.zoom().translate([0,0]);

    this.$el = this.getElement();

    this.$el.html("");
    this.svg = this.$el
      .attr("class", this.$el.attr("class") + " " + BASE_ELEMENT_CLASS) 
      .append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("pointer-events", "all")
        .call(this._zoom.on("zoom", bind(this, this.onZoom))
                 .scaleExtent(this.scaleExtent))

    this.baseGroup = this.svg.append('svg:g')
                .style('display','none');

    this.$el.on("click", function() { self.reset() });
  },

  /**
   * Tells where to extract the attribute each node's object.
   */
  attr: function(key, val) {
    var attrs = ['id', 'size', 'cluster', 'text'];

    if (~attrs.indexOf(key)) {
      this.attrs[key] = val;
    }

    return this;
  },

  nodeVal: function(key, node) {
    var val = this.attrs[key];
    
    if (val == null) {
      return node[key];
    } else if (typeof val == "function") {
      return val(node);
    }

    //return node[val];
    return;
  },

  onZoom: function() {
    this.refreshZoom();
  },

  refreshZoom: function(animate) {
    var zoom = this._zoom
      , trans = this.getTranslation()
      , scale = this.getScale();
    
    if (animate) {
      this.baseGroup.transition().duration(500).attr('transform', 
        'translate(' + zoom.translate() + ') scale(' + zoom.scale() + ')');
    } else {
      this.baseGroup.attr("transform", "translate(" + trans + ")" + " scale(" + scale + ")");
    }

    this.updateTitles();
  },

  zoom: function(scale) {
    var trans, zoom;

    if (!this.isRendered()) {
      this._initialScale = scale;
      return this;
    }

    trans = this.getTranslation();
    zoom = this._zoom;

    zoom.scale(scale);

    this.refreshZoom(true);

    return this;
  },

  zoomIn: function() {
    var scale = this.getScale()
      , k = Math.pow(2, Math.floor(Math.log(scale) / Math.LN2) + 1);

    k = Math.min(k, this.scaleExtent[1]);
      
    return this.zoom(k);
  },

  zoomOut: function() {
    var scale = this.getScale();
    var k = Math.pow(2, Math.ceil(Math.log(scale) / Math.LN2) - 1);

    k = Math.max(k, this.scaleExtent[0]);
      
    return this.zoom(k);
  },

  isTitleDisplayable: function(d) {
    var scale = this.getScale();
    var res = this.titleScale(this.getSize(d) || 1);

    return (scale * res > .8 || scale > 2.2 );
  },

  titleDisplay: function(d) {
    if (this.isTitleDisplayable(d) && this.isNodeVisible(d)) {
      return "";
    }

    return "none";
  },

  pathStroke: function(d) {
    var source = d.source,
      target = d.target;

    if (this.getSize(target) > this.getSize(source)) {
      return this.getClusterColor(target);
    } else {
      return this.getClusterColor(source);
    }
  },

  render: function() {
    var self = this;
    
    if (this._initialScale) {
      this._zoom = this._zoom.scale(this._initialScale);
    }

    function circleRadius(d) { return self.radiusScale(self.getSize(d) || 1); }

    var force = this.force = d3.layout.force()
      .nodes(this.nodes)
      .links(this.links)
      .size([this.width, this.height])
      .linkDistance(DEFAULT_LINK_DISTANCE)
      //.linkStrength(DEFAULT_LINK_STRENGTH)
      //.gravity(0.2)
      .charge(DEFAULT_GRAPH_CHARGE)
      .on("tick", tick)
      .start();

    var path = this.d3Path = this.baseGroup.append("svg:g").selectAll("path")
      .data(force.links())
      .enter().append("svg:path")
      .attr("stroke", bind(this, this.pathStroke))
      .attr("stroke-width", DEFAULT_PATH_STROKE_WIDTH)
      .attr("fill", "none");
    
    var node = this.d3Nodes = this.baseGroup.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .on("mouseover", bind(this, this.onMouseOver))
      .on("mouseout", bind(this, this.onMouseOut))
      .on("click", bind(this, this.onCircleClick));

    var circle = this.d3Circles = node.append("circle")
      .style("fill", bind(this, this.getClusterColor))
      .attr("r", circleRadius)

    var titleNodes = this.d3TitleNodes = node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("display", "none")
      .text(function(d) { return self.getText(d); });

    function tick(e) {
      if (force.alpha() < DEFAULT_FORCE_ALPHA_LIMIT) {
        self.handleCollisions();

        // to prevent the chart from moving after
        force.stop();

        self.positionNodes();
        self.positionLinks();
        self.center();

        // showing canvas after finished rendering
        self.show();

        self.refreshZoom();
        self.emit("rendered");
      }
    }

    if (this.hasFilters() || this.hasFocus()) { 
      this.update();
    }

    return this;
  },

  show: function() {
    this.baseGroup.style('display','block');
  },

  hide: function() {
    this.baseGroup.style('display','none');
  },

  handleCollisions: function() {
    var nodes = this.nodes
      , q = d3.geom.quadtree(nodes)
      , i = 0
      , len = nodes.length;

    while (++i < len) {
      q.visit(this.collide(nodes[i], this.collisionAlpha));
    }
  },

  /** 
   * Updates the position of the nodes.
   */
  positionNodes: function() {
    this.d3Nodes.attr("transform", function(d) { 
      return "translate(" + d.x + "," + d.y + ")"; 
    });
  },

  /**
   * Updates the position of the links.
   */
  positionLinks: function() {
    // curve line between nodes
    this.d3Path.attr("d", function(d) {
      var dx = d.target.x - d.source.x
        , dy = d.target.y - d.source.y
        , dr = Math.sqrt(dx * dx + dy * dy);

      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    });
  },

  onCircleClick: function(d) {
    var self = this;

    // To avoid focusing hidden elements
    if (!self.isNodeVisible(d)) {
      return;
    } else {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }

    this.focus(d.id).update();
    this.emit("node:click", d);
  },

  onMouseOver: function(d) {
    var focusedNode = this.state.focused;

    if (!this.isNodeVisible(d)) {
      return;
    }

    var offset = { 
      left: currentMousePos.x + 10, 
      top: currentMousePos.y + 10 
    };

    this.showTooltip(offset, d);
    this.emit("node:mouseover", d, offset);
  },

  onMouseOut: function(d) {
    this.hideTooltip();

    if (!this.isNodeVisible(d)) {
      return;
    }

    this.emit("node:mouseout", d);
  },

  findFocusedNode: function(fn) {
    var n, i, len
      , nodes = this.nodes;

    for (var i=0, len=nodes.length; i<len; i++) {
      n = nodes[i];
      if (fn(n)) {
        return n;
      }
    }
  },

  focusNode: function(node) {
    var adjacents = this.adjacents[node.id];

    this.state.focused = node;

    if (adjacents) {
      this.state.adjacents = adjacents;
    }

    return node;
  },

  isSelected: function(node) {
    return node._selected;
  },

  isFocused: function(node) {
    return node._focused;
  },

  isAdjacent: function(node) {
    return node._adjacent;
  },

  hasFilters: function() {
    return !!this.filters.length;
  },

  hasAppliedFilters: function() {
    return !!this.appliedFilters.length;
  },
  
  hasFocus:function() {
    return !!this.state.focused;
  },

  isRendered: function() {
    return !!this.d3Circles;
  },
  
  getFilters: function() {
    return this.filters;
  },

  updateTitles: function() {
    this.d3TitleNodes.style("display", bind(this, this.titleDisplay));
  },

  updateCircles: function() {
    var self = this
      , count = 0;

    this.d3Circles
      .style('fill', function(e) {
        var el, $el, yes, no;

        e._selected = self.testFilters(e);
        e._focused = self.testFocused(e);
        e._adjacent = self.testAdjacent(e);

        el = this;
        $el = d3.select(el);
        yes = function(e, highlight) {
          // HACK: reordering for zindex
          el.parentNode.parentNode.appendChild(el.parentNode);
          $el.style("cursor", "pointer");

          var stroke = DEFAULT_CIRCLE_STROKE;
          if (highlight) {
            stroke = d3.rgb(self.getClusterColor(e)).darker();
          } 
          $el.style("stroke", stroke);
          return self.getClusterColor(e);
        }
        no = function(d) {
          $el.style("cursor", "default");
          $el.style("stroke", UNSELECTED_COLOR);
          return UNSELECTED_COLOR;
        }

        if (self.isNodeVisible(e)) {
          count += 1;

          if (self.isFocused(e)) {
            return yes(e, true);
          }

          return yes(e);
        } else {
          return no(e);
        }
      });

    this.visibleNodeCount = count;
  },

  updatePaths: function() {
    var self = this;

    this.d3Path
      .attr("stroke", function(e) {
        var yes = function(e) { return self.pathStroke(e) },
          no = UNSELECTED_COLOR;

        if (self.isNodeVisible(e.target) && self.isNodeVisible(e.source)) {
          return yes(e);
        } else {
          return no;
        }
      })
      .attr("stroke-width", function(e) {
        if (self.isFocused(e.source) || self.isFocused(e.target)) {
          return SELECTED_PATH_STROKE_WIDTH;
        }

        return DEFAULT_PATH_STROKE_WIDTH;
      });
  },

  /**
   * Updates the node's state.
   */
  update: function() {
    // flushing filters
    this.appliedFilters = this.filters;

    this.updateCircles();
    this.updatePaths();
    this.updateTitles();

    this.filters = [];

    if (!this.visibleNodeCount) {
      this.emit("no match");
    }
  },

  //resetView: function() {
  //  var circle = this.d3Circles;
  //  var path = this.d3Path;

  //  if (!this.isRendered()) return;

  //  circle.style('fill', bind(this, this.getClusterColor))
  //    .style("stroke", DEFAULT_CIRCLE_STROKE)
  //    .style("cursor", "pointer");

  //  path.attr("stroke-width", DEFAULT_PATH_STROKE_WIDTH)
  //    .attr("stroke", bind(this, this.pathStroke))

  //  this.updateTitles();

  //  return this;
  //},

  resetNode: function(node) {
    delete node._selected; 
    delete node._focused;
    delete node._adjacent;
  },

  resetState: function() {
    this.filters = [];
    this.appliedFilters = [];

    this.state = {
      adjacents: {},
      focused: null
    }

    this.d3Nodes && this.d3Nodes.each(bind(this, this.resetNode));

    return this;
  },

  reset: function() {
    this.resetState();
    this.update();
    //this.resetView();
  },

  addFilter: function(fn) {
    this.filters.push(fn);

    return this;
  },

  isNodeVisible: function(node) {
    if (this.hasAppliedFilters()) {
      if (this.hasFocus()) {
        if (this.isSelected(node) && (this.isAdjacent(node) 
          || this.isFocused(node))) {
          return true;
        } 
      } else if (this.isSelected(node)) {
        return true;
      }

      return false;

    } else if (this.hasFocus()) {
      if (this.isAdjacent(node) || this.isFocused(node)) {
        return true;
      }

      return false
    }

    return true;
  },

  testFilters: function(node) {
    var res = true,
      filters = this.filters,
      len=filters.length;

    if (!len) return false;

    for (var i=0; i<len; i++) {
      if (!filters[i](node)) {
        res = false;
        break;
      }
    }

    return res;
  },

  testFocused: function(node) {
    return this.state.focused && this.state.focused.id === node.id;
  },

  testAdjacent: function(node) {
    return !!this.state.adjacents[node.id]
  },

  fns: {
    text: 'filterByText',
    size: 'filterBySize',
    cluster: 'filterByCluster'
  },

  filterBy: function(key, val) {
    var fn = this[this.fns[key]];

    if (fn == null) {
      throw new Error("invalid key: " + key);
    }

    if (Array.isArray(val)) {
      return fn.apply(this, val);
    } else {
      return fn.call(this, val);
    }
  },

  /**
   * Will show all the nodes that match fn's result.
   * 
   * @api public
   */
  filter: function(obj) {
    var type = ({}).toString.call(obj);
    
    switch (type) {
      case "[object Function]":
        this.addFilter(obj);
      case "[object Object]":
        for (var arg in obj) {
          if (obj.hasOwnProperty(arg)) {
            this.filterBy(arg, obj[arg]);
          }
        }
        break;
      default:
        throw new Error("invalid argument");
    }

    return this;
  },

  /**
   * Will put focus in one node that matches the fn result
   * 
   * @api public
   *
   * @param fn {Object|Function|Number|String}
   * @param center {Boolean}
   */
  focus: function(fn) {
    var n, type = ({}).toString.call(fn);

    switch(type) {
      case '[object Function]':
        break;
      case '[object Object]':
        fn = toFunction(fn);
        break;
      case '[object Number]':
      case '[object String]':
        fn = toFunction({id: fn});
        break;
      default:
        throw new Error('invalid argument');
    }

    n = this.findFocusedNode(fn);

    if (n) {
      this.focusNode(n);
    }

    return this;
  },

  filterByText: function(text) {
    var matchText = text.toLowerCase(),
      getText = bind(this, this.getText);

    var fn = function(d) {
      var nodeText = getText(d).toLowerCase();
      return !!(~nodeText.indexOf(matchText));
    };

    this.addFilter(fn);

    return this;
  },

  filterByCluster: function(cluster) {
    var getCluster = bind(this, this.getCluster);
    var isArray = ({}).toString.apply(cluster) === '[object Array]';

    var fn = function(e) {
      var c = getCluster(e);

      if (c != null) {
        c = c.toString()
      }

      if (isArray) {
        return ~cluster.indexOf(c);
      }

      return c == cluster;
    };

    this.addFilter(fn);

    return this;
  },

  filterBySize: function(min, max) {
    var self = this;

    if (min == null) { min = -Infinity; }
    if (max == null) { max = Infinity; }

    var fn = function(d) {
      var s = self.getSize(d);
      return min <= s && s <= max;
    }

    this.addFilter(fn);
    return this;
  },

  /**
   * Prevents nodes from sticking up together ( best effort )
   */
  collide: function(node, alpha) {
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
        r= self.radiusScale(self.getSize(quad.point) ||1)*2;
        if (l < r) {
          l = (l - r) / l * alpha;
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

  location: function(p) {
    var translate = this.getTranslation()
      , scale = this.getScale();

    return [(p[0] - translate[0]) / scale, (p[1] - translate[1]) / scale];
  },

  point: function(l) {
    var translate = this.getTranslation()
      , scale = this.getScale();

    return [l[0] * scale + translate[0], l[1] * scale + translate[1]];
  },

  translateTo: function(p, l) {
    var translate = this.getTranslation();

    l = this.point(l);
    translate[0] += p[0] - l[0];
    translate[1] += p[1] - l[1];

    this._zoom.translate(translate);
  },
  /**
   * centers the graph on a point, if no point is passed, the mass center of
   * the graph is used.
   *
   * @api public
   *
   */
  _center: function(l) {
    var n;

    if (!l) {
      n = this.state.focused;
      if (n) {
        l = [ n.x, n.y ];
      } else {
        if (!this.massCenter) {
          this.computeCenterCoords();
        }

        l = this.massCenter;
      }
    }

    this.translateTo([this.width/2, this.height/2], l);
    this.refreshZoom(true);
  },

  center: function(nodeId) {
    var node;
    if (!this.isRendered()) {
      return;
    }

    node = this.getNode(nodeId);

    if (node) {
      this._center(node.x, node.y);
    } else {
      this._center();
    }

    return this;
  },

  getScale: function() {
    return this._zoom.scale();
  },

  getTranslation: function() {
    return this._zoom.translate();
  },

  getElement: function() {
    return d3.select(this.el);
  },

  getSize: function(node) {
    return this.nodeVal('size', node) || 0;
  },

  getText: function(node) {
    return this.nodeVal('text', node);
  },

  getCluster: function(node) {
    return this.nodeVal('cluster', node);
  },

  getClusters: function() {
    return this.colors;
  },

  getClusterColor: function(cluster) {
    var c;

    if (typeof cluster === "object") {
      c = this.getCluster(cluster);
    } else {
      c = cluster;
    }

    return this.colors[c];
  },

  tooltip: function(tmpl) {
    this._tooltip = new Tooltip({
      template: typeof tmpl == "string" ? tmpl : TOOLTIP_TEMPLATE
    }); 

    this.tooltipOn();

    return this;
  },

  showTooltip: function(offset, d) {
    this._tooltip && this._tooltipOn && this._tooltip.show(offset, d);
  },

  hideTooltip: function() {
    this._tooltip && this._tooltip.hide();
  },

  tooltipOn: function() {
    this._tooltipOn = true;
  },

  tooltipOff: function() {
    this.hideTooltip();
    this._tooltipOn = false;
  },

  getFocusedNode: function() {
    return this.state.focused;
  },

  getNode: function(nodeId) {
    return this.nodesHash[nodeId];
  },

  getAdjacents: function(nodeId) {
    var ret = []
      , adjacents = []; 

    if (nodeId == null) {
      adjacents = this.state.adjacents;
    } else {
      adjacents = this.adjacents[nodeId];
    }

    adjacents = adjacents || [];

    for (var id in adjacents) {
      ret.push(this.getNode(id));
    }

    return ret;
  }
}

Graph.fn = Graph.prototype;

Emitter(Graph.prototype);

var currentMousePos = { x: -1, y: -1 };
d3.select(window).on("mousemove", function(d) {
  var ev = d3.event;
  currentMousePos.x = ev.pageX;
  currentMousePos.y = ev.pageY;
});

module.exports = Graph;
