var d3 = require("d3");
const $ = require('jquery');
var isValidHttpUrl = require('./util.js');
var color = d3.scaleOrdinal(d3.schemeCategory10);

var showdata = function (term, displaydiv) {
    if(!displaydiv)
        console.log('No display div provided.');

    var iframe = displaydiv.find("iframe");
    if (isValidHttpUrl(term.id)) {
        iframe.attr('src', term.id);
    } else {
        iframe.attr('src', 'about:blank');
    }
};

export default class Canvas {
    constructor(div, displaydiv = undefined) {
        let t = this;
        // we pass a jquery object, but we need to go to the dom object for d3
        t.div = div[0];
        t.displaydiv = displaydiv;
        t.rect = t.div.getBoundingClientRect();
        t.width = t.div.scrollWidth;
        t.height = t.div.scrollHeight;
        t.center = { x: Math.round(t.width / 2), y: Math.round(t.height / 2) };

        window.addEventListener("resize", (x) => this.redraw());
    };

    init() {
        let t = this;

        t.graphData = { "nodes": [], "links": [] };

        // graph area
        let svg = d3.select(t.div)
            .append("svg")
            .attr('width', t.width)
            .attr('height', t.height)
            ;

        // Needs to be second, just after the svg itself.
        let background = t.initBackground(t, svg);
        // background

        // Holds child components (nodes, links), i.e. all but the background
        let svgGroup = svg
            .append('svg:g')
            .attr("id", "svgGroup");
        t.svgGroup = svgGroup;

        let graphLinksGroup =
            svgGroup
                .append("g")
            //.attr("class", "links")
            ;
        t.graphLinksGroup = graphLinksGroup;

        let graphNodesGroup =
            svgGroup
                .append("g")
            //.attr("class", "nodes")
            ;
        t.graphNodesGroup = graphNodesGroup;

        let zoom =
            d3.zoom()
                .on("zoom", () => t.handleZoom(svgGroup));
        background.call(zoom);

        // build the arrow.
        svg.append("svg:defs").selectAll("marker")
            .data(["end"])      // Different link/path types can be defined here
            .enter().append("svg:marker")    // This section adds in the arrows
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -1.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");

        let simulation = t.initSimulation();
        t.simulation = simulation;

        // update();
        t.update(t, simulation, graphNodesGroup, graphLinksGroup);
    }

    initBackground(t, svg) {
        let result = svg
            .append("rect")
            .attr("id", "backgroundId")
            .attr("fill", "#F2F7F0")
            .attr("class", "view")
            .attr("x", 0.5)
            .attr("y", 0.5)
            .attr("width", t.width - 1)
            .attr("height", t.height - 1);

        return result;
    }

    initSimulation() {
        let t = this;
        let result = d3.forceSimulation()
            .force("link", d3.forceLink().distance(300).id(function (d) { return d.id; }))
            .force("charge", d3.forceManyBody())
            .force("collide", d3.forceCollide())
            .force("center", d3.forceCenter(t.center.x, t.center.y));

        return result;
    }

    handleDragStarted(d, simulation) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    handleDragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    handleDragEnded(d, simulation) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = undefined;
        d.fy = undefined;
    }

    handleZoom(svgGroup) {
        svgGroup
            .attr("transform",
                `translate(${d3.event.transform.x}, ${d3.event.transform.y})` + " " +
                `scale(${d3.event.transform.k})`);
    }

    update(t, simulation, graphNodesGroup, graphLinksGroup) {
        let nodes = t.graphData.nodes;
        let links = t.graphData.links;

        let drag =
            d3.drag()
                .on("start", d => t.handleDragStarted(d, simulation))
                .on("drag", d => t.handleDragged(d))
                .on("end", d => t.handleDragEnded(d, simulation));

        // nodes
        let graphNodesData =
            graphNodesGroup
                .selectAll("g")
                .data(nodes, d => d.id);
        let graphNodesEnter =
            graphNodesData
                .enter()
                .append("g")
                .attr("id", d => d.id || null)
                // .on("mouseover", d => console.log(`d.id: ${d.id}`))
                .on("click", d => t.handleNodeClicked(d))
                .on("contextmenu", d => t.remove(d))
                .call(drag);
        let graphNodesExit =
            graphNodesData
                .exit()
                // .call((s) => console.log(`selection exiting. s: ${JSON.stringify(s)}`))
                .remove();

        let graphNodeCircles =
            graphNodesEnter
                .append("circle")
                .classed('node', true)
                .attr("fill", d => color(d.type))
                .attr("r", d => d.type === 'start' ? 10 : 5);

        let graphNodeLabels =
            graphNodesEnter
                //.append('a')
                //.attr("xlink:href", function(d){return d.id;})
                .append("text")
                .attr("id", d => "label_" + d.id)
                .attr('x', 6)
                .attr('y', 3)
                .text(function (d) { return d.label; })
                .on("click", (x) => showdata(x, t.displaydiv));

        // merge
        graphNodesData =
            graphNodesEnter.merge(graphNodesData);

        // links
        let graphLinksData =
            graphLinksGroup
                .selectAll("path")
                .data(links);

        let graphLinksEnter =
            graphLinksData
                .enter()
                .append("path")
                .attr("class", "link")
                .attr("marker-end", "url(#end)");

        let graphLinksExit =
            graphLinksData
                .exit()
                .remove();

        // merge
        graphLinksData =
            graphLinksEnter.merge(graphLinksData);

        simulation
            .nodes(nodes)
            .on("tick", handleTicked);

        simulation
            .force("link")
            .links(links);

        function handleTicked() {
            graphLinksData.attr("d", function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" +
                    d.source.x + "," +
                    d.source.y + "A" +
                    dr + "," + dr + " 0 0,1 " +
                    d.target.x + "," +
                    d.target.y;
            });

            // Translate the groups
            graphNodesData
                .attr("transform", d => { return 'translate(' + [d.x, d.y] + ')'; });
        }
    }

    add(d3graph) {
        let t = this;

        if (d3graph.nodes) {
            //nodesToAdd.forEach(n => t.graphData.nodes.push(n));
            d3graph.nodes.forEach(function (n) {
                if (!t.graphData.nodes.find(x => x.id == n.id)) {
                    t.graphData.nodes.push(n);
                }
            });
        }
        if (d3graph.links) {
            //linksToAdd.forEach(l => t.graphData.links.push(l));
            d3graph.links.forEach(function (n) {
                if (!t.graphData.links.find(x => x.id == n.id && x.source == n.source && x.target == n.target)) {
                    t.graphData.links.push(n);
                }
            });
        }

        t.simulation.stop()
        t.update(t, t.simulation, t.graphNodesGroup, t.graphLinksGroup)
        t.simulation.restart();
    }

    remove(dToRemove) {
        d3.event.preventDefault();
        let t = this;

        let currentNodes = t.graphData.nodes;
        let currentLinks = t.graphData.links;
        let nIndex = currentNodes.indexOf(dToRemove);
        if (nIndex > -1) {
            currentNodes.splice(nIndex, 1);
        }

        let toRemoveLinks = currentLinks.filter(l => {
            return l.source.id === dToRemove.id || l.target.id === dToRemove.id;
        });
        toRemoveLinks.forEach(l => {
            let lIndex = currentLinks.indexOf(l);
            currentLinks.splice(lIndex, 1);
        })

        t.update(t, t.simulation, t.graphNodesGroup, t.graphLinksGroup)
        t.simulation.restart();
        t.simulation.alpha(1);
    }

    clear() {
        d3.select("svg").remove();
        this.init();
    }

    handleNodeClicked(d) {
        // TODO IF USEFUL
    }
};