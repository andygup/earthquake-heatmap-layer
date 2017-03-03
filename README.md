earthquake-heatmap-layer
========================

This repo contains a custom layer prototype for displaying real-time USGS earthquake GeoJSON as heatmaps.
It's intended to demonstrate one approach for improving parsing performance on large GeoJSON.

It's built using the ArcGIS API for JavaScript and contains a custom feature layer.

## Samples

Open up your developer console and then run each of these samples:

[No web workers - all on main thread](http://andygup.github.io/earthquake-heatmap-layer/no_worker.html)

[One web worker](http://andygup.github.io/earthquake-heatmap-layer/one_worker.html)

[Two web workers](http://andygup.github.io/earthquake-heatmap-layer/two_worker.html)

## Example Usage

For a fully working sample see the index.html file in this repo. The basic pattern looks like this:

   ```js
   
              // Reference: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
              var earthquakeLayer = new EarthquakeLayer({
                  url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
              });
   
              earthquakeLayer.init().then(function(layer){
                  map.addLayer(layer);
              });
   
   ```
   
And, you implement in your code like this:   

   ```js
       
       // EarthquakeLayerSW uses a single web worker
       require(["esri/map", "libs/EarthquakeLayerSW","esri/config","dojo/domReady!"], function(Map,EarthquakeLayer,esriConfig) {
           map = new Map("map", {
               basemap: "topo",
               center: [-122.45, 37.75], // longitude, latitude
               zoom: 3
           });

           esriConfig.defaults.io.corsEnabledServers.push("earthquake.usgs.gov");

           // Reference: http://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
           var earthquakeLayer = new EarthquakeLayer({
               url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
           });

           earthquakeLayer.init().then(function(layer){
               map.addLayer(layer);
           });
       });
   
   ```
   
## Use Cases and theory
 
This project's approach to threading is based on a single task that reoccurs at regularly spaced intervals, such as 5 minutes.
For the purposes of this repo the word 'thread' and 'worker' are used interchangeably.

The internal approach to multi-threading following this pattern:
- Break up large GeoJSON file into pieces based on number of threads. One chunk per thread.
- Push each chunk to a thread asynchronously
- Do processing on the thread and return individual results
- Concatenate all results and return single Esri JSON Object. 
