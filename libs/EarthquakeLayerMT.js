/**
 * Multi-threaded Earthquake Layer
 */
define([
    "dojo/_base/declare",
    "esri/request",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/layers/FeatureLayer",
    "esri/renderers/HeatmapRenderer",
    "libs/ThreadPool"
], function(declare, esriRequest, Deferred,all,Graphic,Point,FeatureLayer,HeatmapRenderer,ThreadPool) {

    return declare(null, {
        url: null,
        _layerDefinition: null,
        _threadPool: null,
        _numberOfThreads: 2, // recommended range: 1 <= n <= 6

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
            this._numberOfThreads = options.threads || this._numberOfThreads;
        },

        init: function(){

            var dfd = new Deferred();
            this._threadPool = new ThreadPool(this._numberOfThreads);

            this._getGeoJSON()
                .then(function(feature){
                    this._threadPool.init(feature.features)
                        .then(this._createFeatureLayer.bind(this))
                        .then(function(result){
                            dfd.resolve(result);
                        });
                }.bind(this));

            return dfd.promise;
        },

        destroyAll: function(){
            this._threadPool.destroy();
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
                    var graphic = new Graphic(result.data[i]);
                    graphicsArr.push(graphic);
                }
                console.timeEnd("parseTestTimer");
                dfd.resolve(graphicsArr);
            };

            worker.onerror = function(err){
                console.log("Worker error: " + err.message);
            };

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