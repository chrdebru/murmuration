const $ = require('jquery');
const bootstrap = require('bootstrap');
require('./scss/app.scss');


var canvasdiv = $('#explorer-canvas');
var displaydiv = $('#explorer-display');
var explorerformdiv = $('#explorer-form');

var iframe = $('<iframe>', {src: '' }).appendTo(displaydiv);

import Canvas from './canvas.js';
let canvas = new Canvas(canvasdiv, displaydiv);
canvas.init();

import ExplorerForm from './explorerform.js';
let explorerform = new ExplorerForm(explorerformdiv, canvas);
explorerform.init();