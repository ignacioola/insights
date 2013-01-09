var minstache = require("minstache");

function Tooltip(options) {
    options = options || {};
    //this.template = options.template;
    this._data = {};

    this._createElement();

    try {
        this.renderTemplate = minstache.compile(options.template);
    } catch(err) {
        throw new Error("Error parsing tooltip template.", err);
    }
}

Tooltip.prototype = {
    constructor: Tooltip,
    elementId: "insights-tooltip",
    elementClass: "insights-tooltip",

    _createElement: function() {
        var found = document.getElementById(this.elementId);

        if (!found) {
            this.el = document.createElement("div");

            this.el.id = this.elementId;
            this.el.className = this.elementClass;
            this.el.style.position = "absolute";
            this.el.style.display = "none";
            document.body.appendChild(this.el);
        } else {
            this.el = found;
        }
    },

    render: function() {
        var content = this.renderTemplate(this.getData());

        if (!this._offset) throw new Error("Must set an offset");
        
        this.el.innerHTML = content;
        this.el.style.top = this._offset.top + "px";
        this.el.style.left = this._offset.left + "px";
        
        return this;
    },

    setOffset: function(offset) {
        this._offset = offset;
    },

    setData: function(data) {
        this._data = data;
    },

    getData: function() {
        return this._data;
    },

    show: function(offset, data) {
        offset && this.setOffset(offset);
        data && this.setData(data);
        this.render();

        this.el.style.display = "";
    },

    hide: function() {
        this.el.style.display = "none";
    }
};

module.exports = Tooltip;
