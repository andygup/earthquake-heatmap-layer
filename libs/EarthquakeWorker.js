/**
 * Worker for parsing earthquake feed.
 * @param message
 */
onmessage = function(message) {

    switch(message.data.cmd) {
        case "parse":
            console.time("parseFeaturesInWorkerThread");
            var graphicsArr = parseFeaturesBackground(message.data.features);
            console.timeEnd("parseFeaturesInWorkerThread");
            postMessage(graphicsArr);
            break;
    }
};

/**
 * Parse the GeoJson and create an esri JSON representation of a Graphic
 * @param features
 * @return {Array}
 */
function parseFeaturesBackground(features){

    var graphicsArray = [];
    var graphicJson = {};

    for(var i = 0; i < features.length; i++){

        graphicJson = {
            "geometry":{
                "x":features[i].geometry.coordinates[0],
                "y":features[i].geometry.coordinates[1],
                "spatialReference":{"wkid":4326}
            },
            "attributes":{
                "id" : features[i].id,
                "depth" : features[i].geometry.coordinates[2],
                "magnitude" : features[i].properties.mag
            }
        };

        graphicsArray.push(graphicJson);

    }

    return graphicsArray;
}