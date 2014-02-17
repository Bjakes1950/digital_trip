var loader = new THREE.JSONLoader(); // init the loader util
// init loading
var loadModel = function(modelObj) {
    loader.load('js/' + modelObj.name + '.js', function (geometry, materials) {
    // create a new material
    modelObj.material = new THREE.MeshFaceMaterial( materials );
    // shining of bonuses
    modelObj.material.materials.forEach(function(el){
        el.emissive.r = el.color.r * 0.5;
        el.emissive.g = el.color.g * 0.5;
        el.emissive.b = el.color.b * 0.5;
    });

    modelObj.geometry = geometry;

    });
    return modelObj;
};

var listOfModels = [{
    name: "bonusH",
    scale: {x: 0.01, y: 0.01, z: 0.01},
    rotation: {x: Math.PI/1.3, y: -Math.PI/1.3, z: -Math.PI/1.3}
}, {
    name: "bonusI",
    scale: {x: 0.25, y: 0.25, z: 0.25},
    rotation: {x: Math.PI/1.3, y: -Math.PI/1.3, z: -Math.PI/1.3}
}, {
    name: "bonusE",
    scale: {x: 0.25, y: 0.25, z: 0.25},
    rotation: {x: 0, y: 0, z: 0}
}]

listOfModels.map(function(el) {
    loadModel(el);
});