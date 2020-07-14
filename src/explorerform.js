import $ from 'jquery';

require('webpack-jquery-ui');
require('webpack-jquery-ui/css');

import 'select2';
require('select2/src/scss/core.scss');

import 'datatables.net';
import 'datatables.net-dt/css/jquery.dataTables.css';

import qg from './querygenerator.js';
import log from './errorreporting.js';

import { startterms, prefixes, predicatesToIgnore } from './config.js';

function getEndpoint() {
    return $('#explorer-form-sparqlendpoint').val();
}

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
                updateTable(canvas);
            }
        }).catch(e => {
            log(`Problem with SPARQL endpoint: ${e.statusText} (${e.status})`);
        });
    };
};

var predicatedictionary = {};
var entitydictionary = {};
function updateTable(canvas) {
    // first update the predicates table
    let datatable = $('#explorer-form-table-predicates').DataTable()

    datatable.clear();
    let rows = canvas.getPredicatesAndColors();
    datatable.rows.add(rows.map(r => ['', r[0], r[1]]));
    datatable.draw();

    // make sure dictionary is empty.
    predicatedictionary = {};

    $('.explorer-form-predicate-visibility').off().change(function () {
        if (this.checked) {
            canvas.add({ nodes: [], links: predicatedictionary[this.value] });
        } else {
            let removedlinks = canvas.removePredicate(this.value);
            predicatedictionary[this.value] = removedlinks;
        }
    });

    // now update the entities table
    datatable = $('#explorer-form-table-entities').DataTable()

    datatable.clear();
    rows = canvas.graphData.nodes;
    datatable.rows.add(rows.map(r => ['', r["id"]]));
    datatable.draw();

    // make sure dictionary is empty.
    entitydictionary = {};

    $('.explorer-form-entity-visibility').off().change(function () {
        if (this.checked) {
            canvas.add(entitydictionary[this.value]);
        } else {
            let removed = canvas.removeEntity(this.value);
            entitydictionary[this.value] = removed;
        }
    });

}

function setupLookingForTerms(div) {
    // Setup looking for terms
    div.append('<div class="form-group"><label class="form-control-sm" for="term">Elements to explore:</label><select class="explorer-form-terms form-control form-control-sm col-12" multiple="multiple" id="term" name="term"></select></div>');

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
                    results.push({ id: binding['option'].value, text: binding['label'] ? `${binding['label'].value} (${binding['option'].value})` : binding['option'].value });
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

    startterms.forEach( x => {
        let option = new Option(x, x, true, true);
        $('.explorer-form-terms').append(option).trigger('change');
    });
};

function setupIgnoringPredicates(div) {
    // Setup looking for predicates
    div.append('<div class="form-group"><label class="form-control-sm" for="predicate">Predicates to ignore:</label><select class="explorer-form-predicates form-control form-control-sm col-12" multiple="multiple" id="predicate" name="predicate"></select></div>');

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

    predicatesToIgnore.forEach(x => {
        var option = new Option(x, x, true, true);
        $('.explorer-form-predicates').append(option).trigger('change');
    });
};

function setUpToggleTabs(div) {
    let tabs = $('<div id="explorer-form-tabs"><ul><li><a href="#tabs-1">Predicates</a></li><li><a href="#tabs-2">Entities</a></li></ul>');
    div.append(tabs);

    // Adding the list of predicates in a table
    let d = $('<div id="tabs-1"><table id="explorer-form-table-predicates"><thead><tr><th>Visible</th><th>Property</th></tr></thead><tbody></tbody></table></div>');
    tabs.append(d);

    $('#explorer-form-table-predicates').DataTable({
        "paging": true,
        "ordering": false,
        "info": false,
        "fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $('td', nRow).css('background-color', aData[2]);
        },
        "columnDefs": [
            {
                "targets": 0,
                "render": function (data, type, row) {
                    return `<input class="explorer-form-predicate-visibility" type="checkbox" checked value="${row[1]}" />`;
                },
            },
            { "targets": 2, "visible": false, "searchable": false },
        ],
    });
    
    // Adding a list of entities in a table
    d = $('<div id="tabs-2"><table id="explorer-form-table-entities"><thead><tr><th>Visible</th><th>Entity</th></tr></thead><tbody></tbody></table></div>');
    tabs.append(d);

    $('#explorer-form-table-entities').DataTable({
        "paging": true,
        "ordering": false,
        "info": false,
        "columnDefs": [
            {
                "targets": 0,
                "render": function (data, type, row) {
                    return `<input class="explorer-form-entity-visibility" type="checkbox" checked value="${row[1]}" />`;
                },
            }
        ],
    });

    $("#explorer-form-tabs").tabs();
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

            var datatable = $('#explorer-form-table-predicates').DataTable();
            executeQueriesAndDisplayResults(terms, preds, depth, canvas);
        });

        t.clearbutton = $('<button id="explore-button" type="submit" class="btn btn-warning">Clear canvas</button>');
        t.clearbutton.click(function () {
            if (!canvas) {
                console.warn('No canvas defined. Not executing and displaying queries.');
                return;
            }
            canvas.clear();
            updateTable(canvas);
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
        d.append('<label class="form-control-sm" for="depth">Maximum number of relations in between:</label>');
        var select = $('<select class="form-control form-control-sm" id="depth">');
        for (var i = 0; i <= t.maxLevel; i++) {
            var option = $(`<option ${i == t.maxLevel - 2 ? 'selected' : ''}> ${i}</option> `);
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

        // Addint the part to hide/show predicates and entities
        setUpToggleTabs(t.div);
    }
}