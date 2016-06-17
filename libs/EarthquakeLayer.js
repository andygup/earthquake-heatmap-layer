/**
 * Single threaded Earthquake Layer
 */
define([
    "dojo/_base/declare",
    "esri/request",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/layers/FeatureLayer",
    "esri/renderers/HeatmapRenderer"
], function(declare,esriRequest,Deferred,all,Graphic,Point,FeatureLayer,HeatmapRenderer) {

    return declare(null, {
        url: null,
        _layerDefinition: null,

        constructor: function(options){
            this.url = options.url;
            this._layerDefinition = {
                "objectIdField": "id",
                "geometryType" : "esriGeometryPoint",
                "fields":[{
                    "name" : "id",
                    "alias" : "id",
                    "type" : "esriFieldTypeString"
                },{
                    "name" : "depth",
                    "alias" : "depth",
                    "type": "esriFieldTypeInteger"
                },{
                    "name" : "magnitude",
                    "alias" : "magnitude",
                    "type": "esriFieldTypeDouble"
                }]
            };
        },

        init: function(){

            var dfd = new Deferred();

            this._getGeoJSON()
                .then(this._parseFeatures)
                .then(this._createFeatureLayer.bind(this))
                .then(function(result){
                    dfd.resolve(result);
                });

            return dfd.promise;
        },

        _createFeatureLayer: function(graphicsArr){

            var dfd = new Deferred();

            var featureCollection = {
                "layerDefinition": this._layerDefinition,
                "featureSet": {
                    "features": graphicsArr,
                    "geometryType": "esriGeometryPoint"
                }
            };

            var featureLayer = new FeatureLayer(featureCollection);

            var heatMapRenderer = new HeatmapRenderer({
                field: "magnitude",
                maxPixelIntensity: 250,
                minPixelIntensity: 10,
                blurRadius: 10
            });

            featureLayer.setRenderer(heatMapRenderer);

            dfd.resolve(featureLayer);

            return dfd.promise;
        },

        /**
         * Convert GeoJson to esri Json. Then we
         * convert that into an array of Graphics
         * @param featureArray
         * @return {*}
         */
        _parseFeatures: function(featureArray){

            console.time("parseTestTimer");

            var dfd = new Deferred();

            var worker = new Worker("libs/EarthquakeWorker.js");

            worker.postMessage(
                {
                    cmd: "parse",
                    features: featureArray.features
                }
            );

            worker.onmessage = function(result){
                worker.terminate();

                var graphicsArr = [];

                for(var i = 0; i < result.data.length; i++){
                    graphicsArr.push(new Graphic(result.data[i]));
                }
                console.timeEnd("parseTestTimer");
                dfd.resolve(graphicsArr);
            };

            worker.onerror = function(err){
                console.log("Worker error: " + err.message);
            };

            ///////////////////////////////////////////////////////////////////////////////////////
            //
            // You can test the performance difference between using a web worker
            // and not using a web worker by uncommenting this section that runs on the main thread
            // and commenting out the worker code above.
            //
            // I'm seeing a ~10x performance boost on Chrome and Firefox by using workers.
            //
            ///////////////////////////////////////////////////////////////////////////////////////

            //var graphicsArray = [];
            //var promises = [];
            //
            //var features = featureArray.features;
            //
            //for(var i = 0; i < features.length; i++){
            //
            //    var deferred = new Deferred();
            //
            //    try {
            //        var point = new Point(
            //            features[i].geometry.coordinates[0],
            //            features[i].geometry.coordinates[1]);
            //        var graphic = new Graphic(point);
            //        graphic.attributes = {
            //            "id" : features[i].id,
            //            "depth" : features[i].geometry.coordinates[2],
            //            "magnitude" : features[i].properties.mag
            //        };
            //
            //
            //        //console.log("JSON baby: " + JSON.stringify(graphic.toJson()));
            //
            //        graphicsArray.push(graphic);
            //        deferred.resolve(true);
            //    }
            //    catch(error){
            //        console.log("Error creating graphic: " + error);
            //        deferred.resolve(false);
            //    }
            //
            //    promises.push(deferred);
            //}
            //
            //all(promises).then(function(r){
            //    console.timeEnd("parseTestTimer");
            //    dfd.resolve(graphicsArray);
            //});

            return dfd.promise;
        },

        _getGeoJSON: function(){
            var geoJSON = esriRequest({
                "url" : this.url
            });

            return geoJSON;
        }
    })
});