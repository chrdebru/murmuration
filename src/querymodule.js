const $ = require('jquery');
var log = require('./errorreporting.js');

var prefixes = {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://www.opengis.net/ont/geosparql#": "geo",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
    "http://purl.org/dc/terms/": "dcterms",
    "http://erlangen-crm.org/current/": "cidoc",
    "https://ont.beyond2022.ie/ontology#": "ont",
    "https://kb.beyond2022.ie/": "kb"
};

export async function executeQuery(sparqlendpoint, query) {
    var g = { nodes: [], links: [] };
    let result = await $.ajax({
        url: sparqlendpoint,
        data: { query: query, format: 'json' },
        success: function (response) {
            if (response.results.bindings.length > 0) {
                var predicates = response.head.vars.filter(x => x.includes('predicate')).sort();
                for (i in response.results.bindings) {
                    var binding = response.results.bindings[i];

                    predicates.forEach((predicate) => {
                        var index = parseInt(predicate.match(/\d+/g));

                        var subject = binding["x" + (index - 1)];
                        var object = binding["x" + index];

                        // add the nodes (with dupes)
                        g.nodes.push(processResource(subject));
                        g.nodes.push(processResource(object));

                        if (predicate.includes('right'))
                            g.links.push({ source: subject.value, target: object.value, id: binding[predicate].value });
                        else
                            g.links.push({ source: object.value, target: subject.value, id: binding[predicate].value });
                    });
                }
            }
        },
        error: function (xhr) {
            log('error', '', `Problem with SPARQL endpoint: ${xhr.statusText} (${xhr.status})`);
        }
    });
    return g;
};

function processResource(resource) {
    return createnode(resource.value);
}

export function createnode(uri, type = 0) {
    var n = { id: uri, x: 0, y: 0, "type": type };
    var label = uri;
    var key = Object.keys(prefixes).find(x => uri.includes(x))
    if (key) {
        label = label.replace(key, "(" + prefixes[key] + ")");
    }
    n["label"] = label;
    return n;
}

export default { executeQuery, createnode }
