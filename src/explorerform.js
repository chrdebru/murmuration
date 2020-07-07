import $ from 'jquery';
import 'select2';
require('select2/src/scss/core.scss');

import qg from './querygenerator.js';
import log from './errorreporting.js';

function getEndpoint() {
    return $('#explorer-form-sparqlendpoint').val();
}

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
                for (var i in response.results.bindings) {
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
            console.warn(`Problem with SPARQL endpoint: ${xhr.statusText} (${xhr.status})`);
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

function executeQueriesAndDisplayResults(terms, preds, depth, canvas) {
    var termnodes = terms.map(t => createnode(t, 'start'));
    canvas.add({ nodes: termnodes, links: [] });
    var endpoint = getEndpoint();
    var queries = qg(terms, depth, preds);
    for (let query of queries) {
        executeQuery(endpoint, query).then((d3graph) => {
            if (d3graph.nodes.length > 0 || d3graph.links.length > 0) {
                canvas.add(d3graph);
            }
        }).catch(e => {
            log(`Problem with SPARQL endpoint: ${e.statusText} (${e.status})`); 
        });
    };
};

function setupLookingForTerms(div) {
    // Setup looking for terms
    div.append('<div class="form-group"><label class="form-control-sm" for="depth">Elements to explore:</label><select class="explorer-form-terms form-control form-control-sm col-12" multiple="multiple" name="term"></select></div>');

    $('.explorer-form-terms').select2({
        tokenSeparators: [','],
        tags: "true",
        minimumInputLength: 4,
        ajax: {
            delay: 250,
            url: getEndpoint, // this one needs to be the function
            data: function (params) {
                var query = `
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    SELECT DISTINCT ?option ?label WHERE {
                        ?option ?predicate [].
                        OPTIONAL { ?option rdfs:label ?label }
                        FILTER(!ISBLANK(?option))
                        FILTER(REGEX(STR(?option), "${params.term}", "i") || REGEX(?label, "${params.term}", "i")) 
                    } `;
                return { query: query, format: 'json' };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                var results = [];

                for (var i in data.results.bindings) {
                    var binding = data.results.bindings[i];
                    results.push({ id: binding['option'].value, text: binding['label'] ? `${ binding['label'].value } (${ binding['option'].value })` : binding['option'].value });
                };

                return {
                    results: results,
                    pagination: {
                        more: false
                    }
                };
            },
        }
    });

    var option1 = new Option('https://kb.beyond2022.ie/person/Carlton_John_0000_a', 'https://kb.beyond2022.ie/person/Carlton_John_0000_a', true, true);
    var option2 = new Option('https://kb.beyond2022.ie/person/Balscot_Alexander_C15_a', 'https://kb.beyond2022.ie/person/Balscot_Alexander_C15_a', true, true);
    $('.explorer-form-terms').append(option1).trigger('change');
    $('.explorer-form-terms').append(option2).trigger('change');
};

function setupIgnoringPredicates(div) {
    // Setup looking for predicates
    div.append('<div class="form-group"><label class="form-control-sm" for="depth">Predicates to ignore:</label><select class="explorer-form-predicates form-control form-control-sm col-12" multiple="multiple" name="predicate"></select></div>');

    $('.explorer-form-predicates').select2({
        tokenSeparators: [','],
        tags: "true",
        minimumInputLength: 4,
        ajax: {
            delay: 250,
            url: getEndpoint, // the function, not the function call
            data: function (params) {
                var query = `
                    SELECT DISTINCT ?option WHERE {
                        [] ?option [].
                        FILTER(REGEX(STR(?option), "${params.term}", "i")) 
                    } `;
                return { query: query, format: 'json' };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                var results = [];
                for (var i in data.results.bindings) {
                    var binding = data.results.bindings[i];
                    results.push({ id: binding['option'].value, text: binding['option'].value });
                };

                return {
                    results: results,
                    pagination: {
                        more: false
                    }
                };
            },
        }
    });

    var option1 = new Option('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', true, true);
    var option2 = new Option('http://erlangen-crm.org/current/P2_has_type', 'http://erlangen-crm.org/current/P2_has_type', true, true);
    $('.explorer-form-predicates').append(option1).trigger('change');
    $('.explorer-form-predicates').append(option2).trigger('change');
};

export default class ExplorerForm {

    constructor(div, canvas = undefind, maxLevel = 6) {
        let t = this;
        t.div = div;
        t.maxLevel = maxLevel;

        t.button = $('<button id="explore-button" type="submit" class="btn btn-primary">Explore!</button>');

        t.button.click(function () {
            if (!canvas) {
                console.warn('No canvas defined. Not executing and displaying queries.');
                return;
            }
            var terms = t.div.find("select[name='term']").map(function () { return $(this).val(); }).toArray();
            var preds = t.div.find("select[name='predicate']").map(function () { return $(this).val(); }).toArray();
            var depth = parseInt(t.div.find("#depth").val());
            executeQueriesAndDisplayResults(terms, preds, depth, canvas);
        });

        t.clearbutton = $('<button id="explore-button" type="submit" class="btn btn-warning">Clear canvas</button>');
        t.clearbutton.click(function () {
            if (!canvas) {
                console.warn('No canvas defined. Not executing and displaying queries.');
                return;
            }
            canvas.clear();
        });
    };

    init() {
        let t = this;

        var d = $('<div class="form-group"></div>');
        d.append('<label class="form-control-sm" for="cepth">SPARQL endpoint:</label>');
        var endpoint = $('<input type="text" class="form-control form-control-sm" id="explorer-form-sparqlendpoint" value="http://localhost:8080/fuseki/b2022/query">');
        d.append(endpoint);
        t.div.append(d);

        // Addint the part to look for terms
        setupLookingForTerms(t.div);

        // Adding form elements for going levels deep
        d = $('<div class="form-group"></div>');
        d.append('<label class="form-control-sm" for="depth">Max concepts between:</label>');
        var select = $('<select class="form-control form-control-sm" id="depth">');
        for (var i = 0; i <= t.maxLevel; i++) {
            var option = $(`<option ${ i == t.maxLevel - 2 ? 'selected' : '' }> ${ i }</option> `);
            select.append(option);
        }
        d.append(select);
        t.div.append(d);

        // Addint the part to remove predicates
        setupIgnoringPredicates(t.div);

        // Adding the submit button
        d = $('<div class="form-group">');
        d.append(t.button);
        t.div.append(d);

        // Adding the clear button
        d = $('<div class="form-group">');
        d.append(t.clearbutton);
        t.div.append(d);
    }
}