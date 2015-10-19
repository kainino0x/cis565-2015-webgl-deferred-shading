var cfg;

(function() {
    'use strict';

    var Cfg = function() {
        // TODO: Define config fields and defaults here
        this.enableDebug = false;
        this.debugView = 0;
        this.enableEffect0 = false;
    };

    var init = function() {
        cfg = new Cfg();

        var gui = new dat.GUI();
        // TODO: Define any other possible config values
        gui.add(cfg, 'enableDebug');
        gui.add(cfg, 'debugView', {
            '0 Depth':           0,
            '1 Position':        1,
            '2 Geometry normal': 2,
            '3 Color map':       3,
            '4 Normal map':      4,
            '5 Surface normal':  5
        });

        var eff0 = gui.addFolder('EFFECT NAME HERE');
        eff0.add(cfg, 'enableEffect0');
        // TODO: add more effects toggles and parameters here
    };

    window.handle_load.push(init);
})();
