function loadModel(obj, callback) {
    'use strict';

    var onProgress = function(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function(xhr) {
        console.log("Failed to load model");
    };

    var loader = new THREE.OBJLoader();
    loader.load(obj, callback, onProgress, onError);
}
