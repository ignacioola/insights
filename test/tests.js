var Insights = require("insights");
var expect = chai.expect;
var el = document.getElementById("insights");

jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

    e.dispatchEvent(evt);
  });
};

describe('graph', function(){
    var nodes = [ 
        { id: 1, text: "A", size: 10, cluster: 0 },
        { id: 2, text: "B", size: 20, cluster: 1 },
        { id: 3, text: "C", size: 30, cluster: 2 }
    ];
    var links = [ [1,2] ];

    this.timeout(10000);

    it('it should render correctly circles and paths.', function() {
        var graph = new Insights(el, nodes, links).render();
        var circles = el.getElementsByTagName("circle");
        var paths = el.getElementsByTagName("path");

        expect(circles.length).to.equal(nodes.length);
        expect(paths.length).to.equal(links.length);
    });

    it("it should trigger a 'rendered' event when finish rendering.", function(done) {
        var graph = new Insights(el, nodes, links).render();
        graph.on("rendered", done)
    });

    it("it should put focus on a node.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.focus(1);

        expect(graph.state.focused.id).to.equal(1);
        expect(graph.state.adjacents[2]).to.equal(true);
    });

    it("it should reset the graph when focus is put on a node", function() {

    });

    it("it should reset a focused state.", function() {

    });

    it("it should use an accessor function to get the id of the nodes", function() {
        var graph = new Insights(el, nodes, links);
          
          graph.attr("id", function(d) {
              return d.id;
            });

          graph.render();

      });

    //it('it should put focus on a node when clicked.', function(done) {
    //    var graph = new Insights(el, nodes, links);

    //    graph.on("rendered", function() {
    //        var $el = $("#insights .node", el).eq(0);
    //        var spy = sinon.spy(graph, "onCircleClick");

    //        $el.d3Click();

    //        expect(spy.called).to.be.ok;
    //        done();
    //    });

    //});
});

