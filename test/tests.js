var Insights = require("insights");
var expect = chai.expect;
var el = document.getElementById("insights");

describe('graph', function(){

    var nodes = [ 
        { id: 1, text: "Apples", size: 10, cluster: 0 },
        { id: 2, text: "Bananas", size: 20, cluster: 1 },
        { id: 3, text: "Carrot", size: 30, cluster: 2 }
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

        graph.focus(1).render();

        graph.on('rendered', function() {
          expect(graph.state.focused.id).to.equal(1);
          expect(graph.state.adjacents[2]).to.equal(true);
          done();
        });
    });

    it("it should trigger an event when no nodes are matched.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.on('no match', done);

        graph.filter({ cluster: 'fakecluster' }).render();
    });

    it("it should filter nodes by size.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({size: [1, 11]}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(1);
          done();
        });
    });

    it("it should filter nodes by size lower than.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({size: [null, 21]}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(2);
          done();
        });
    });

    it("it should filter nodes by size greater than.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({size: [19, null]}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(2);
          done();
        });
    });

    it("it should filter nodes by cluster.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({cluster: 0}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(1);
          done();
        });
    });

    it("it should filter nodes by more than one cluster.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({cluster: [0, 1]}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(2);
          done();
        });
    });

    it("it should filter nodes by id.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({id: 1}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(1);
          done();
        });
    });

    it("it should filter nodes by partial text match.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({text: "Appl"}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(1);
          done();
        });
    });

    it("it should filter nodes by more than one filter.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({size: [0, 21], cluster: [0, 1]}).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(2);
          done();
        });
    });

    it("it should combine focus and filters correctly.", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.filter({size: [0, 21]}).focus(1).render();

        graph.on('rendered', function() {
          expect(graph.visibleNodeCount).to.equal(2);
          expect(graph.state.focused.id).to.equal(1);
          expect(graph.state.adjacents[2]).to.equal(true);
          done();
        });
    });

    it("it should return a node's adjacent nodes", function(done) {
        var graph = new Insights(el, nodes, links);

        graph.render();

        graph.on('rendered', function() {
          expect((graph.getAdjacents(1))['2']).to.equal(true);
          done();
        });
    });
});

