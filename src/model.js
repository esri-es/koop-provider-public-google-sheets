/*
model.js

This file is required. It must export a class with at least one public function called `getData`

Documentation: https://koopjs.github.io/docs/usage/provider
*/

function Model (koop) {}

// Public function to return data from the
// Return: GeoJSON FeatureCollection
//
// Config parameters (config/default.json)
// req.
//
// URL path parameters:
// req.params.host (if index.js:hosts true)
// req.params.id  (if index.js:disableIdParam false)
// req.params.layer
// req.params.method
const request = require('request').defaults({gzip: true, json: true});
const latNames = ['gsx$lat', 'gsx$latitude', 'gsx$y', 'gsx$latitud'];
const lonNames = ['gsx$lon', 'gsx$long', 'gsx$longitude', 'gsx$x', 'gsx$longitud'];

Model.prototype.getData = function (req, callback) {

    let spreadsheetId = req.params.host;
    let tab = req.params.layer;
    let url = `https://spreadsheets.google.com/feeds/list/${spreadsheetId}/${tab}/public/values\?alt\=json`;
    //console.log("URL = ", url);
    request(`${url}`, (err, res, body) => {
        if (err) return callback(err)

        //const geojson = body
        let geojson = {
            type: 'FeatureCollection',
            features: []
        }



        if(body.feed && body.feed.entry){
            var features = body.feed.entry.map((elem, i) => {
                var feature = {
                  "type": "Feature",
                  "geometry": {
                    "type": "Point",
                    "coordinates": [0, 0]
                  },
                  "properties": {}
                };

                var properties = {};

                for(var p in elem) {
                    //console.log(`${p} = p.substring(0,3) = ${p.substring(0,3)}`)
                    if(p.substring(0,4) === "gsx$"){
                        //console.log("Found!")
                        newP = p.substring(4,p.length);
                        let propValue = elem[p].$t
                        if(!isNaN(elem[p].$t)){
                            // If it is a number
                            if(propValue.indexOf('.') != -1){
                                properties[newP] = parseFloat(propValue);
                            }else{
                                properties[newP] = parseInt(propValue);
                            }
                        }else{
                            properties[newP] = propValue
                        }

                        if(latNames.indexOf(p.toLowerCase()) != -1){
                            feature.geometry.coordinates[1] = properties[newP];
                        }else if(lonNames.indexOf(p.toLowerCase()) != -1){
                            feature.geometry.coordinates[0] = properties[newP];
                        }

                        properties['OBJECTID'] = i;
                    }
                }

                feature.properties = properties

                return feature;
            });

            geojson.features = features;
        }else{
            //console.log("Error, body = ", body);
        }

        geojson.features = geojson.features.filter(f => {
            //console.log("f.geometry.coordinates=",f.geometry.coordinates)
            const coords = f.geometry.coordinates;
            if(isNaN(coords[0]) && isNaN(coords[1])){
                return false;
            }
            return true;
        });

        geojson.metadata = {
          title: `Google spreedsheets tab`,
          name: `Google spreedsheets tab`,
          idField: 'OBJECTID',
          description: `Generated from ${url}`,
        }

        callback(null, geojson)
    });



}

module.exports = Model
