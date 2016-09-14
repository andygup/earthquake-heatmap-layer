/**
 * @author Andy Gup
 *
 * This class manages a ThreadPool for breaking up larger GeoJSON files
 * the processing each piece on its own thread and then reconstituting
 * the results.
 *
 * This class is specifically designed for the following use cases
 * - Processing GeoJSON files
 * - The files are updated on an interval - no less than 5 minutes apart
 * - The files are fairly similar in size - not too much variance
 */
define([
    "dojo/_base/declare",
    "esri/graphic",
    "dojo/_base/Deferred",
    "dojo/promise/all"
], function(declare, Graphic, Deferred, all) {

    return declare(null, {
        _numberOfThreads: 2,
        workerUrl: "libs/EarthquakeWorker.js",
        worker: [],

        constructor: function(threadCount){
            this._numberOfThreads = threadCount || this._numberOfThreads;
        },

        init: function(feature){

            var dfd = new Deferred();

            var chunkArray = this.chunk(feature.length);

            console.time("parseTestTimer");

            this.slice(chunkArray,feature)
                .then(function(result){
                    console.timeEnd("parseTestTimer");
                    dfd.resolve(this.concat(result));
                }.bind(this));

            return dfd.promise;
        },

        /**
         * Creates an array of break points for dividing up the JSON in semi-equal tasks across workers.
         * @return {Array}
         */
        chunk: function(featureLength){
            var chunk = Math.ceil( featureLength / this._numberOfThreads), breaks = [];

            // 1st attempt at creating breaking points
            for(var i = chunk; i <= featureLength; i += chunk){
                breaks.push(i);
            }

            // If we have a remainder value let's add it back to the breaks array
            if(breaks[breaks.length - 1] < featureLength){
                breaks.push(featureLength);
            }

            return breaks;
        },

        /**
         * Break up the array into smaller pieces that can each be assigned to a worker thread
         * @param chunkArray
         * @param feature
         */
        slice: function(chunkArray, feature){
            var subFeature;
            var promises = [];

            // Handle a single thread
            if(chunkArray.length == 1) {
                promises[0] = this.create(0, feature);
            }
            else if(chunkArray.length > 1) {

                var lastChunk = 0; // remember the value of the last chunk

                for(var i = 0; i < chunkArray.length; i++){
                    // Grab the features associated with this chunk
                    // subFeature = feature.slice(chunkArray[i - 1], chunkArray[i]);

                    // First entry into subFeature array
                    if(i === 0){
                        subFeature = feature.slice(0, chunkArray[0]);
                        lastChunk = chunkArray[0];
                    }
                    // Last entry into subFeature array
                    else if(chunkArray[i] === feature.length){
                        subFeature = feature.slice(chunkArray[i - 1] + 1, chunkArray[i]);
                    }
                    // All other entries into subFeature array
                    else {
                        subFeature = feature.slice(lastChunk + 1, chunkArray[i]);
                        lastChunk = chunkArray[i];
                    }

                    // Spawn worker threads for each chunk of subfeatures
                    promises[i] = this.create(i, subFeature);
                }
            }

            return all(promises);
        },

        /**
         * Concatenate all the separate arrays back together
         * @param value
         * @return {Array}
         */
        concat: function(value){

            var baseArray = [];

            for (var v = 0; v < value.length; v++) {
                if (value[v].result != null) {
                    baseArray.push.apply(baseArray, value[v].result);
                }
            }
            return baseArray;
        },

        /**
         * Create workers
         * @param count
         * @param feature
         * @return {deferred}
         */
        create: function(count, feature){
            var dfd = new Deferred();

            this.worker[count] = new Worker(this.workerUrl);

            // Send the GeoJSON feature to the background thread
            this.worker[count].postMessage(
                {
                    cmd: "parse",
                    features: feature
                }
            );

            // Get back the processed Esri JSON on the main thread
            this.worker[count].onmessage = function(result){

                var graphicsArr = [];

                for(var i = 0; i < result.data.length; i++){
                    graphicsArr.push(new Graphic(result.data[i]));
                }

                dfd.resolve({result:graphicsArr,error:null});
            };

            this.worker[count].onerror = function(err){
                console.log("Worker error: " + err.message);
                dfd.resolve({result:null,error:err.message});
            };

            return dfd;
        },

        destroy: function(){
            for(var i = 0; i < this.worker.length; i++){
                this.worker[i].terminate();
            }
        }
    })
});