import $ from 'jquery';
import 'bootstrap-alerts';

function log(type = 'info', heading = '', message) {
    $('#explorer-alert-container').bootstrapAlert({
        type: type,
        dismissible: true,
        heading: heading,
        message: message,
        clear: true
    });
};
module.exports = log; 