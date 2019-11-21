var svg = d3.select("svg").attr('width', Math.max(window.innerWidth,1300))
width = +svg.attr("width"),
    height = +svg.attr("height");
var color = d3.scaleOrdinal(d3.schemeCategory20);
var forceGraph_Configs = {
    startRatio: 1,
    endRatio: 0.001,
    damping_l: 0.005,
    damping_v: 0.6,
    stepRatio: 0.001,
    initialRadius: 10,
    initialAngle: Math.PI * 0.797,
    renderStraightLine: true,
    distanceRatio: 1,
    strengthRatio: 1
}
var edgeNum;
function retOrig(x) {
    return function() {
        return x;
    };
}
function index(d) {
    return d.index;
}
function find(nodeById, nodeId) {
    var node = nodeById.get(nodeId);
    if (!node) throw new Error("missing: " + nodeId);
    return node;
}
function renderForceDirectedGraph(nodes) {
    if (!nodes) nodes = [];
    var stepRatio = forceGraph_Configs.stepRatio;
    var stepper = d3.timer(step),
        field = d3.map(),
        event = d3.dispatch("tick", "end");
    function step() {
        tick();
        event.call("tick", forceGraph);
        if (forceGraph_Configs.startRatio < forceGraph_Configs.stepRatio) {
            stepper.stop();
            event.call("end", forceGraph);
        }
    }
    function tick() {
        forceGraph_Configs.startRatio += (forceGraph_Configs.stepRatio - forceGraph_Configs.startRatio) * forceGraph_Configs.damping_l;
        //if (forceGraph_Configs.startRatio < 0.18) forceGraph_Configs.startRatio = 0.3;
        field.each(function(force) {
            force(forceGraph_Configs.startRatio);
        });
        var node;
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            if (!node.fx) {
                node.vx *= forceGraph_Configs.damping_v;
                node.x += node.vx;
            } else
                node.x = node.fx, node.vx = 0;

            if (!node.fy) {
                node.vy *= forceGraph_Configs.damping_v;
                node.y += node.vy;
            } else
                node.y = node.fy, node.vy = 0;
        }
    }
    forceGraph = {
        nodes: function(tmp) {
            return (nodes = tmp, render_nodes(), field.each(render), forceGraph)
        },
        stepRatio: function(tmp) {
            return arguments.length ? (stepRatio = +tmp, forceGraph) : forceGraph_Configs.stepRatio;
        },
        force: function(name, tmp) {
            return arguments.length > 1 ? (field.set(name, render(tmp)), forceGraph) : field.get(name);
        },
        on: function(name, tmp) {
            return arguments.length > 1 ? (event.on(name, tmp), forceGraph) : event.on(name);
        },
        restart: function() {
            return stepper.restart(step), forceGraph;
        },
    };
    function render_nodes() {
        for (var i = 0, n = nodes.length, node; i < n; ++i) {
            node = nodes[i], node.index = i;
            var radius = forceGraph_Configs.initialRadius * Math.sqrt(i),
                angle = i * forceGraph_Configs.initialAngle;
            node.x = radius * Math.cos(angle);
            node.y = radius * Math.sin(angle);
            node.vx = node.vy = 0;
        }
    }
    function render(f) {
        if (f.initialize)
            f.initialize(nodes);
        return f;
    }
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
        node = nodes[i], node.index = i;
        var radius = forceGraph_Configs.initialRadius * Math.sqrt(i),
            angle = i * forceGraph_Configs.initialAngle;
        node.x = radius * Math.cos(angle);
        node.y = radius * Math.sin(angle);
        node.vx = node.vy = 0;
    }
    return forceGraph;
}
var strengths;
var strength;
var distances;
function calLink(links) {
    var id = index,
        distance,
        nodes,
        count,
        bias,
        iterations = 1;
    if (links == null) links = [];
    function force(alpha) {
        for (var k = 0, n = links.length; k < iterations; ++k) {
            for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
                link = links[i], source = link.source, target = link.target;
                x = target.x + target.vx - source.x - source.vx || d3.jiggle();
                y = target.y + target.vy - source.y - source.vy || d3.jiggle();
                l = Math.sqrt(x * x + y * y);
                l = (l - distances[i] * forceGraph_Configs.distanceRatio) / l * alpha * strengths[i] * forceGraph_Configs.strengthRatio;
                x *= l, y *= l;
                target.vx -= x * (b = bias[i]);
                target.vy -= y * b;
                source.vx += x * (b = 1 - b);
                source.vy += y * b;
            }
        }
    }
    function initialize() {
        if (!nodes) return;
        var i,
            n = nodes.length,
            m = links.length,
            nodeById = d3.map(nodes, id),
            link;
        for (i = 0, count = new Array(n); i < m; ++i) {
            link = links[i], link.index = i;
            if (typeof link.source !== "object") link.source = find(nodeById, link.source);
            if (typeof link.target !== "object") link.target = find(nodeById, link.target);
            count[link.source.index] = (count[link.source.index] || 0) + 1;
            count[link.target.index] = (count[link.target.index] || 0) + 1;
        }
        for (i = 0, bias = new Array(m); i < m; ++i) {
            link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
        }
        strengths = new Array(m), initializeStrength();
        distances = new Array(m), initializeDistance();
    }
    function initializeStrength() {
        if (!nodes) return;
        for (var i = 0, n = links.length; i < n; ++i) {
            strengths[i] = +strength(links[i], i, links);
        }
    }
    function initializeDistance() {
        if (!nodes) return;
        for (var i = 0, n = links.length; i < n; ++i) {
            distances[i] = +distance(links[i], i, links);
        }
    }
    force.initialize = function(tmp) {
        nodes = tmp;
        initialize();
    };
    force.links = function(tmp) {
        return arguments.length ? (links = tmp, initialize(), force) : links;
    };
    force.strength = function(tmp) {
        return arguments.length ? (strength = typeof tmp === "function" ? tmp : retOrig(+tmp), initializeStrength(), force) : strength;
    };
    force.distance = function(tmp) {
        return arguments.length ? (distance = typeof tmp === "function" ? tmp : retOrig(+tmp), initializeDistance(), force) : distance;
    };
    return force;
}
var graphContainer = renderForceDirectedGraph();


