var regexvars = /\?x(\d+)/g;
var regexpredicatevars = /\?predicate\d+\w+/g;

var generateQueries = function (terms, depth = 3, relationsToBeOmitted = []) {
    if(depth <= 0 || terms.length <= 1)
        return [];
    
    var allarrays = [];
    
    // Create unique pairs from the terms
    var pairs = [].concat(...terms.map((v, i) => terms.slice(i + 1).map( w => [v, w])));

    // generate list of queries for each pair
    pairs.forEach(function(pair) {
        let arr = [];
        let last = [ '' ];

        var begin = `<${pair[0]}>`;
        var end = `<${pair[1]}>`;
        
        for(i = 1; i < depth + 1; i++) {
            // prepare triple patterns
            var start = i - 1;
            var s = start == 0 ? `${begin}` : `?x${start}`;
            var p1 = `${s} ?predicate${i}right ?x${i} . `;
            var p2 = `?x${i} ?predicate${i}left ${s} . `;

            // append triple patterns
            var t1 = last.map(x => x + p1);
            var t2 = last.map(x => x + p2);
            last = t1.concat(t2);
            
            // add new arrays to list of arrays for this pair
            arr = arr.concat(last);
        }

        // new finalize the queries
        arr.forEach((s,i) => {
            var variables = new Set([...s.matchAll(regexvars)].map(m => parseInt(m[1])));
            var maxv = Math.max(...variables);
            variables.delete(maxv);
            
            s = s.trim().replace(`?x${maxv}`, end);

            // bind the pair to variables, this makes life for the diagram easier
            s += `BIND (${begin} AS ?x0) `;
            s += `BIND (${end} AS ?x${maxv}) `;
            
            // variables in triple patterns shouldn't correspond with elements in our pair
            variables.forEach(function(v) {
                s += `FILTER (?x${v} != ${begin}) `;
                s += `FILTER (?x${v} != ${end}) `;
            });

            // restrict certain predicates with filters, if any
            if(relationsToBeOmitted.length > 0) {
                var predicatesvars = s.match(regexpredicatevars);
                predicatesvars.forEach((predicatesvar) => {
                    relationsToBeOmitted.forEach((toomit) => {
                        s += `FILTER (${predicatesvar} != <${toomit}>) `;
                    });
                });
            }

            // all variables should be different, obviously
            var variablesarray = Array.from(variables);
            var varpairs = [].concat(...variablesarray.map((v, i) => variablesarray.slice(i + 1).map( w => [v, w])));
            varpairs.forEach((varpair) => {
                s += `FILTER (?x${varpair[0]} != ?x${varpair[1]}) `;
            });

            arr[i] = `SELECT DISTINCT * { ${s} }`;
        });

        allarrays = allarrays.concat(arr);
    });

    return allarrays;
};

module.exports = generateQueries;