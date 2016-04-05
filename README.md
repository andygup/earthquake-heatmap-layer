earthquake-heatmap-layer
========================

This repo contains a custom layer prototype for displaying real-time USGS earthquake GeoJSON as heatmaps.
It's intended to demonstrate one approach for improving parsing performance on large GeoJSON.

It's built using the ArcGIS API for JavaScript and contains a custom feature layer.

## Samples

`index.html` - single threaded example that's fairly straight forward in its implementation.

`index_mt.html` - multi-threaded, advanced sample that can split up a large GeoJSON file into separate threads.

## Example Usage

For a fully working sample see the index.html file in this repo. The basic pattern looks like this:

   ```js
   
              // Reference: http://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
              var earthquakeLayer = new EarthquakeLayer({
                  url: "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
              });
   
              earthquakeLayer.init().then(function(layer){
                  map.addLayer(layer);
              });
   
   ```
   
And, you implement in your code like this:   

   ```js
   
       require(["esri/map", "libs/EarthquakeLayer","esri/config","dojo/domReady!"], function(Map,EarthquakeLayer,esriConfig) {
           map = new Map("map", {
               basemap: "topo",
               center: [-122.45, 37.75], // longitude, latitude
               zoom: 3
           });

           esriConfig.defaults.io.corsEnabledServers.push("earthquake.usgs.gov");

           // Reference: http://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
           var earthquakeLayer = new EarthquakeLayer({
               url: "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
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
- When all threads have completed concatenate all results and return single Esri JSON Object. 