var graph = {
    nodes: [],
    links: []
}
var isChosen = false;
var highlightedId = -1;
d3.json("data/connections.json", function(error, data) {
    if (error) throw error;
    graphContainer.force("link", calLink().distance(20).strength(0.2))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(680, 420));
    graph = data;
    edgeNum = data.links.length;


    var nodes = graph.nodes,
        nodeById = d3.map(nodes, function(d) {
            return d.id;
        }),
        links = graph.links,
        bilinks = [];

    links.forEach(function(link) {
        var s = link.source = nodeById.get(link.source),
            t = link.target = nodeById.get(link.target),
            i = {};
        nodes.push(i);
        links.push({
            source: s,
            target: i
        }, {
            source: i,
            target: t
        });
        bilinks.push([s, i, t]);
    });

    var link = svg.selectAll(".link")
        .data(bilinks)
        .enter().append("path")
        .attr("class", "link")
        .attr("id", function(e, i) { return "link" + i })
        //.attr('stroke', 'rgba(190, 190, 190, .9)')

    var node = svg.selectAll(".node")
        .data(nodes.filter(function(d) {
            return d.id;
        }))
        .enter()
        .append("g").attr("id", function(d) {
            return "node" + d.id;
        })
        .on('mouseover', function(d) {
            d3.select('.boxshadowedDiv2').classed('boxshadowedDiv2-moved', true);
            if (!lockedLink) {
                var linkNum = 0;
                d3.select("#name" + d.id).attr('class', 'op1')
                graph.links.slice(0, edgeNum).forEach(function(t, i) {
                    if (t.source.id == d.id || t.target.id == d.id) {
                        d3.select("#link" + i)
                            .attr('class', 'link-highlight')
                        linkNum++;
                    } else {
                        d3.select("#link" + i)
                            .attr('class', 'link')
                    }
                })
                d3.select('.imagefit').attr('src', 'resource/images/' + d.id + '.jpg')
                document.getElementById('ArtistLink').innerHTML = linkNum;
                document.getElementById('ArtistName').innerHTML = graph.nodes[d.id].name;
                document.getElementById('ArtistBirth').innerHTML = artistInfo[d.id].birth_date + ', in ' + artistInfo[d.id].birth_place;
                document.getElementById('ArtistDeath').innerHTML = artistInfo[d.id].death_date + ', in ' + artistInfo[d.id].work_locations;
                document.getElementById('ArtistLikes').innerHTML = artistInfo[d.id].likes.length > 0 ? artistInfo[d.id].likes : '-';
            }
        })
        .on('mouseout', function(d) {
            if (!lockedLink) {
                d3.select("#name" + d.id).attr('class', 'op0')
                isChosen = false;
                graph.links.slice(0, edgeNum).forEach(function(t, i) {
                    if (t.source.id == d.id || t.target.id == d.id)
                        d3.select("#link" + i)
                        .attr('class', 'link')
                })
            }
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    graphContainer
        .nodes(nodes)
        .on("tick", ticked);

    graphContainer.force("link")
        .links(links);

    function ticked() {
        link.attr("d", positionLink);
        node.attr("transform", positionNode);
    }
    for (var i = 0; i < 85; i++) {
        d3.select('#node' + i)
            .append('circle').attr('r', '6px').attr('id', function(d) {
                return "circle" + i;
            }).attr("fill", function(d) {
                return color(graph.nodes[i].group);
            })
            .classed('borderedNode', true)

        var ctn = d3.select('#node' + i)
            .append('g').attr('id', 'name' + i)
            .attr('transform', 'translate(' + -48 + ',' + 16 + ')')
            .attr('pointer-events', 'none')
            .attr('opacity', 0)
        ctn.append('rect')
            .attr('width', (graph.nodes[i].name.length * 7.5 + 36) + 'px')
            .attr('height', '24px').attr('fill', 'white')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', '2px')
            .attr('rx', '3px')
            .attr('ry', '3px')
        ctn.append('text').text(graph.nodes[i].name).attr('fill', 'black').attr('transform', 'translate(' + 12 + ',' + 17.8 + ')')

    }
});
var lockedLink;

function positionLink(d) {
    if (!forceGraph_Configs.renderStraightLine)
        return "M" + d[0].x + "," + d[0].y +
            "S" + d[1].x + "," + d[1].y +
            " " + d[2].x + "," + d[2].y;
    return "M" + d[0].x + "," + d[0].y +
        "L" + d[2].x + "," + d[2].y;
}

function positionNode(d) {
    return "translate(" + d.x + "," + d.y + ")";
}

function dragstarted(d) {
    lockedLink = true;
    if (!d3.event.active)
        graphContainer.stepRatio(0.3).restart();
    d.fx = d.x, d.fy = d.y;
    forceGraph_Configs.startRatio = 0.3;
}

function dragged(d) {
    d.fx = d3.event.x, d.fy = d3.event.y;
}

function dragended(d) {
    lockedLink = false;
    for (var i = 0; i < edgeNum; i++)
        d3.select("#link" + i)
        .attr('class', 'link')
    d3.select("#name" + d.id).attr('class', 'op0')
    if (!d3.event.active) graphContainer.stepRatio(0);
    d.fx = null, d.fy = null;
}

var artistInfo;
d3.json('data/artists.json', function(error, data) {
    if (error) throw error;
    artistInfo = data;
})