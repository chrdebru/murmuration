# Murmuration

## Building and using the code

To build the project, execute

```bash
$ npm run build
```

To build and run the project in a test environment (it defaults to port 5000), execute

```bash
$ npm run start:dev
```

## Integrating murmuration

This prototype should be fairly easy to integrate in your project. It relies on JQuery (not bundled) and you only need to provide a couple of named DIVs on a page:

```html
<div id="explorer-form"></div>
<div id="explorer-canvas"></div>
<div id="explorer-display"></div>
```

The bundle will look for these DIVs to set murmuration up. Make sure you import jquery before you import murmuration.

```html
<script src="https://code.jquery.com/jquery-3.1.0.js" crossorigin="anonymous"></script>
<script src="bundle.js" charset="utf-8"></script>
```

You can configure three things prior to compiling and importing the bundle:

* the namespace prefixes -- which are used as shorthands in the visualization;
* default for the resources of which you want to discover the paths;
* the defaults for the predicates you wish to ignore;
* and the default SPARQL endpoint.

You can change these in the file `config.js`.

```javascript
export const prefixes = {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://www.opengis.net/ont/geosparql#": "geo",
    // etc.
};

export const startterms = [
    'https://kb.beyond2022.ie/person/Balscot_Alexander_C15_a',
    'https://kb.beyond2022.ie/person/Carlton_John_0000_a',
    // etc.
];

export const predicatesToIgnore = [
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'http://erlangen-crm.org/current/P2_has_type',
    // etc.
];

export const sparqlendpointurl = 'http://localhost:8080/fuseki/b2022/query';
```

The ability to configure these from within a page is foreseen in the future.


## License
This implementation of R2RML is written by [Christophe Debruyne](http://www.christophedebruyne.be/) and released under the [MIT license](http://opensource.org/licenses/MIT).