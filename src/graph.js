var bind = require("bind")
  , Emitter = require("emitter")
  , d3 = require("d3")
  , toFunction = require('to-function')
  , Tooltip = require("./tooltip");

// Constants
var UNSELECTED_COLOR = "transparent";
var PATH_STROKE_WIDTH = .3;
var SELECTED_PATH_STROKE_WIDTH = 1.5;
var CIRCLE_STROKE = "#FFF";
var BASE_ELEMENT_CLASS = "insights-graph";
var RADIUS_RANGE = [6, 40];
var TITLE_RANGE = [0, 1];

// Defaults
var defaults = {
  width: 1200,
  height: 700, 
  collisionAlpha: .5,
  forceAlphaLimit: 0.02,
  linkStrength: 1,
  linkDistance: 60,
  graphCharge: -300,
  gravity: 0.1,
  zoomScaleExtent: [0.3, 2.3],
  tooltipTemplate: "<div>text: {{text}}</div> <div>size: {{size}}</div>"
};

// Valid attribute keys for a node
var VALID_ATTRS = ['id', 'size', 'cluster', 'text'];

/**
 * Creates a new `Graph` instance.
 *
 * @constructor Graph
 */

function Graph(el, nodes, links, options) {

  // main element
  this.el = el;

  // option cache
  this.opts = {};

  options = options || {};

  this.opts.width = options.width || defaults.width;
  this.opts.height = options.height || defaults.height;
  this.opts.color = d3.scale.category20();
  this.opts.colors = options.colors || {};
  this.opts.collisionAlpha = options.collisionAlpha || defaults.collisionAlpha;
  this.opts.initialScale = options.initialScale;
  this.opts.zoomScaleExtent = options.zoomScaleExtent || options.scaleExtent 
                              || defaults.zoomScaleExtent;

  this.args = {
    nodes: nodes,
    links: links
  };

  // initialize some attributes
  this.resetState();

  // activating tooltip
  options.tooltip && this.tooltip(options.tooltip);
}

Graph.version = "0.12";

