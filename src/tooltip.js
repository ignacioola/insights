
function Tooltip(options) {
    options = options || {};
    this.template = options.template;
    this._data = {};

    this._createElement();
}

Tooltip.prototype = {
    constructor: Tooltip,

    _createElement: function() {
        this.el = document.createElement("div");

        this.el.id = "insights-tooltip";
        this.el.className = "insights-tooltip";
        this.el.style.position = "absolute";
        this.el.style.display = "none";
        document.body.appendChild(this.el);
    },

    render: function() {
        var content = Mustache.render(this.template, this.getData());

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
