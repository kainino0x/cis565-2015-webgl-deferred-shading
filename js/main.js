var handle_load = [];
var handle_resize = [];

(function() {
    'use strict';

    window.onload = function() {
        for (var i = 0; i < handle_load.length; i++) {
            handle_load[i]();
        }
    };

    window.onresize = function() {
        for (var i = 0; i < handle_resize.length; i++) {
            handle_resize[i]();
        }
    };
})();
