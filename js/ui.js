var cfg;

(function() {
    'use strict';

    var Cfg = function() {
        // TODO: Define config fields and defaults here
        this.debug = 'none';
        this.enableBloom = false;
        this.enableToon = false;
        this.enableSSAO = false;
    };

    var init = function() {
        cfg = new Cfg();

        var gui = new dat.GUI();
        // TODO: Define any other possible config values
        gui.add(cfg, 'debug', {
            None: 0,
            Depth: 1,
            Position: 2,
            Normal: 3,
            'Color map': 4,
            'Normal map': 5
        });
        gui.add(cfg, 'enableBloom');
        gui.add(cfg, 'enableToon');
        gui.add(cfg, 'enableSSAO');
    };

    window.handle_load.push(init);
})();