Graph.prototype = {
  constructor: Graph,

  /**
   * Initializes the graph
   *
   * @api public
   */

  init: function() {
    var self = this;
    var el = this.getElement();

    this.compute(this.args.nodes, this.args.links);
    this.computeScales();
    this.initZoom();

    el.html("");

    var svg = el.attr("class", BASE_ELEMENT_CLASS) 
      .append("svg")
        .attr("width", this.opts.width)
        .attr("height", this.opts.height)
        .attr("pointer-events", "all")
        .call(this._zoom.on("zoom", bind(this, this.onZoom))
                        .scaleExtent(this.opts.zoomScaleExtent));

    this.parent = svg.append('svg:g').style('display','none');

    var clickedX, clickedY;

    el.on("mousedown", function() { 
      clickedX = d3.event.x; 
      clickedY = d3.event.y; 
    });

    el.on("click", function() { 

        // avoid reset when dragging
        if (d3.event.x != clickedX || d3.event.y != clickedY) { 
          return;
        }
        
        self.reset() 
      });

  },

  /**
   * Initializes zoom
   *
   * @api private
   */

  initZoom: function() {
    this._zoom = d3.behavior.zoom();

    if (this.opts.initialScale) {
      this._zoom = this._zoom.scale(this.opts.initialScale);
    }
  },

  /**
   * Builds relevant data to render the graph
   *
   * @api private
   */

  compute: function(nodes, links) {
    var self = this
      , nodesObj = {}
      , clustersObj = {}
      , maxSize = 0
      , maxWeight = 0
      , incoming = {}
      , outgoing = {}
      , linksList = []
      , getCluster = bind(this, this.getCluster)
      , getSize = bind(this, this.getSize);

    nodes.forEach(function(n) {
      var cluster = getCluster(n);

      maxSize = Math.max(maxSize, getSize(n));
      nodesObj[n.id] = nodesObj[n.id] || n;

      if (cluster != null && clustersObj[cluster] == null) {

        // obtain color from options
        var color = self.opts.colors[cluster];

        // initialize cluster
        clustersObj[cluster] = {};

        // save color for cluster
        clustersObj[cluster].color = color || self.opts.color(cluster);
      }
    });

    // Compute the distinct nodes from the links.
    links.forEach(function(link) {

      // try to find the nodes in the relation.
      var id0 = link[0]
        , id1 = link[1]
        , source = nodesObj[id0]
        , target = nodesObj[id1];

      // if we dont find one node of the relation, we dismiss it.
      if (!source || !target) return;
      
      // We add the relations to the outgoing hash
      if (!(id0 in outgoing)) {
        outgoing[id0] = {};
      } 

      // We add the relations to the incoming hash
      if (!(id1 in incoming)) {
        incoming[id1] = {};
      }

      outgoing[id0][id1] = true;
      incoming[id1][id0] = true;

      // build link list
      linksList.push({
        source: source,
        target: target
      });
    });

    this.nodes = nodes;
    this.links = linksList;
    this.maxSize = maxSize;
    this.incoming = incoming;
    this.outgoing = outgoing;
    this.nodesObj = nodesObj;
    this.clustersObj = clustersObj;
  },

  /**
   * Creates scales
   *
   * @api private
   */

  computeScales: function() {
    this.radiusScale = d3.scale.sqrt().domain([1, this.maxSize]).range(RADIUS_RANGE);
    this.titleScale = d3.scale.log().domain([1, this.maxSize]).range(TITLE_RANGE);
  },

  /**
   * Calculates the mass center of the graph
   *
   * @api private
   */

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


  /**
   * Tells which attribute to use to extract a standarized attribute's value.
   *
   * @api private
   */

  attr: function(key, fn) {

    if (~VALID_ATTRS.indexOf(key)) {
      this.attrs[key] = fn;
    }

    return this;
  },

  /**
   * Obtains a node's value for one of the standarized attribute names
   *
   * @api private
   */

  nodeVal: function(key, node) {
    var val = this.attrs[key];
    
    if (val == null) {
      return node[key];
    } else if (typeof val === "function") {
      return val(node);
    }

    return;
  },

  /**
   * Handler for zoom event
   *
   * @api private
   */

  onZoom: function() {
    this.refreshZoom();
  },

  /**
   * Refresh the zoom in the view to the currently applied state
   *
   * @api private
   */

  refreshZoom: function(animate) {
    var zoom = this._zoom
      , trans = this.getTranslation()
      , scale = this.getScale();
    
    if (animate) {
      this.parent.transition().duration(500).attr('transform', 
        'translate(' + zoom.translate() + ') scale(' + zoom.scale() + ')');
    } else {
      this.parent.attr("transform", "translate(" + trans + ")" + " scale(" + scale + ")");
    }

    this.updateTitles();
  },

  /**
   * Applies zoom to a given scale between 0 and 1.
   *
   * @api public
   */

  zoom: function(scale) {
    var zoom , point , loc;

    if (!this.isRendered()) {
      // keep the scale for when render() is called & exit
      this.opts.initialScale = scale;
      return this;
    }

    zoom = this._zoom;
    point = [this.opts.width/2, this.opts.height/2];
    loc = this.location(point);
    
    // scale zoom
    zoom.scale(scale);

    // mantain position of the graph
    this.translateTo(point, loc);

    // applies zoom to the view with an animation
    this.refreshZoom(true);

    return this;
  },

  /**
   * Applies zoom in
   *
   * @api public
   */

  zoomIn: function() {
    var scale = this.getScale()
      , k = Math.pow(2, Math.floor(Math.log(scale) / Math.LN2) + 1);

    k = Math.min(k, this.opts.zoomScaleExtent[1]);
      
    return this.zoom(k);
  },

  /**
   * Applies zoom out
   *
   * @api public
   */

  zoomOut: function() {
    var scale = this.getScale();
    var k = Math.pow(2, Math.ceil(Math.log(scale) / Math.LN2) - 1);

    k = Math.max(k, this.opts.zoomScaleExtent[0]);
      
    return this.zoom(k);
  },

  /**
   * Given the current zoom and size of a node, tells if it's label should
   * be displayed
   *
   * @api private
   */

  isTitleDisplayable: function(d) {
    var scale = this.getScale();
    var res = this.titleScale(this.getSize(d) || 1);

    return (scale * res > .8 || scale > 2.2 );
  },

  /**
   * Helper to determine the display attribute of for a node.
   *
   * @api private
   */

  titleDisplay: function(d) {
    if (this.isTitleDisplayable(d) && this.isNodeVisible(d)) {
      return "";
    }

    return "none";
  },

  /**
   * Helper to determine the color of the path's stroke for a node.
   *
   * @api private
   */

  pathStroke: function(d) {
    var source = d.source,
      target = d.target;

    if (this.getSize(target) > this.getSize(source)) {
      return this.getClusterColor(target);
    } else {
      return this.getClusterColor(source);
    }
  },

  /**
   * Renders the graph
   *
   * @api public
   */

  render: function() {
    var self = this;

    this.init();
    
    function circleRadius(d) { return self.radiusScale(self.getSize(d) || 1); }

    var force = this.force = d3.layout.force()
      .nodes(this.nodes)
      .links(this.links)
      .size([this.opts.width, this.opts.height])
      .linkDistance(defaults.linkDistance)
      .charge(defaults.graphCharge)
      .gravity(defaults.gravity)
      .on("tick", tick)
      .start();

    this.d3Path = this.parent.append("svg:g").selectAll("path")
      .data(force.links())
      .enter().append("svg:path")
      .attr("stroke", bind(this, this.pathStroke))
      .attr("stroke-width", PATH_STROKE_WIDTH)
      .attr("fill", "none");
    
    var node = this.d3Nodes = this.parent.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .on("mouseover", bind(this, this.onMouseOver))
      .on("mouseout", bind(this, this.onMouseOut))
      .on("click", bind(this, this.onCircleClick));

    this.d3Circles = node.append("circle")
      .style("fill", bind(this, this.getClusterColor))
      .attr("r", circleRadius)

    this.d3TitleNodes = node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("display", "none")
      .text(function(d) { return self.getText(d); });

    function tick(e) {
      //var progress = Math.round((1 - (e.alpha * 10 - 0.1)) * 100);

      if (force.alpha() < defaults.forceAlphaLimit) {
        self.handleCollisions();
        
        // to prevent the chart from moving after
        force.stop();

        self.updateNodesPosition();
        self.updateLinksPosition();

        // center the graph
        self._center();

        // showing canvas after finished rendering
        self.show();

        self.refreshZoom();
        self.emit("rendered");
      }
    }
    
    if (this.hasUnappliedFilters() || this.hasUnappliedFocus()) { 
      this.update();
    }

    return this;
  },

  /**
   * Shows the graph
   *
   * @api private
   */

  show: function() {
    this.parent.style('display','block');
  },

  /**
   * Hides the graph
   *
   * @api private
   */

  hide: function() {
    this.parent.style('display','none');
  },

  /**
   * Tries to prevent nodes to sticking to each other
   *
   * @api private
   */

  handleCollisions: function() {
    var nodes = this.nodes
      , q = d3.geom.quadtree(nodes)
      , i = 0
      , len = nodes.length;

    while (++i < len) {
      q.visit(this.collide(nodes[i], this.opts.collisionAlpha));
    }
  },

  /** 
   * Updates the position of the nodes.
   *
   * @api private
   */

  updateNodesPosition: function() {
    this.d3Nodes.attr("transform", function(d) { 
      return "translate(" + d.x + "," + d.y + ")"; 
    });
  },

  /**
   * Updates the position of the links.
   *
   * @api private
   */

  updateLinksPosition: function() {

    // Render a curve line between nodes.
    
    this.d3Path.attr("d", function(d) {
      var dx = d.target.x - d.source.x
        , dy = d.target.y - d.source.y
        , dr = Math.sqrt(dx * dx + dy * dy);

      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    });
  },

  /**
   * Handler for circle click event
   *
   * @api private
   */

  onCircleClick: function(d) {
    var self = this
      , e = d3.event;

    // To avoid focusing hidden elements
    if (!self.isNodeVisible(d)) {
      return;
    } else {
      e.preventDefault();
      e.stopPropagation();
    }

    this.focus(d.id).update();
    this.emit("node:click", d);
  },

  /**
   * Handler for circle mouse over event
   *
   * @api private
   */

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

  /**
   * Handler for circle mouse out event
   *
   * @api private
   */

  onMouseOut: function(d) {
    this.hideTooltip();

    if (!this.isNodeVisible(d)) {
      return;
    }

    this.emit("node:mouseout", d);
  },

  /**
   * Finds the first node that matches the passed fn
   *
   * @api private
   */

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

  /**
   * Sets the graph's state to focus on the passed node.
   *
   * @api private
   */

  setFocus: function(node) {
    var dir = this.getFocusDir();
    var adjacents = this.getAdjacents(node.id, dir);

    this.state.focused = node;

    if (adjacents) {
      this.state.adjacents = adjacents;
    }

    return node;
  },

  /**
   * Tells if a node passes the currently applied filters.
   *
   * @api private
   */

  passesFilters: function(node) {
    return node._selected;
  },

  /**
   * Tells if a node is currently focused.
   *
   * @api private
   */

  isFocused: function(node) {
    return node._focused;
  },

  /**
   * Tells if a node is currently adjacent to the focused node
   *
   * @api private
   */

  isAdjacent: function(node) {
    return this.state.adjacents[node.id];
    //return node._adjacent;
  },

  /**
   * Tells if the graph has currently un-applied filters (filters that haven't
   * been applied to the view)
   *
   * @api private
   */

  hasUnappliedFilters: function() {
    return !!this.filters.length;
  },

  /**
   * Tells if the graph has currently applied filters (filters that have been 
   * applied to the view)
   *
   * @api private
   */

  hasAppliedFilters: function() {
    return !!this.appliedFilters.length;
  },
  
  /**
   * Tells if the graph has a current focused node.
   *
   * @api private
   */

  hasFocus:function() {
    return !!this.state.focused;
  },
  
  /**
   * Tells if the graph has a pending focus.
   *
   * @api private
   */

  hasUnappliedFocus:function() {
    return !!this.unappliedFocus;
  },

  /**
   * Tells if the graph has been rendered.
   *
   * @api private
   */

  isRendered: function() {
    return !!this.d3Circles;
  },
  
  /**
   * Updates the titles dom representation with the current state.
   *
   * @api private
   */

  updateTitles: function() {
    this.d3TitleNodes.style("display", bind(this, this.titleDisplay));
  },

  /**
   * Updates the circles dom representation with the current state.
   *
   * @api private
   */

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

          var stroke = CIRCLE_STROKE;
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

  /**
   * Returns focus dir
   *
   * @api private
   */

  getFocusDir: function() {
    var opts = this.focusOptions || {};

    if (opts.out) { 
      return 'out';
    }

    if (opts.in) { 
      return 'in';
    }

  },

  /**
   * Updates the paths dom representation with the current state.
   *
   * @api private
   */

  updatePaths: function() {
    var self = this;
    var focusDir = this.getFocusDir();

    this.d3Path
      .attr("stroke", function(e) {
        var yes = function(e) { return self.pathStroke(e) },
          no = UNSELECTED_COLOR;

        if (self.isPathVisible(e.source, e.target)) {
          return yes(e);
        } else {
          return no;
        }
      })
      .attr("stroke-width", function(e) {
        if (self.isFocused(e.source) || self.isFocused(e.target)) {
          return SELECTED_PATH_STROKE_WIDTH;
        }

        return PATH_STROKE_WIDTH;
      });
  },

  /**
   * Updates the all nodes with the graph's current state. 
   *
   * @api public
   */

  update: function() {

    // try to apply focus
    var focusFn = this.unappliedFocus;
    
    if (focusFn != null) {
      this._focus(focusFn);
    }

    // store the currently applied filters
    this.appliedFilters = this.filters;

    // update the view: circles, paths and titles

    this.updateCircles();
    this.updatePaths();
    this.updateTitles();

    // flushing filters
    this.filters = [];

    // pending center
    if (this.unappliedCenter) {
      this.unappliedCenter = false;
      this._center();
      this.refreshZoom(true);
    }

    // With the currently applied filters we found no matching nodes

    if (!this.visibleNodeCount) {
      this.emit("no match");
    }
  },

  /**
   * Resets a nodes state ( flags applied to it )
   *
   * @api private
   */

  resetNode: function(node) {
    delete node._selected; 
    delete node._focused;
    delete node._adjacent;
  },

  /**
   * Cleans the graph state ( filters and focus applied )
   *
   * @api private
   */

  resetState: function() {
    this.attrs = {};
    this.filters = [];
    this.appliedFilters = [];
    this.unappliedFocus = null;
    this.unappliedCenter = null;
    this.focusOptions = null;

    this.state = { adjacents: {}, focused: null };

    this.d3Nodes && this.d3Nodes.each(bind(this, this.resetNode));

    return this;
  },


  /**
   * Resets the graph and updates the view
   *
   * @api public
   */

  reset: function() {
    this.resetState();
    this.update();

    return this;
  },

  /**
   * Adds a filter to the graph
   *
   * @api private
   */

  addFilter: function(fn) {
    this.filters.push(fn);

    return this;
  },

  /**
   * Given the current state of the graph (focus and filters), 
   * tells if a node is visible.
   *
   * @api private
   */

  isNodeVisible: function(node) {
    if (this.hasAppliedFilters()) {
      if (this.hasFocus()) {
        if (this.passesFilters(node) && (this.isAdjacent(node) 
          || this.isFocused(node))) {
          return true;
        } 
      } else if (this.passesFilters(node)) {
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

  /**
   * Tells if a path is visible
   */

  isPathVisible: function(source, target) {

    if (!this.isNodeVisible(target) || !this.isNodeVisible(source)) {
      return false
    }

    var adjacents = this.state.adjacents;
    var dir = this.getFocusDir();

    if (this.hasFocus()) {

      if (dir == 'out' && this.isFocused(source) && adjacents[target.id]) {
          return true;
      } else if (dir == 'in' && this.isFocused(target) && adjacents[source.id]) {
          return true;
      } else if (!dir) {
        return true;
      } else {
        return false;
      }
    }

    return true;
  },

  /**
   * Tests if the node is visible with the currently applied filters
   *
   * @api private
   */

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

  /**
   * Tests if a node is focused
   *
   * @api private
   */

  testFocused: function(node) {
    return this.state.focused && this.state.focused.id === node.id;
  },

  /**
   * Tests if a node is adjacent to the currently selected node
   *
   * @api private
   */

  testAdjacent: function(node) {
    return !!this.state.adjacents[node.id]
  },

  // Functions used to filter nodes by attr name

  fns: {
    id: 'filterById',
    text: 'filterByText',
    size: 'filterBySize',
    cluster: 'filterByCluster'
  },

  /**
   * Applies a filters for a given node's arg.
   *
   * @api private
   */

  filterBy: function(key, val) {
    var fn = this[this.fns[key]];

    if (fn == null) {
      throw new Error("invalid key: " + key);
    }

    return fn.call(this, val);
  },

  /**
   * Will test and set the node's state that pass the filters.
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
   * Will set the graph to focus on the node that matches the passed arg, the 
   * next time that `update()` is called.
   * 
   * @api public
   *
   * @param {Object|Function|Number|String} fn
   */

  focus: function(fn, options) {
    this.unappliedFocus = fn;
    this.focusOptions = options;

    return this;
  },

  /**
   * Actually focuses the graph on the node that matches the passed arg.
   * 
   * @api public
   *
   * @param {Object|Function|Number|String} fn
   */

  _focus: function(fn) {
    var n, type = ({}).toString.call(fn);

    switch(type) {
      case '[object Function]':
        n = this.findFocusedNode(fn);
        break;
      case '[object Object]':
        fn = toFunction(fn);
        n = this.findFocusedNode(fn);
        break;
      case '[object Number]':
      case '[object String]':
        //fn = toFunction({id: fn});
        n = this.getNode(fn);
        break;
      default:
        throw new Error('invalid argument');
    }

    if (n) {
      this.setFocus(n);
    }

    this.unappliedFocus = null;

    return this;
  },

  /**
   * Adds an id filter to be applied
   *
   * @api private
   */

  filterById: function(id) {

    var fn = function(d) {
      return id == d.id;
    };

    this.addFilter(fn);

    return this;
  },

  /**
   * Adds a text filter to be applied
   *
   * @api private
   */

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

  /**
   * Adds a cluster filter to be applied
   *
   * @api private
   */

  filterByCluster: function(cluster) {
    var getCluster = bind(this, this.getCluster);
    var isArray = Array.isArray(cluster);

    // we need clusters as strings
    if (isArray) {
      cluster = cluster.map(function(c) { return c + "" });
    } else {
      cluster = cluster + ""
    }

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

  /**
   * Adds a size filter to be applied
   *
   * @api private
   */

  filterBySize: function(bounds) {
    var self = this;
    var min = bounds[0];
    var max = bounds[1];

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
   *
   * @api private
   */

  collide: function(node, alpha) {
    var self = this,
      r = node.radius + 15,
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

  /**
   * @api private
   */

  location: function(p) {
    var translate = this.getTranslation()
      , scale = this.getScale();

    return [(p[0] - translate[0]) / scale, (p[1] - translate[1]) / scale];
  },

  /**
   * @api private
   */

  point: function(l) {
    var translate = this.getTranslation()
      , scale = this.getScale();

    return [l[0] * scale + translate[0], l[1] * scale + translate[1]];
  },

  /**
   * @api private
   */

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
   * @api private
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

    this.translateTo([this.opts.width/2, this.opts.height/2], l);
  },

  /**
   * centers the graph on a node by id, if no id is passed, the mass center of
   * the graph is used.
   *
   * @api public
   *
   */

  center: function(nodeId) {
    var node;

    if (this.hasUnappliedFilters() || this.hasUnappliedFocus()) { 
      this.unappliedCenter = true;
      return this;
    }

    if (!this.isRendered()) {
      return this;
    }

    node = this.getNode(nodeId);

    if (node) {
      this._center([node.x, node.y]);
    } else {
      this._center();
    }

    this.refreshZoom(true);

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
    return this.clustersObj;
  },

  getClusterColor: function(cluster) {
    var c;

    if (typeof cluster === "object") {
      c = this.getCluster(cluster);
    } else {
      c = cluster;
    }

    return (this.clustersObj[c] || {}).color;
  },

  tooltip: function(tmpl) {
    this._tooltip = new Tooltip({
      template: typeof tmpl == "string" ? tmpl : defaults.tooltipTemplate
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
    return this.nodesObj[nodeId];
  },

  /**
   * Returns the nodes adjacent to the received node id
   *
   * @api private
   */

  getAdjacents: function(nodeId, dir) {
    var obj = {};
    var i = this.incoming[nodeId] || {};
    var o = this.outgoing[nodeId] || {};

    var k;

    if (dir == 'in' || !dir) {
      for (k in i) {
        obj[k] = i[k];
      }
    }

    if (dir == 'out' || !dir) {
      for (k in o) {
        obj[k] = o[k];
      }
    }

    // XXX dont do this
    obj[nodeId] = true;

    return obj;
  },

  getIncoming: function(nodeId) {

    return this.getAdjacents(nodeId, 'in');
  },

  getOutgoing: function(nodeId) {

    return this.getAdjacents(nodeId, 'out');
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
