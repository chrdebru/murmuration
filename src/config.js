export const prefixes = {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://www.opengis.net/ont/geosparql#": "geo",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
    "http://purl.org/dc/terms/": "dcterms",
    "http://erlangen-crm.org/current/": "cidoc",
    "https://ont.beyond2022.ie/ontology#": "ont",
    "https://kb.beyond2022.ie/": "kb"
};

export const startterms = [
    'https://kb.beyond2022.ie/person/Balscot_Alexander_C15_a',
    'https://kb.beyond2022.ie/person/Carlton_John_C14_a'
];

export const predicatesToIgnore = [
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'http://erlangen-crm.org/current/P2_has_type'
];

export const sparqlendpointurl = 'https://sparql.beyond2022.ie/b2022/sparql';